import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import type { Request } from "express";

process.env.UPLOAD_DIR ||= path.join(os.tmpdir(), "flexilearn-test-uploads");

import config from "../config/env";
import prisma from "../config/database";
import { buildCurrentEnrollmentWhere } from "../services/shared/enrollment-access";
import {
  assertQuizGateForLessonCompletion,
  calculateProgressFromLessons,
  summarizeCourseEnrollmentStats,
} from "../services/enrollment.service";
import {
  mapCourseDetailResponse,
  sanitizeStudentEnrollmentCourse,
} from "../services/course/course-service-helpers";
import { buildCourseListOrderBy } from "../services/course/course-helpers";
import courseService, { COURSE_FIELD_LIMITS } from "../services/course.service";
import notificationService from "../services/notification.service";
import { normalizeTeacherProfileUpdateData } from "../services/teacher.service";
import { parseNumber, parseOptionalString } from "../utils/http";
import {
  cleanupTrackedRequestUploads,
  isMimeCompatibleWithExtension,
} from "../middleware/upload";
import {
  buildTeacherCourseEarningsSummary,
  buildTeacherEarningsTimeline,
} from "../services/payment/payment-helpers";
import {
  buildRevenueAnalytics,
  buildSettlementRows,
} from "../services/admin/admin-metrics";
import walletService from "../services/wallet.service";

describe("enrollment access, quiz gate, and student course sanitization", () => {
  it("requires active user status and unexpired enrollment in buildCurrentEnrollmentWhere", () => {
    const refDate = new Date("2026-11-23T12:00:00.000Z");
    const where = buildCurrentEnrollmentWhere({ userId: "u-1" }, refDate);

    assert.deepEqual(where, {
      AND: [
        { userId: "u-1" },
        { isActive: true },
        { user: { isActive: true } },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: refDate } }] },
      ],
    });
  });

  it("blocks marking quiz lessons complete until a passed QuizAttempt exists", () => {
    const courseLessons = [
      { id: "lesson-video", quiz: null },
      {
        id: "lesson-quiz",
        quiz: {
          questions: [
            {
              question: "2 + 2?",
              options: ["3", "4"],
              correctOptionIndex: 1,
            },
          ],
        },
      },
    ];

    assert.equal(
      assertQuizGateForLessonCompletion({
        courseLessons,
        passedQuizLessonIds: new Set(),
        requestedCompletedLessonIds: ["lesson-video"],
      }),
      1,
    );

    assert.throws(
      () =>
        assertQuizGateForLessonCompletion({
          courseLessons,
          passedQuizLessonIds: new Set(),
          requestedCompletedLessonIds: ["lesson-video", "lesson-quiz"],
        }),
      /must pass the lesson quiz/i,
    );

    assert.throws(
      () =>
        assertQuizGateForLessonCompletion({
          courseLessons,
          passedQuizLessonIds: new Set(),
          requestedCompletedLessonCount: 2,
        }),
      /must pass all required lesson quizzes/i,
    );

    const completedCount = assertQuizGateForLessonCompletion({
      courseLessons,
      passedQuizLessonIds: new Set(["lesson-quiz"]),
      requestedCompletedLessonIds: ["lesson-video", "lesson-quiz"],
    });
    assert.equal(completedCount, 2);
    assert.equal(calculateProgressFromLessons(completedCount, 2), 100);
  });

  it("strips quiz answer keys and hides internal material fileUrl on student enrollment responses", () => {
    const sanitized = sanitizeStudentEnrollmentCourse({
      id: "course-1",
      lessons: [
        {
          id: "l-1",
          isFree: false,
          videoUrl: "/uploads/videos/l1.mp4",
          quiz: {
            questions: [
              {
                question: "Capital of Malaysia?",
                options: ["Kuala Lumpur", "Penang"],
                correctOptionIndex: 0,
                explanation: "KL is the federal capital",
              },
            ],
          },
        },
      ],
      materials: [
        {
          id: "mat-1",
          fileUrl: "/uploads/documents/secret-internal-name.pdf",
          isDownloadable: true,
        },
      ],
    });

    assert.deepEqual(sanitized?.lessons?.[0]?.quiz, {
      questions: [
        {
          question: "Capital of Malaysia?",
          options: ["Kuala Lumpur", "Penang"],
        },
      ],
    });
    assert.equal(
      (sanitized?.materials?.[0] as { fileUrl?: string } | undefined)?.fileUrl,
      undefined,
    );
    assert.equal(
      (sanitized?.materials?.[0] as { accessUrl?: string } | undefined)?.accessUrl,
      "/api/v1/courses/materials/mat-1/download",
    );
  });
});

describe("upload MIME-extension pairing and orphan batch cleanup", () => {
  it("enforces strict MIME-to-extension compatibility and deletes tracked files on aborted uploads", async () => {
    assert.equal(isMimeCompatibleWithExtension(".pdf", "application/pdf"), true);
    assert.equal(isMimeCompatibleWithExtension(".jpg", "image/jpeg"), true);
    assert.equal(isMimeCompatibleWithExtension(".jpg", "application/pdf"), false);
    assert.equal(isMimeCompatibleWithExtension(".mp4", "image/png"), false);
    assert.equal(isMimeCompatibleWithExtension(".exe", "application/octet-stream"), false);

    const tempFile = path.join(
      os.tmpdir(),
      `flexilearn-upload-test-${Date.now()}.tmp`,
    );
    fs.writeFileSync(tempFile, "partial-batch-upload");
    assert.equal(fs.existsSync(tempFile), true);

    const fakeReq = {
      __trackedUploadPaths: [tempFile],
    } as unknown as Request;
    await cleanupTrackedRequestUploads(fakeReq);
    assert.equal(fs.existsSync(tempFile), false);
  });
});

describe("post-refund net teacher earnings, admin settlements, and wallet refund unfreeze", () => {
  it("deducts partial refunds and excludes fully refunded orders across teacher earnings and admin analytics", () => {
    const paidAt = new Date("2026-11-20T10:00:00.000Z");
    const teacherUser = {
      id: "u-teacher",
      firstName: "Aisha",
      lastName: "Rahman",
      email: "aisha@example.com",
    };
    const teacherProfile = {
      id: "tp-aisha",
      userId: "u-teacher",
      commissionRate: 10,
      user: teacherUser,
    };
    const course = {
      id: "course-ts",
      title: "TypeScript Mastery",
      courseType: "RECORDED",
      teacherProfileId: "tp-aisha",
      teacherProfile,
    };

    const payments = [
      {
        id: "pay-partial",
        orderId: "ord-partial",
        packageId: null,
        amount: 100,
        platformCommission: 10,
        teacherEarning: 90,
        status: "COMPLETED",
        paidAt,
        package: null,
        user: { id: "u-s1", firstName: "Siti", lastName: "Noor", email: "siti@example.com" },
        order: {
          refunds: [{ amount: 40 }],
          items: [
            {
              id: "item-1",
              finalPrice: 100,
              package: {
                id: "pkg-1",
                name: "Standard",
                finalPrice: 100,
                course,
              },
            },
          ],
        },
      },
      {
        id: "pay-full-refund",
        orderId: "ord-full",
        packageId: null,
        amount: 200,
        platformCommission: 20,
        teacherEarning: 180,
        status: "REFUNDED",
        paidAt,
        package: null,
        user: { id: "u-s2", firstName: "Ken", lastName: "Lim", email: "ken@example.com" },
        order: {
          refunds: [{ amount: 200 }],
          items: [
            {
              id: "item-2",
              finalPrice: 200,
              package: {
                id: "pkg-1",
                name: "Standard",
                finalPrice: 200,
                course,
              },
            },
          ],
        },
      },
    ] as never[];

    const timeline = buildTeacherEarningsTimeline(payments, "tp-aisha", 10);
    assert.equal(timeline.length, 1);
    assert.equal(timeline[0]?.amount, 60);
    assert.equal(timeline[0]?.teacherEarning, 54);

    const courseSummary = buildTeacherCourseEarningsSummary(payments, "tp-aisha", 10);
    assert.equal(courseSummary.totalEarnings, 54);
    assert.equal(courseSummary.totalStudents, 1);

    const adminSettlements = buildSettlementRows({
      payments: payments as never,
      defaultCommissionRate: 10,
      page: 1,
      limit: 20,
    });
    assert.equal(adminSettlements.items.length, 1);
    assert.equal(adminSettlements.items[0]?.totalGross, 60);
    assert.equal(adminSettlements.items[0]?.platformCommission, 6);
    assert.equal(adminSettlements.items[0]?.teacherEarning, 54);

    const analytics = buildRevenueAnalytics({
      payments: payments as never,
      groupBy: "day",
      defaultCommissionRate: 10,
    });
    assert.deepEqual(analytics.revenueTrend, [
      {
        date: "2026-11-20",
        totalRevenue: 60,
        platformEarnings: 6,
        teacherEarnings: 54,
      },
    ]);
  });

  it("auto-cancels and unfreezes unpaid pending payouts to cover refund debits, and rejects when already paid out", async () => {
    let availableBalance = 10;
    let pendingPayout = 80;
    let payoutStatus = "PENDING";
    const walletTransactions: Array<Record<string, unknown>> = [];

    const mockTx = {
      user: {
        findUnique: async () => ({ id: "u-teacher" }),
      },
      wallet: {
        upsert: async () => ({
          id: "w-1",
          userId: "u-teacher",
          availableBalance,
          pendingPayout,
        }),
        updateMany: async ({
          where,
          data,
        }: {
          where: { availableBalance?: { gte: number }; pendingPayout?: { gte: number } };
          data: {
            availableBalance?: { increment?: number; decrement?: number };
            pendingPayout?: { increment?: number; decrement?: number };
          };
        }) => {
          if (where.pendingPayout && pendingPayout < where.pendingPayout.gte) {
            return { count: 0 };
          }
          if (where.availableBalance && availableBalance < where.availableBalance.gte) {
            return { count: 0 };
          }
          if (data.availableBalance?.increment) {
            availableBalance += data.availableBalance.increment;
          }
          if (data.availableBalance?.decrement) {
            availableBalance -= data.availableBalance.decrement;
          }
          if (data.pendingPayout?.decrement) {
            pendingPayout -= data.pendingPayout.decrement;
          }
          return { count: 1 };
        },
      },
      payoutRequest: {
        findMany: async () =>
          payoutStatus === "PENDING"
            ? [{ id: "po-1", walletId: "w-1", amount: 80, status: "PENDING" }]
            : [],
        updateMany: async () => {
          if (payoutStatus !== "PENDING") return { count: 0 };
          payoutStatus = "CANCELLED";
          return { count: 1 };
        },
      },
      walletTransaction: {
        findFirst: async ({ where }: { where: { referenceId?: string } }) =>
          walletTransactions.find((t) => t.referenceId === where.referenceId) ?? null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          walletTransactions.push(data);
          return data;
        },
      },
    };

    await walletService.debitForRefundInTransaction(
      mockTx as never,
      "u-teacher",
      90,
      { refundId: "ref-1", orderItemId: "item-1" },
    );

    assert.equal(payoutStatus, "CANCELLED");
    assert.equal(pendingPayout, 0);
    assert.equal(availableBalance, 0);
    assert.equal(walletTransactions.length, 2);

    await walletService.debitForRefundInTransaction(
      mockTx as never,
      "u-teacher",
      90,
      { refundId: "ref-1", orderItemId: "item-1" },
    );
    assert.equal(walletTransactions.length, 2);

    await assert.rejects(
      () =>
        walletService.debitForRefundInTransaction(
          mockTx as never,
          "u-teacher",
          25,
          { refundId: "ref-2", orderItemId: "item-2" },
        ),
      /insufficient for refund debit/i,
    );
  });

  it("sanitizes single-user notifications and skips inactive recipients in createNotification", async () => {
    const prismaAny = prisma as unknown as Record<string, unknown>;
    const origUser = prismaAny.user;
    const origNotification = prismaAny.notification;
    const createdPayloads: Array<Record<string, unknown>> = [];

    prismaAny.user = {
      findFirst: async ({ where }: { where: { id: string; isActive?: boolean } }) =>
        where.id === "u-active" && where.isActive === true
          ? { id: "u-active" }
          : null,
    };
    prismaAny.notification = {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdPayloads.push(data);
        return { id: "notif-created", ...data };
      },
    };

    try {
      const created = await notificationService.createNotification(
        "u-active",
        "  <b>Refund Decision</b>  ",
        "  Your refund <script>alert(1)</script>was reviewed.  ",
        "  refund  ",
      );
      assert.ok(created);
      assert.equal(createdPayloads.length, 1);
      assert.equal(createdPayloads[0]?.title, "Refund Decision");
      assert.equal(createdPayloads[0]?.message, "Your refund was reviewed.");
      assert.equal(createdPayloads[0]?.type, "refund");

      const skipped = await notificationService.createNotification(
        "u-inactive",
        "Payout Settled",
        "Paid",
        "payout",
      );
      assert.equal(skipped, null);
      assert.equal(createdPayloads.length, 1);
    } finally {
      prismaAny.user = origUser;
      prismaAny.notification = origNotification;
    }
  });

  it("grants owning teacher and admin access to non-downloadable course materials while blocking students", async () => {
    const sampleCourse = {
      id: "course-1",
      lessons: [],
      materials: [
        {
          id: "mat-view-only",
          title: "Instructor Reference Sheet",
          fileUrl: "/uploads/documents/ref-sheet.pdf",
          isDownloadable: false,
        },
      ],
    } as never;

    const studentView = mapCourseDetailResponse(sampleCourse, {
      isEnrolled: true,
      canViewQuizAnswers: false,
      canManageMaterials: false,
    });
    assert.equal(studentView.materials[0]?.fileUrl, undefined);
    assert.equal(studentView.materials[0]?.accessUrl, undefined);

    const ownerView = mapCourseDetailResponse(sampleCourse, {
      isEnrolled: false,
      canViewQuizAnswers: true,
      canManageMaterials: true,
    });
    assert.equal(ownerView.materials[0]?.fileUrl, "/uploads/documents/ref-sheet.pdf");
    assert.equal(
      ownerView.materials[0]?.accessUrl,
      "/api/v1/courses/materials/mat-view-only/download",
    );

    const origUploadDir = config.UPLOAD_DIR;
    const tempUploadRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "flexilearn-material-uploads-"),
    );
    config.UPLOAD_DIR = tempUploadRoot;
    const docDir = path.join(tempUploadRoot, "documents");
    fs.mkdirSync(docDir, { recursive: true });
    const samplePdf = path.join(docDir, "ref-sheet.pdf");
    fs.writeFileSync(samplePdf, "%PDF-1.4 test");

    const prismaAny = prisma as unknown as Record<string, unknown>;
    const origMaterial = prismaAny.material;
    const origUser = prismaAny.user;

    prismaAny.material = {
      findUnique: async () => ({
        id: "mat-view-only",
        title: "Instructor Reference Sheet",
        fileUrl: "/uploads/documents/ref-sheet.pdf",
        isDownloadable: false,
        course: { id: "course-1", teacherProfileId: "tp-owner" },
      }),
    };
    prismaAny.user = {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id === "u-owner") {
          return { role: "TEACHER", teacherProfile: { id: "tp-owner" } };
        }
        if (where.id === "u-admin") {
          return { role: "ADMIN", teacherProfile: null };
        }
        return { role: "STUDENT", teacherProfile: null };
      },
    };

    try {
      await assert.rejects(
        () => courseService.getMaterialDownloadAsset("u-student", "mat-view-only"),
        /not available for download/i,
      );

      const ownerAsset = await courseService.getMaterialDownloadAsset(
        "u-owner",
        "mat-view-only",
      );
      assert.equal(ownerAsset.absolutePath, samplePdf);

      const adminAsset = await courseService.getMaterialDownloadAsset(
        "u-admin",
        "mat-view-only",
      );
      assert.equal(adminAsset.absolutePath, samplePdf);
    } finally {
      config.UPLOAD_DIR = origUploadDir;
      prismaAny.material = origMaterial;
      prismaAny.user = origUser;
      fs.rmSync(tempUploadRoot, { recursive: true, force: true });
    }
  });

  it("deduplicates multi-package student enrollments and resolves current curriculum progress in summarizeCourseEnrollmentStats", () => {
    const stats = summarizeCourseEnrollmentStats(
      [
        {
          userId: "student-1",
          progress: 25,
          completedLessons: 1,
          completedLessonIds: ["l-1"],
          enrolledAt: "2026-11-01T00:00:00.000Z",
        },
        {
          userId: "student-1",
          progress: 100,
          completedLessons: 3,
          completedLessonIds: ["l-1", "l-2", "deleted-lesson"],
          enrolledAt: "2026-11-10T00:00:00.000Z",
        },
        {
          userId: "student-2",
          progress: 50,
          completedLessons: 1,
          completedLessonIds: ["l-2"],
          enrolledAt: "2026-11-05T00:00:00.000Z",
        },
      ],
      ["l-1", "l-2"],
    );

    assert.deepEqual(stats, {
      totalStudents: 2,
      totalLessons: 2,
      averageProgress: 75,
      completionRate: 50,
      totalCompletedLessons: 3,
    });
  });

  it("distinguishes undefined, null, empty string, and zero across partial updates and course list sorting", () => {
    assert.deepEqual(
      normalizeTeacherProfileUpdateData({
        bio: "",
        headline: null,
        hourlyRate: 0,
      }),
      {
        bio: null,
        headline: null,
        hourlyRate: 0,
      },
    );
    assert.deepEqual(
      normalizeTeacherProfileUpdateData({ hourlyRate: null }),
      { hourlyRate: null },
    );
    assert.throws(
      () => normalizeTeacherProfileUpdateData({}),
      /at least one profile field/i,
    );

    assert.equal(
      parseOptionalString(undefined, "title", { rejectNull: true, rejectBlank: true }),
      undefined,
    );
    assert.throws(
      () => parseOptionalString(null, "title", { rejectNull: true }),
      /title cannot be null/i,
    );
    assert.throws(
      () => parseNumber(null, "price", { rejectNull: true }),
      /price cannot be null/i,
    );

    assert.deepEqual(buildCourseListOrderBy("RATING", "asc"), [
      { teacherProfile: { averageRating: "asc" } },
      { createdAt: "desc" },
      { id: "desc" },
    ]);
    assert.deepEqual(buildCourseListOrderBy("POPULARITY", "asc"), [
      { teacherProfile: { totalStudents: "asc" } },
      { createdAt: "desc" },
      { id: "desc" },
    ]);
    assert.equal(COURSE_FIELD_LIMITS.MAX_PACKAGE_DURATION_DAYS, 3650);
  });
});

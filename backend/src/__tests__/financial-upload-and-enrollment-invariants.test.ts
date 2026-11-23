import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { Request } from "express";
import { PaymentStatus } from "@prisma/client";
import config from "../config/env";
import {
  cleanupRequestUploads,
  getUploadCategoryConfig,
  isMatchingExtensionAndMimeType,
  validateUploadExtensionAndMime,
} from "../middleware/upload";
import {
  calculateFinalPrice,
  gradeLessonQuiz,
  normalizeLessonQuiz,
  sanitizeLessonQuiz,
} from "../services/course/course-helpers";
import {
  buildTeacherCourseEarningsSummary,
  buildTeacherEarningsTimeline,
  type TeacherEarningsPaymentRecord,
} from "../services/payment/payment-helpers";
import {
  assertPackageHasCapacity,
  parseCompletedLessonIdsJson,
} from "../services/shared/enrollment-access";
import { computeTeacherSettlementsSummary } from "../services/shared/settlement-calculator";
import { isSafeExternalHttpUrl } from "../utils/url-or-path";

describe("financial refund & settlement non-negativity invariants", () => {
  it("prevents negative net settlement when an order is 100% refunded (PaymentStatus.REFUNDED)", () => {
    const teachers = [
      {
        id: "tp-1",
        userId: "u-1",
        commissionRate: 10,
        totalStudents: 1,
        courseCount: 1,
        user: {
          firstName: "Grace",
          lastName: "Hopper",
          email: "grace@example.com",
        },
      },
    ];

    // Paid order that later transitioned to PaymentStatus.REFUNDED after full $100 refund
    const payments = [
      {
        amount: 100,
        teacherEarning: 90,
        status: "REFUNDED",
        orderId: "ord-1",
        package: null,
        order: {
          items: [
            {
              finalPrice: 100,
              package: { course: { teacherProfileId: "tp-1" } },
            },
          ],
        },
      },
    ];

    const refunds = [
      {
        amount: 100,
        order: {
          items: [
            {
              finalPrice: 100,
              package: { course: { teacherProfileId: "tp-1" } },
            },
          ],
        },
      },
    ];

    const result = computeTeacherSettlementsSummary({
      teachers,
      payments,
      refunds,
      pendingPayouts: [],
      defaultCommissionRate: 10,
      page: 1,
      limit: 20,
    });

    assert.equal(result.settlements[0]?.totalEarnings, 90);
    assert.equal(result.settlements[0]?.totalRefundDeductions, 90);
    assert.equal(result.settlements[0]?.netSettlement, 0);
    assert.equal(result.totals.totalNetSettlement, 0);
  });

  it("handles legacy direct-package REFUNDED payments without orderId cleanly to $0 net", () => {
    const result = computeTeacherSettlementsSummary({
      teachers: [
        {
          id: "tp-legacy",
          userId: "u-legacy",
          commissionRate: 20,
          totalStudents: 0,
          courseCount: 1,
          user: {
            firstName: "Alan",
            lastName: "Turing",
            email: "alan@example.com",
          },
        },
      ],
      payments: [
        {
          amount: 100,
          teacherEarning: 80,
          status: "REFUNDED",
          orderId: null,
          package: { course: { teacherProfileId: "tp-legacy" } },
          order: null,
        },
      ],
      refunds: [],
      pendingPayouts: [],
      defaultCommissionRate: 20,
      page: 1,
      limit: 20,
    });

    assert.equal(result.settlements[0]?.totalEarnings, 80);
    assert.equal(result.settlements[0]?.totalRefundDeductions, 80);
    assert.equal(result.settlements[0]?.netSettlement, 0);
  });

  it("retains proportional net earnings on partially refunded orders and excludes fully refunded payments", () => {
    const teacherProfile = {
      id: "tp-net",
      userId: "u-net",
      commissionRate: 10,
    };

    const makeOrderPayment = (
      id: string,
      status: PaymentStatus,
      refundedAmount: number,
    ) =>
      ({
        id,
        amount: 200,
        platformCommission: 20,
        teacherEarning: 180,
        paidAt: new Date("2026-06-01T00:00:00.000Z"),
        status,
        packageId: null,
        package: null,
        user: {
          id: "stu-1",
          firstName: "Mia",
          lastName: "Chen",
          email: "mia@example.com",
        },
        order: {
          refunds: refundedAmount > 0 ? [{ amount: refundedAmount }] : [],
          items: [
            {
              id: `item-${id}`,
              finalPrice: 200,
              package: {
                id: "pkg-1",
                name: "Pro Bundle",
                finalPrice: 200,
                course: {
                  id: "course-1",
                  title: "Distributed Databases",
                  teacherProfileId: "tp-net",
                  teacherProfile,
                },
              },
            },
          ],
        },
      }) as unknown as TeacherEarningsPaymentRecord;

    const payments = [
      makeOrderPayment("pay-partial", PaymentStatus.COMPLETED, 50), // 75% retained -> $150 gross, $135 teacher net
      makeOrderPayment("pay-full-refund", PaymentStatus.REFUNDED, 200), // 0% retained -> excluded
    ];

    const summary = buildTeacherCourseEarningsSummary(payments, "tp-net", 10);
    const timeline = buildTeacherEarningsTimeline(payments, "tp-net", 10);

    assert.equal(summary.totalEarnings, 135);
    assert.equal(summary.totalStudents, 1);
    assert.equal(timeline.length, 1);
    assert.equal(timeline[0]?.amount, 150);
    assert.equal(timeline[0]?.teacherEarning, 135);
  });
});

describe("enrollment capacity, out-of-order lesson IDs, free pricing, quiz & live URL security", () => {
  it("enforces package maxStudents capacity and allows packages below capacity or unlimited", async () => {
    const mockClientAtCap = {
      enrollment: {
        count: async () => 25,
      },
    } as unknown as Parameters<typeof assertPackageHasCapacity>[0];

    await assert.rejects(
      () =>
        assertPackageHasCapacity(mockClientAtCap, {
          id: "pkg-cap",
          maxStudents: 25,
        }),
      /maximum student capacity/,
    );

    const mockClientUnderCap = {
      enrollment: {
        count: async () => 24,
      },
    } as unknown as Parameters<typeof assertPackageHasCapacity>[0];

    await assert.doesNotReject(() =>
      assertPackageHasCapacity(mockClientUnderCap, {
        id: "pkg-cap",
        maxStudents: 25,
      }),
    );

    await assert.doesNotReject(() =>
      assertPackageHasCapacity(mockClientAtCap, {
        id: "pkg-unlimited",
        maxStudents: null,
      }),
    );
  });

  it("normalizes out-of-order completedLessonIds JSON arrays without truncation or duplicates", () => {
    assert.deepEqual(
      parseCompletedLessonIdsJson([
        " lesson-3 ",
        "lesson-1",
        "lesson-3",
        "",
        "   ",
        42,
        null,
      ]),
      ["lesson-3", "lesson-1"],
    );
    assert.deepEqual(parseCompletedLessonIdsJson(null), []);
    assert.deepEqual(parseCompletedLessonIdsJson("lesson-1"), []);
  });

  it("supports $0 free package finalPrice calculation, strips quiz answers, and validates external meeting URLs", () => {
    assert.equal(calculateFinalPrice(0, 0), 0);
    assert.equal(calculateFinalPrice(50, 50), 0);

    assert.equal(isSafeExternalHttpUrl("https://meet.example.com/live-1"), true);
    assert.equal(isSafeExternalHttpUrl("javascript:alert(1)"), false);
    assert.equal(isSafeExternalHttpUrl("https://user:secret@example.com/room"), false);
    assert.equal(
      isSafeExternalHttpUrl("https://api.example.com/uploads/documents/a.pdf"),
      false,
    );

    const rawQuiz = normalizeLessonQuiz({
      questions: [
        {
          question: "What is 2 + 2?",
          options: ["3", "4", "5"],
          correctOptionIndex: 1,
          explanation: "Basic addition",
        },
      ],
    });

    assert.ok(rawQuiz);
    const sanitized = sanitizeLessonQuiz(rawQuiz);
    assert.deepEqual(sanitized, {
      questions: [
        {
          question: "What is 2 + 2?",
          options: ["3", "4", "5"],
        },
      ],
    });
    assert.equal(
      "correctOptionIndex" in (sanitized?.questions[0] ?? {}),
      false,
    );
    assert.equal("explanation" in (sanitized?.questions[0] ?? {}), false);

    const failGrade = gradeLessonQuiz(rawQuiz, [0]);
    assert.equal(failGrade.passed, false);
    const passGrade = gradeLessonQuiz(rawQuiz, [1]);
    assert.equal(passGrade.passed, true);
    assert.equal(passGrade.scorePercentage, 100);
  });
});

describe("upload extension-MIME pairing and multi-file failure cleanup", () => {
  it("strictly pairs file extension with declared MIME type in upload validation", () => {
    assert.equal(isMatchingExtensionAndMimeType(".jpg", "image/jpeg"), true);
    assert.equal(isMatchingExtensionAndMimeType(".jpg", "application/pdf"), false);
    assert.equal(isMatchingExtensionAndMimeType(".pdf", "image/png"), false);
    assert.equal(isMatchingExtensionAndMimeType(".mp4", "video/mp4"), true);

    const mockReq = {
      body: { folder: "general" },
      query: {},
    } as unknown as Request;
    const mockFile = {
      fieldname: "file",
      originalname: "avatar.jpg",
      mimetype: "application/pdf",
    } as Express.Multer.File;

    const categoryConfig = getUploadCategoryConfig(mockReq, mockFile);
    assert.throws(
      () =>
        validateUploadExtensionAndMime(
          "avatar.jpg",
          "application/pdf",
          categoryConfig,
        ),
      /Unsupported or mismatched file type/,
    );
    assert.doesNotThrow(() =>
      validateUploadExtensionAndMime("guide.pdf", "application/pdf", categoryConfig),
    );
  });

  it("cleans up tracked partial-batch files inside UPLOAD_DIR while ignoring external paths", async () => {
    const uploadRoot = path.resolve(config.UPLOAD_DIR);
    const hadUploadRootBefore = fs.existsSync(uploadRoot);
    const generalDir = path.join(uploadRoot, "general");
    const hadGeneralDirBefore = fs.existsSync(generalDir);
    fs.mkdirSync(generalDir, { recursive: true });

    const tempUploadedFile = path.join(
      generalDir,
      `test-orphan-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`,
    );
    fs.writeFileSync(tempUploadedFile, "partial-upload");

    const externalPath = path.resolve(repoFileMarker());

    try {
      const trackedReq = {
        _trackedUploadPaths: new Set([tempUploadedFile, externalPath]),
      } as unknown as Request;

      await cleanupRequestUploads(trackedReq);

      assert.equal(fs.existsSync(tempUploadedFile), false);
      assert.equal(fs.existsSync(externalPath), true);
    } finally {
      if (!hadGeneralDirBefore && fs.existsSync(generalDir)) {
        fs.rmSync(generalDir, { recursive: true, force: true });
      }
      if (!hadUploadRootBefore && fs.existsSync(uploadRoot)) {
        fs.rmSync(uploadRoot, { recursive: true, force: true });
      }
    }
  });
});

function repoFileMarker(): string {
  return __filename;
}

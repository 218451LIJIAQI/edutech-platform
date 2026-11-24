import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import type { Request } from "express";

process.env.UPLOAD_DIR ||= path.join(os.tmpdir(), "flexilearn-test-uploads");

const nodeRequire = createRequire(__filename);
const Module = nodeRequire("node:module") as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};

// Provide lightweight offline enum/module shims ONLY when node_modules is absent in sandbox CI.
// In environments where `npm ci` has run (e.g. Render), real packages load normally.
const originalModuleLoad = Module._load;
Module._load = function loadWithSandboxShims(
  request: string,
  parent: unknown,
  isMain: boolean,
) {
  try {
    return originalModuleLoad.call(this, request, parent, isMain);
  } catch (error) {
    const err = error as { code?: string };
    if (err?.code !== "MODULE_NOT_FOUND") {
      throw error;
    }

    if (request === "@prisma/client") {
      const makeEnum = <T extends string>(values: readonly T[]) =>
        Object.freeze(
          Object.fromEntries(values.map((v) => [v, v])) as { [K in T]: K },
        );
      class MockPrismaClient {
        $on() {}
        async $disconnect() {}
      }
      class Decimal {
        private val: number;
        constructor(v: number | string) {
          this.val = Number(v);
        }
        toNumber() {
          return this.val;
        }
        toString() {
          return String(this.val);
        }
      }
      return {
        PrismaClient: MockPrismaClient,
        Prisma: { Decimal },
        PaymentStatus: makeEnum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]),
        OrderStatus: makeEnum(["PENDING", "PAID", "CANCELLED", "REFUNDED", "FAILED"]),
        RefundStatus: makeEnum(["PENDING", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED"]),
        RefundMethod: makeEnum(["ORIGINAL_PAYMENT", "BANK_TRANSFER", "WALLET"]),
        PayoutRequestStatus: makeEnum([
          "PENDING",
          "APPROVED",
          "PROCESSING",
          "REJECTED",
          "PAID",
          "CANCELLED",
        ]),
        PayoutMethodType: makeEnum([
          "BANK_TRANSFER",
          "GRABPAY",
          "TOUCH_N_GO",
          "PAYPAL",
          "OTHER",
        ]),
        WalletTransactionType: makeEnum([
          "CREDIT",
          "DEBIT",
          "FREEZE",
          "UNFREEZE",
          "ADJUSTMENT",
        ]),
        WalletTransactionSource: makeEnum([
          "COURSE_SALE",
          "REFUND",
          "REVERSAL",
          "ADMIN_ADJUSTMENT",
          "PAYOUT",
        ]),
        UserRole: makeEnum(["STUDENT", "TEACHER", "ADMIN"]),
        CourseType: makeEnum(["LIVE", "RECORDED", "HYBRID"]),
        LessonType: makeEnum(["LIVE", "RECORDED", "HYBRID"]),
        LiveSessionStatus: makeEnum(["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"]),
      };
    }

    if (request === "multer") {
      const multerShim = Object.assign(
        () => ({
          single: () => (_req: unknown, _res: unknown, next: () => void) => next(),
          array: () => (_req: unknown, _res: unknown, next: () => void) => next(),
        }),
        { diskStorage: (opts: unknown) => opts },
      );
      return { __esModule: true, default: multerShim };
    }

    if (request === "winston") {
      const noopLogger = {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
        debug: () => undefined,
        add: () => undefined,
      };
      const winstonShim = {
        createLogger: () => noopLogger,
        format: Object.assign(
          (fn: unknown) => () => fn,
          {
            combine: () => ({}),
            timestamp: () => ({}),
            errors: () => ({}),
            splat: () => ({}),
            json: () => ({}),
            colorize: () => ({}),
            printf: () => ({}),
          },
        ),
        transports: {
          File: class {},
          Console: class {},
        },
      };
      return { __esModule: true, ...winstonShim, default: winstonShim };
    }

    throw error;
  }
};

const { buildCurrentEnrollmentWhere } = nodeRequire(
  "../services/shared/enrollment-access",
) as typeof import("../services/shared/enrollment-access");
const {
  assertQuizGateForLessonCompletion,
  calculateProgressFromLessons,
} = nodeRequire(
  "../services/enrollment.service",
) as typeof import("../services/enrollment.service");
const { sanitizeStudentEnrollmentCourse } = nodeRequire(
  "../services/course/course-service-helpers",
) as typeof import("../services/course/course-service-helpers");
const {
  cleanupTrackedRequestUploads,
  isMimeCompatibleWithExtension,
} = nodeRequire(
  "../middleware/upload",
) as typeof import("../middleware/upload");
const {
  buildTeacherCourseEarningsSummary,
  buildTeacherEarningsTimeline,
} = nodeRequire(
  "../services/payment/payment-helpers",
) as typeof import("../services/payment/payment-helpers");
const { buildRevenueAnalytics, buildSettlementRows } = nodeRequire(
  "../services/admin/admin-metrics",
) as typeof import("../services/admin/admin-metrics");
const walletModule = nodeRequire(
  "../services/wallet.service",
) as typeof import("../services/wallet.service");
const walletService = walletModule.default;

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

    // Video lesson alone succeeds
    assert.equal(
      assertQuizGateForLessonCompletion({
        courseLessons,
        passedQuizLessonIds: new Set(),
        requestedCompletedLessonIds: ["lesson-video"],
      }),
      1,
    );

    // Quiz lesson without passed attempt throws ValidationError
    assert.throws(
      () =>
        assertQuizGateForLessonCompletion({
          courseLessons,
          passedQuizLessonIds: new Set(),
          requestedCompletedLessonIds: ["lesson-video", "lesson-quiz"],
        }),
      /must pass the lesson quiz/i,
    );

    // Numeric count bypassing quiz gate also throws ValidationError
    assert.throws(
      () =>
        assertQuizGateForLessonCompletion({
          courseLessons,
          passedQuizLessonIds: new Set(),
          requestedCompletedLessonCount: 2,
        }),
      /must pass all required lesson quizzes/i,
    );

    // Once passed, completion succeeds and yields 100% progress
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
          title: "Slides",
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
    assert.equal(sanitized?.materials?.[0]?.fileUrl, undefined);
    assert.equal(
      sanitized?.materials?.[0]?.accessUrl,
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
      // Order 1: $100 with a $40 partial refund -> $60 net gross, $54 net teacher, $6 net platform
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
      // Order 2: $200 fully refunded -> $0 net everywhere
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

    // Teacher has $10 available + $80 frozen in PENDING payout = $90 total; $90 refund debit succeeds!
    await walletService.debitForRefundInTransaction(
      mockTx as never,
      "u-teacher",
      90,
      { refundId: "ref-1", orderItemId: "item-1" },
    );

    assert.equal(payoutStatus, "CANCELLED");
    assert.equal(pendingPayout, 0);
    assert.equal(availableBalance, 0);
    assert.equal(walletTransactions.length, 2); // UNFREEZE + DEBIT

    // Idempotent retry with same refundId + orderItemId does not double-debit
    await walletService.debitForRefundInTransaction(
      mockTx as never,
      "u-teacher",
      90,
      { refundId: "ref-1", orderItemId: "item-1" },
    );
    assert.equal(walletTransactions.length, 2);

    // Another refund when wallet has $0 and no releasable payouts throws ValidationError atomically
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
});

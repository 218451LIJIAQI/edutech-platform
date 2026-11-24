import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import type { Request } from "express";

const nodeRequire = createRequire(__filename);
const Module = nodeRequire("node:module") as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};

const originalModuleLoad = Module._load;
Module._load = function loadWithShims(
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
        Prisma: {
          Decimal,
          sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
            strings: Array.from(strings),
            values,
          }),
          join: (items: unknown[]) => items,
        },
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
        UserRole: makeEnum(["STUDENT", "TEACHER", "ADMIN"]),
        CourseType: makeEnum(["LIVE", "RECORDED", "HYBRID"]),
        LessonType: makeEnum(["LIVE", "RECORDED", "HYBRID"]),
        LiveSessionStatus: makeEnum(["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"]),
        AdDestinationType: makeEnum(["INTERNAL", "EXTERNAL"]),
        AdPlacement: makeEnum(["LOGIN_MODAL"]),
        AdStatus: makeEnum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]),
        AdTheme: makeEnum(["MIDNIGHT", "SUNSET", "AURORA", "OCEAN", "FOREST", "ROSE"]),
      };
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
        transports: { File: class {}, Console: class {} },
      };
      return { __esModule: true, ...winstonShim, default: winstonShim };
    }

    throw error;
  }
};

const {
  parseStoredCompletedLessonIds,
  resolveEnrollmentCompletedLessonIds,
} = nodeRequire(
  "../services/enrollment.service",
) as typeof import("../services/enrollment.service");
const { recalculateCourseEnrollmentsProgress } = nodeRequire(
  "../services/course/course-service-helpers",
) as typeof import("../services/course/course-service-helpers");
const { buildPublishedCourseWhere } = nodeRequire(
  "../services/course/course-helpers",
) as typeof import("../services/course/course-helpers");
const { lockLessonPackagesForUpdate } = nodeRequire(
  "../services/payment.service",
) as typeof import("../services/payment.service");
const ordersController = (
  nodeRequire(
    "../controllers/orders.controller",
  ) as typeof import("../controllers/orders.controller")
).default;

describe("out-of-order lesson completion persistence and curriculum recalculation", () => {
  it("preserves exact out-of-order completedLessonIds instead of slicing prefix lessons", () => {
    const orderedIds = ["lesson-1", "lesson-2", "lesson-3", "lesson-4"];

    const resolved = resolveEnrollmentCompletedLessonIds({
      storedCompletedLessonIds: ["lesson-4", "lesson-2", "lesson-4", "deleted-id"],
      completedLessonsCount: 2,
      orderedCourseLessonIds: orderedIds,
    });

    assert.deepEqual(resolved, ["lesson-2", "lesson-4"]);
    assert.deepEqual(parseStoredCompletedLessonIds([" a ", "", "a", "b"]), [
      "a",
      "b",
    ]);

    // Legacy fallback only when storedCompletedLessonIds is empty AND count > 0
    assert.deepEqual(
      resolveEnrollmentCompletedLessonIds({
        storedCompletedLessonIds: [],
        completedLessonsCount: 2,
        orderedCourseLessonIds: orderedIds,
      }),
      ["lesson-1", "lesson-2"],
    );
  });

  it("prunes deleted lesson IDs and recalculates progress when curriculum changes", async () => {
    const updates: Array<{ id: string; data: Record<string, unknown> }> = [];
    const mockTx = {
      lesson: {
        findMany: async () => [{ id: "l-1" }, { id: "l-3" }, { id: "l-4" }],
      },
      enrollment: {
        findMany: async () => [
          {
            id: "enr-1",
            completedLessons: 2,
            completedLessonIds: ["l-2", "l-4"],
            progress: 50,
          },
        ],
        update: async (args: { id: string; where: { id: string }; data: Record<string, unknown> }) => {
          updates.push({ id: args.where.id, data: args.data });
          return args;
        },
      },
    };

    await recalculateCourseEnrollmentsProgress(mockTx as never, "course-1", 3);

    assert.equal(updates.length, 1);
    assert.deepEqual(updates[0], {
      id: "enr-1",
      data: {
        completedLessons: 1,
        completedLessonIds: ["l-4"],
        progress: 33,
      },
    });
  });
});

describe("course price-range merge, package row locking, and student refund guardrails", () => {
  it("preserves both minPrice (gte) and maxPrice (lte) on buildPublishedCourseWhere and requires active approved teacher", () => {
    const where = buildPublishedCourseWhere({
      minPrice: 20,
      maxPrice: 120,
      category: "Programming",
    }) as { AND: Array<Record<string, unknown>> };

    assert.equal(Array.isArray(where.AND), true);
    const packageClause = where.AND.find((c) => "packages" in c) as {
      packages: { some: { isActive: boolean; finalPrice: { gte: number; lte: number } } };
    };
    assert.deepEqual(packageClause.packages.some.finalPrice, {
      gte: 20,
      lte: 120,
    });

    const teacherClause = where.AND.find((c) => "teacherProfile" in c) as {
      teacherProfile: { is: { registrationStatus: string; user: { is: { isActive: boolean } } } };
    };
    assert.equal(teacherClause.teacherProfile.is.registrationStatus, "APPROVED");
    assert.equal(teacherClause.teacherProfile.is.user.is.isActive, true);
  });

  it("locks lesson_packages rows in deterministic ascending ID order inside confirmPayment transactions", async () => {
    const queries: Array<{ strings: readonly string[]; params: unknown[] }> = [];
    const mockTx = {
      $queryRaw: async (strings: TemplateStringsArray, ...params: unknown[]) => {
        queries.push({ strings: Array.from(strings), params });
        return [];
      },
    };

    const locked = await lockLessonPackagesForUpdate(mockTx as never, [
      "pkg-z",
      "pkg-a",
      "pkg-m",
      "pkg-a",
    ]);

    assert.deepEqual(locked, ["pkg-a", "pkg-m", "pkg-z"]);
    assert.equal(queries.length, 1);
  });

  it("rejects dead-end WALLET student refund requests at controller validation layer", async () => {
    let forwardedError: unknown = null;
    const req = {
      user: {
        id: "student-1",
        email: "s@example.com",
        role: "STUDENT",
        firstName: "S",
        lastName: "One",
      },
      params: { id: "ord-1" },
      body: {
        amount: 25,
        refundMethod: "WALLET",
        reason: "Changed mind",
      },
    } as unknown as Request;

    const res = {
      status: () => res,
      json: () => res,
    };

    await new Promise<void>((resolve) => {
      ordersController.requestRefund(req, res as never, (err?: unknown) => {
        forwardedError = err;
        resolve();
      });
    });

    assert.ok(forwardedError instanceof Error);
    assert.match(forwardedError.message, /wallet refunds are not supported/i);
  });
});

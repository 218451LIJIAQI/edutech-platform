import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Request } from "express";
import prisma from "../config/database";
import {
  parseStoredCompletedLessonIds,
  resolveEnrollmentCompletedLessonIds,
} from "../services/enrollment.service";
import { recalculateCourseEnrollmentsProgress } from "../services/course/course-service-helpers";
import { buildPublishedCourseWhere } from "../services/course/course-helpers";
import paymentService, {
  lockLessonPackagesForUpdate,
} from "../services/payment.service";
import ordersController from "../controllers/orders.controller";
import communityService from "../services/community.service";
import adminService from "../services/admin.service";
import authService from "../services/auth.service";
import ordersService from "../services/orders.service";
import messageService from "../services/message.service";
import reviewService from "../services/review.service";
import {
  buildApprovedTeacherProfileUpdateData,
  createTeacherProfileSubmissionPayload,
} from "../services/teacher/teacher-profile-helpers";
import LiveSessionHandler, {
  broadcastLiveSessionStatusChange,
} from "../socket/live-session.handler";

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

describe("community feed envelope, live-session REST-to-Socket sync, and admin password protection", () => {
  it("returns a canonical pagination envelope when getFeed receives a malformed tag filter", async () => {
    const feed = await communityService.getFeed({
      tag: "###@@@",
      page: 3,
      limit: 15,
    });

    assert.deepEqual(feed, {
      items: [],
      pagination: {
        total: 0,
        page: 3,
        limit: 15,
        totalPages: 0,
      },
    });
  });

  it("broadcasts REST live session status transitions (ONGOING / COMPLETED) to Socket.IO room participants", () => {
    const emittedEvents: Array<{
      room: string;
      event: string;
      payload: Record<string, unknown>;
    }> = [];

    const mockIo = {
      use: () => undefined,
      on: () => undefined,
      to: (room: string) => ({
        emit: (event: string, payload: Record<string, unknown>) => {
          emittedEvents.push({ room, event, payload });
        },
      }),
    };

    new LiveSessionHandler(mockIo as never);

    const scheduledAt = new Date("2026-11-24T10:00:00.000Z");
    broadcastLiveSessionStatusChange(
      {
        id: "session-42",
        title: "System Design Q&A",
        description: "Live walkthrough",
        scheduledAt,
        status: "ONGOING",
        meetingUrl: "https://meet.example.com/room-42",
      },
      "teacher-user-1",
    );

    broadcastLiveSessionStatusChange(
      {
        id: "session-42",
        title: "System Design Q&A",
        description: "Live walkthrough",
        scheduledAt,
        status: "COMPLETED",
        meetingUrl: "https://meet.example.com/room-42",
      },
      "teacher-user-1",
    );

    assert.equal(emittedEvents.length, 2);
    assert.equal(emittedEvents[0].room, "session-42");
    assert.equal(emittedEvents[0].event, "session-started");
    assert.equal(typeof emittedEvents[0].payload.timestamp, "string");
    assert.equal(
      (emittedEvents[0].payload.session as { status?: string; meetingUrl?: string })
        .status,
      "ONGOING",
    );
    assert.equal(
      (emittedEvents[0].payload.session as { meetingUrl?: string }).meetingUrl,
      "https://meet.example.com/room-42",
    );

    assert.equal(emittedEvents[1].room, "session-42");
    assert.equal(emittedEvents[1].event, "session-ended");
    assert.equal(typeof emittedEvents[1].payload.timestamp, "string");
    assert.equal(
      (emittedEvents[1].payload.session as { status?: string }).status,
      "COMPLETED",
    );
    assert.equal(
      (emittedEvents[1].payload.session as { meetingUrl?: string | null })
        .meetingUrl,
      null,
    );
  });

  it("prevents resetUserPassword from overwriting another administrator's password", async () => {
    const prismaMutable = prisma as unknown as {
      user?: { findUnique?: (args: unknown) => Promise<unknown> };
    };
    const previousUserDelegate = prismaMutable.user;
    prismaMutable.user = {
      findUnique: async () => ({
        id: "admin-target",
        email: "root@flexilearn.com",
        role: "ADMIN",
        firstName: "Root",
        lastName: "Admin",
        isActive: true,
        isLocked: false,
      }),
    };

    try {
      await assert.rejects(
        () =>
          adminService.resetUserPassword(
            "admin-target",
            "StrongPass123",
            "admin-actor",
          ),
        /admin user/i,
      );
    } finally {
      prismaMutable.user = previousUserDelegate;
    }
  });
});

describe("Track 2 & Track 3 concurrency, account lifecycle, and partial-update invariants", () => {
  it("preserves active/role filters in adminService.getAllUsers overview via AND composition", async () => {
    const prismaMutable = prisma as unknown as {
      user?: {
        findMany?: (args: unknown) => Promise<unknown[]>;
        count?: (args: { where?: unknown }) => Promise<number>;
      };
    };
    const prevUser = prismaMutable.user;
    const countWheres: unknown[] = [];

    prismaMutable.user = {
      findMany: async () => [],
      count: async (args: { where?: unknown }) => {
        countWheres.push(args.where);
        return 0;
      },
    };

    try {
      await adminService.getAllUsers({
        role: "STUDENT" as never,
        isActive: false,
      });

      assert.equal(countWheres.length, 4);
      assert.deepEqual(countWheres[1], {
        AND: [{ role: "STUDENT", isActive: false }, { isActive: true }],
      });
      assert.deepEqual(countWheres[2], {
        AND: [{ role: "STUDENT", isActive: false }, { role: "TEACHER" }],
      });
      assert.deepEqual(countWheres[3], {
        AND: [{ role: "STUDENT", isActive: false }, { role: "STUDENT" }],
      });
    } finally {
      prismaMutable.user = prevUser;
    }
  });

  it("blocks single-user safe delete (force=false) and self-deactivation when a teacher has active students or pending payouts", async () => {
    const prismaMutable = prisma as unknown as Record<string, unknown>;
    const prevUser = prismaMutable.user;
    const prevEnrollment = prismaMutable.enrollment;
    const prevPayoutRequest = prismaMutable.payoutRequest;

    prismaMutable.user = {
      findUnique: async () => ({
        id: "teacher-u1",
        email: "t@flexilearn.com",
        role: "TEACHER",
        firstName: "Tina",
        lastName: "Lee",
        isActive: true,
        isLocked: false,
      }),
    };
    prismaMutable.enrollment = {
      count: async () => 2,
    };

    try {
      await assert.rejects(
        () => adminService.deleteUser("teacher-u1", { force: false, adminId: "admin-1" }),
        /active students/i,
      );
      await assert.rejects(
        () => authService.deleteAccount("teacher-u1"),
        /active students/i,
      );

      prismaMutable.enrollment = { count: async () => 0 };
      prismaMutable.payoutRequest = { count: async () => 1 };

      await assert.rejects(
        () => authService.deleteAccount("teacher-u1"),
        /payout requests are pending/i,
      );
    } finally {
      prismaMutable.user = prevUser;
      prismaMutable.enrollment = prevEnrollment;
      prismaMutable.payoutRequest = prevPayoutRequest;
    }
  });

  it("enforces atomic cart item claim and atomic PENDING order cancellation/payment transitions", async () => {
    const prismaMutable = prisma as unknown as Record<string, unknown>;
    const prevCartItem = prismaMutable.cartItem;
    const prevOrder = prismaMutable.order;
    const prevPayment = prismaMutable.payment;
    const prevEnrollment = prismaMutable.enrollment;
    const prevTransaction = prismaMutable.$transaction;

    // 1. Concurrent createOrderFromCart where another request already consumed the cart item
    prismaMutable.cartItem = {
      updateMany: async () => ({ count: 0 }),
      findMany: async () => [
        {
          id: "ci-1",
          userId: "stu-1",
          packageId: "pkg-1",
          package: {
            id: "pkg-1",
            name: "Standard",
            price: 50,
            discount: 0,
            finalPrice: 50,
            isActive: true,
            maxStudents: null,
            course: {
              id: "course-1",
              isPublished: true,
              teacherProfile: {
                registrationStatus: "APPROVED",
                user: { isActive: true },
              },
            },
          },
        },
      ],
    };
    prismaMutable.enrollment = {
      findMany: async () => [],
    };
    prismaMutable.$transaction = async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        cartItem: {
          deleteMany: async () => ({ count: 0 }),
        },
      });

    try {
      await assert.rejects(
        () => ordersService.createOrderFromCart("stu-1"),
        /cart changed while creating the order/i,
      );

      // 2. Concurrent cancelOrder after payment already transitioned order away from PENDING
      prismaMutable.order = {
        findUnique: async () => ({
          id: "ord-1",
          orderNo: "ORD-1",
          userId: "stu-1",
          status: "PENDING",
          totalAmount: 50,
          items: [],
          refunds: [],
          payment: null,
        }),
      };
      prismaMutable.$transaction = async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          order: {
            updateMany: async () => ({ count: 0 }),
          },
        });

      await assert.rejects(
        () => ordersService.cancelOrder("stu-1", "ord-1", "Changed mind"),
        /only pending orders can be cancelled/i,
      );

      // 3. Concurrent confirmPayment where order was cancelled right before order PENDING->PAID claim
      let revertedToFailed = false;
      prismaMutable.payment = {
        findUnique: async () => ({
          id: "pay-1",
          userId: "stu-1",
          orderId: "ord-1",
          packageId: null,
          amount: 50,
          platformCommission: 5,
          teacherEarning: 45,
          status: "PENDING",
        }),
      };
      prismaMutable.$transaction = async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          $queryRaw: async () => [],
          order: {
            findUnique: async () => ({
              id: "ord-1",
              userId: "stu-1",
              status: "PENDING",
              items: [
                {
                  id: "oi-1",
                  packageId: "pkg-1",
                  finalPrice: 50,
                  package: {
                    id: "pkg-1",
                    name: "Standard",
                    isActive: true,
                    duration: 30,
                    maxStudents: null,
                    course: {
                      id: "course-1",
                      isPublished: true,
                      teacherProfileId: "tp-1",
                      teacherProfile: {
                        id: "tp-1",
                        userId: "teacher-1",
                        registrationStatus: "APPROVED",
                        commissionRate: null,
                        user: { isActive: true },
                      },
                    },
                  },
                },
              ],
            }),
            updateMany: async () => ({ count: 0 }),
          },
          enrollment: {
            findFirst: async () => null,
            findMany: async () => [],
            count: async () => 0,
          },
          payment: {
            updateMany: async () => ({ count: 1 }),
            update: async (args: { data?: { status?: string } }) => {
              if (args.data?.status === "FAILED") {
                revertedToFailed = true;
              }
              return {};
            },
          },
        });

      await assert.rejects(
        () => paymentService.confirmPayment("pay-1", "stu-1"),
        /no longer payable/i,
      );
      assert.equal(revertedToFailed, true);
    } finally {
      prismaMutable.cartItem = prevCartItem;
      prismaMutable.order = prevOrder;
      prismaMutable.payment = prevPayment;
      prismaMutable.enrollment = prevEnrollment;
      prismaMutable.$transaction = prevTransaction;
    }
  });

  it("scopes message unread counts to active thread participants and resolves dynamic review completion", async () => {
    const prismaMutable = prisma as unknown as Record<string, unknown>;
    const prevMessage = prismaMutable.message;
    const prevEnrollment = prismaMutable.enrollment;
    const prevTransaction = prismaMutable.$transaction;

    let capturedUnreadWhere: Record<string, unknown> | undefined;
    prismaMutable.message = {
      count: async (args: { where: Record<string, unknown> }) => {
        capturedUnreadWhere = args.where;
        return 0;
      },
    };

    try {
      await messageService.getUnreadCount("stu-1");
      assert.deepEqual(capturedUnreadWhere?.sender, { isActive: true });
      assert.deepEqual(capturedUnreadWhere?.thread, {
        participants: {
          some: { id: "stu-1" },
          every: { isActive: true },
        },
      });

      // Dynamic review completion when stored progress was stale (<100) after curriculum pruning
      let syncedProgress = false;
      prismaMutable.enrollment = {
        findUnique: async () => ({
          id: "enr-review-1",
          userId: "stu-1",
          isActive: true,
          expiresAt: null,
          progress: 75,
          completedLessons: 2,
          completedLessonIds: ["les-1", "les-2"],
          package: {
            course: {
              id: "course-1",
              lessons: [{ id: "les-1" }, { id: "les-2" }],
              teacherProfile: {
                id: "tp-1",
                userId: "teacher-1",
              },
            },
          },
        }),
      };
      prismaMutable.$transaction = async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          review: {
            findFirst: async () => null,
            create: async (args: { data: Record<string, unknown> }) => ({
              id: "rev-1",
              ...args.data,
            }),
            aggregate: async () => ({
              _avg: { rating: 5 },
              _count: { rating: 1 },
            }),
          },
          enrollment: {
            update: async (args: { data: { progress?: number } }) => {
              if (args.data.progress === 100) {
                syncedProgress = true;
              }
              return {};
            },
          },
          teacherProfile: {
            update: async () => ({}),
          },
        });

      const createdReview = await reviewService.createReview(
        "stu-1",
        "enr-review-1",
        5,
        "Clear explanations throughout!",
      );
      assert.equal(createdReview.id, "rev-1");
      assert.equal(syncedProgress, true);
    } finally {
      prismaMutable.message = prevMessage;
      prismaMutable.enrollment = prevEnrollment;
      prismaMutable.$transaction = prevTransaction;
    }
  });

  it("preserves omitted fields while clearing explicit null fields in teacher extended profile submissions", () => {
    const payload = createTeacherProfileSubmissionPayload({
      selfIntroduction: "Updated intro",
      profilePhoto: null,
    });

    const approvedUpdate = buildApprovedTeacherProfileUpdateData(
      {
        id: "tp-1",
        userId: "teacher-1",
        bio: null,
        headline: null,
        hourlyRate: null,
        isVerified: true,
        verificationStatus: "APPROVED",
        registrationStatus: "APPROVED",
        totalStudents: 0,
        averageRating: 0,
        totalEarnings: 0 as never,
        commissionRate: null,
        selfIntroduction: "Old intro",
        educationBackground: "MSc Computer Science",
        teachingExperience: "8 years university lecturing",
        awards: JSON.stringify(["Best Lecturer 2024"]),
        specialties: JSON.stringify(["Algorithms"]),
        teachingStyle: "Problem-driven",
        languages: JSON.stringify(["English"]),
        yearsOfExperience: 8,
        profilePhoto: "/uploads/teacher-profiles/old.png",
        certificatePhotos: JSON.stringify(["/uploads/teacher-certificates/c1.pdf"]),
        profileCompletionStatus: "APPROVED",
        profileSubmittedAt: new Date(),
        profileReviewedAt: new Date(),
        profileReviewNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never,
      payload as never,
    );

    assert.equal(approvedUpdate.selfIntroduction, "Updated intro");
    assert.equal(approvedUpdate.profilePhoto, null);
    assert.equal(approvedUpdate.educationBackground, "MSc Computer Science");
    assert.equal(approvedUpdate.teachingStyle, "Problem-driven");
    assert.equal(approvedUpdate.yearsOfExperience, 8);
    assert.equal(approvedUpdate.awards, JSON.stringify(["Best Lecturer 2024"]));
  });
});

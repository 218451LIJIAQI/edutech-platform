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
import { lockLessonPackagesForUpdate } from "../services/payment.service";
import ordersController from "../controllers/orders.controller";
import communityService from "../services/community.service";
import adminService from "../services/admin.service";
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

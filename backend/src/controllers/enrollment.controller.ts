import { Request, Response } from "express";
import enrollmentService from "../services/enrollment.service";
import asyncHandler from "../utils/async-handler";
import { BadRequestError } from "../utils/errors";
import {
  parseNumber,
  parseRequiredParam,
  parseStringArray,
  requireAuthUserId,
  sendSuccess,
} from "../utils/http";

const parseCompletedLessonsPayload = (
  body: Record<string, unknown> | undefined,
): {
  completedLessons: number | string[];
  completedLessonIds?: string[];
} => {
  const rawCompletedLessons = body?.completedLessons;
  const rawCompletedLessonIds = body?.completedLessonIds;

  const parsedIds = Array.isArray(rawCompletedLessonIds)
    ? (parseStringArray(rawCompletedLessonIds, "completedLessonIds", {
        dedupe: true,
      }) ?? [])
    : undefined;

  if (Array.isArray(rawCompletedLessons)) {
    const idsFromCompletedLessons =
      parseStringArray(rawCompletedLessons, "completedLessons", {
        dedupe: true,
      }) ?? [];
    return {
      completedLessons: idsFromCompletedLessons,
      completedLessonIds: parsedIds ?? idsFromCompletedLessons,
    };
  }

  if (
    rawCompletedLessons === undefined ||
    rawCompletedLessons === null ||
    rawCompletedLessons === ""
  ) {
    if (parsedIds !== undefined) {
      return {
        completedLessons: parsedIds,
        completedLessonIds: parsedIds,
      };
    }
    throw new BadRequestError("completedLessons is required");
  }

  const numericCompleted = parseNumber(
    rawCompletedLessons,
    "completedLessons",
    {
      required: true,
      min: 0,
      integer: true,
    },
  ) as number;

  return {
    completedLessons: parsedIds ?? numericCompleted,
    completedLessonIds: parsedIds,
  };
};

class EnrollmentController {
  getMyEnrollments = asyncHandler(async (req: Request, res: Response) => {
    const enrollments = await enrollmentService.getUserEnrollments(
      requireAuthUserId(req),
    );
    sendSuccess(res, enrollments);
  });

  getEnrollmentById = asyncHandler(async (req: Request, res: Response) => {
    const enrollment = await enrollmentService.getEnrollmentById(
      parseRequiredParam(req.params.id, "Enrollment ID"),
      requireAuthUserId(req),
    );
    sendSuccess(res, enrollment);
  });

  updateProgress = asyncHandler(async (req: Request, res: Response) => {
    const parsed = parseCompletedLessonsPayload(
      req.body as Record<string, unknown> | undefined,
    );
    const enrollment = await enrollmentService.updateProgress(
      parseRequiredParam(req.params.id, "Enrollment ID"),
      requireAuthUserId(req),
      parsed.completedLessons,
      parseNumber(req.body?.progress, "progress", { min: 0, max: 100 }),
      parsed.completedLessonIds,
    );
    sendSuccess(res, enrollment, "Progress updated successfully");
  });

  checkAccess = asyncHandler(async (req: Request, res: Response) => {
    const hasAccess = await enrollmentService.checkAccess(
      requireAuthUserId(req),
      parseRequiredParam(req.params.courseId, "Course ID"),
    );
    sendSuccess(res, { hasAccess });
  });

  getCourseStudents = asyncHandler(async (req: Request, res: Response) => {
    const students = await enrollmentService.getCourseStudents(
      requireAuthUserId(req),
      parseRequiredParam(req.params.courseId, "Course ID"),
    );
    sendSuccess(res, students);
  });

  getCourseStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await enrollmentService.getCourseStats(
      requireAuthUserId(req),
      parseRequiredParam(req.params.courseId, "Course ID"),
    );
    sendSuccess(res, stats);
  });
}

export default new EnrollmentController();

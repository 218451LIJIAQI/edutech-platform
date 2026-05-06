import { Request, Response } from "express";
import enrollmentService from "../services/enrollment.service";
import asyncHandler from "../utils/async-handler";
import { AuthenticationError, BadRequestError } from "../utils/errors";

/**
 * Enrollment Controller
 * Handles HTTP requests for enrollment-related endpoints.
 */

const sendSuccess = (
  res: Response,
  data?: unknown,
  message?: string,
  statusCode = 200,
) => {
  res.status(statusCode).json({
    status: "success",
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
  });
};

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AuthenticationError("Authentication required");
  }

  return req.user.id;
};

const parseRequiredId = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} is required`);
  }

  const parsed = value.trim();

  if (parsed.length === 0) {
    throw new BadRequestError(`${fieldName} cannot be empty`);
  }

  return parsed;
};

const parseProgress = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new BadRequestError("progress must be a valid number");
  }

  if (parsed < 0 || parsed > 100) {
    throw new BadRequestError("progress must be between 0 and 100");
  }

  return parsed;
};

const parseCompletedLessonsInput = (value: unknown): number | string[] => {
  if (value === undefined || value === null || value === "") {
    throw new BadRequestError("completedLessons is required");
  }

  if (Array.isArray(value)) {
    const invalidLessonId = value.find(
      (lessonId) =>
        typeof lessonId !== "string" || lessonId.trim().length === 0,
    );

    if (invalidLessonId !== undefined) {
      throw new BadRequestError(
        "completedLessons must contain valid lesson ID strings only",
      );
    }

    return Array.from(new Set(value.map((lessonId) => lessonId.trim())));
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BadRequestError(
      "completedLessons must be a non-negative integer or an array of lesson IDs",
    );
  }

  return parsed;
};

class EnrollmentController {
  /**
   * Get current user's enrollments.
   * GET /api/enrollments/my-courses
   */
  getMyEnrollments = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const enrollments = await enrollmentService.getUserEnrollments(userId);

    sendSuccess(res, enrollments);
  });

  /**
   * Get enrollment by ID.
   * GET /api/enrollments/:id
   */
  getEnrollmentById = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const enrollmentId = parseRequiredId(req.params.id, "Enrollment ID");

    const enrollment = await enrollmentService.getEnrollmentById(
      enrollmentId,
      userId,
    );

    sendSuccess(res, enrollment);
  });

  /**
   * Update enrollment progress.
   * PUT /api/enrollments/:id/progress
   */
  updateProgress = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const enrollmentId = parseRequiredId(req.params.id, "Enrollment ID");

    const completedLessons = parseCompletedLessonsInput(
      req.body?.completedLessons,
    );
    const progress = parseProgress(req.body?.progress);

    const enrollment = await enrollmentService.updateProgress(
      enrollmentId,
      userId,
      completedLessons,
      progress,
    );

    sendSuccess(res, enrollment, "Progress updated successfully");
  });

  /**
   * Check course access.
   * GET /api/enrollments/check-access/:courseId
   */
  checkAccess = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const courseId = parseRequiredId(req.params.courseId, "Course ID");

    const hasAccess = await enrollmentService.checkAccess(userId, courseId);

    sendSuccess(res, { hasAccess });
  });

  /**
   * Get course students.
   * Teacher-only authorization should be enforced by middleware or service layer.
   * GET /api/enrollments/course/:courseId/students
   */
  getCourseStudents = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const courseId = parseRequiredId(req.params.courseId, "Course ID");

    const students = await enrollmentService.getCourseStudents(
      userId,
      courseId,
    );

    sendSuccess(res, students);
  });

  /**
   * Get course statistics.
   * Teacher-only authorization should be enforced by middleware or service layer.
   * GET /api/enrollments/course/:courseId/stats
   */
  getCourseStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const courseId = parseRequiredId(req.params.courseId, "Course ID");

    const stats = await enrollmentService.getCourseStats(userId, courseId);

    sendSuccess(res, stats);
  });
}

export default new EnrollmentController();

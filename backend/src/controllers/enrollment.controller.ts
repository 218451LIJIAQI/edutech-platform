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

const parseCompletedLessonsInput = (value: unknown): number | string[] => {
  if (value === undefined || value === null || value === "") {
    throw new BadRequestError("completedLessons is required");
  }

  if (Array.isArray(value)) {
    return (
      parseStringArray(value, "completedLessons", { dedupe: true }) ?? []
    );
  }

  return parseNumber(value, "completedLessons", {
    required: true,
    min: 0,
    integer: true,
  }) as number;
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
    const enrollment = await enrollmentService.updateProgress(
      parseRequiredParam(req.params.id, "Enrollment ID"),
      requireAuthUserId(req),
      parseCompletedLessonsInput(req.body?.completedLessons),
      parseNumber(req.body?.progress, "progress", { min: 0, max: 100 }),
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

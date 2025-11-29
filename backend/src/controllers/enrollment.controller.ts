import { Request, Response } from 'express';
import enrollmentService from '../services/enrollment.service';
import asyncHandler from '../utils/asyncHandler';
import { BadRequestError } from '../utils/errors';

/**
 * Helper function to normalize ID parameter
 */
function normalizeId(id: unknown): string {
  if (typeof id === 'string') {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new BadRequestError('ID cannot be empty');
    }
    return trimmed;
  }
  const stringId = String(id).trim();
  if (!stringId) {
    throw new BadRequestError('ID cannot be empty');
  }
  return stringId;
}

/**
 * Enrollment Controller
 * Handles HTTP requests for enrollment-related endpoints
 */
class EnrollmentController {
  /**
   * Get user's enrollments
   * GET /api/enrollments/my-courses
   */
  getMyEnrollments = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;

    const enrollments = await enrollmentService.getUserEnrollments(userId);

    res.status(200).json({
      status: 'success',
      data: enrollments,
    });
  });

  /**
   * Get enrollment by ID
   * GET /api/enrollments/:id
   */
  getEnrollmentById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params;

    const enrollmentId = normalizeId(id);

    const enrollment = await enrollmentService.getEnrollmentById(enrollmentId, userId);

    res.status(200).json({
      status: 'success',
      data: enrollment,
    });
  });

  /**
   * Update enrollment progress
   * PUT /api/enrollments/:id/progress
   */
  updateProgress = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params;
    const { completedLessons, progress } = req.body as {
      completedLessons?: string[] | number;
      progress?: number | string;
    };

    const enrollmentId = normalizeId(id);

    // Accept either an array of lesson IDs or a numeric count
    const completedCount = Array.isArray(completedLessons)
      ? completedLessons.length
      : typeof completedLessons === 'number'
      ? completedLessons
      : 0;

    const normalizedProgress =
      typeof progress === 'number'
        ? Math.max(0, Math.min(100, progress))
        : progress != null
        ? Math.max(0, Math.min(100, Number(progress) || 0))
        : undefined;

    const enrollment = await enrollmentService.updateProgress(
      enrollmentId,
      userId,
      completedCount,
      normalizedProgress
    );

    res.status(200).json({
      status: 'success',
      message: 'Progress updated successfully',
      data: enrollment,
    });
  });

  /**
   * Check course access
   * GET /api/enrollments/check-access/:courseId
   */
  checkAccess = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { courseId } = req.params;

    const normalizedCourseId = normalizeId(courseId);

    const hasAccess = await enrollmentService.checkAccess(userId, normalizedCourseId);

    res.status(200).json({
      status: 'success',
      data: { hasAccess },
    });
  });

  /**
   * Get course students (Teacher only)
   * GET /api/enrollments/course/:courseId/students
   */
  getCourseStudents = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { courseId } = req.params;

    const normalizedCourseId = normalizeId(courseId);

    const students = await enrollmentService.getCourseStudents(userId, normalizedCourseId);

    res.status(200).json({
      status: 'success',
      data: students,
    });
  });

  /**
   * Get course statistics (Teacher only)
   * GET /api/enrollments/course/:courseId/stats
   */
  getCourseStats = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { courseId } = req.params;

    const normalizedCourseId = normalizeId(courseId);

    const stats = await enrollmentService.getCourseStats(userId, normalizedCourseId);

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  });
}

export default new EnrollmentController();

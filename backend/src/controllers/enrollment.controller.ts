import { Request, Response } from 'express';
import enrollmentService from '../services/enrollment.service';
import asyncHandler from '../utils/asyncHandler';

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
    const userId = req.user!.id;

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
    const userId = req.user!.id;
    const { id } = req.params;

    const enrollmentId = typeof id === 'string' ? id.trim() : String(id);

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
    const userId = req.user!.id;
    const { id } = req.params;
    const { completedLessons, progress } = req.body as {
      completedLessons?: string[] | number;
      progress?: number | string;
    };

    const enrollmentId = typeof id === 'string' ? id.trim() : String(id);

    // Accept either an array of lesson IDs or a numeric count
    const completedCount = Array.isArray(completedLessons)
      ? completedLessons.length
      : typeof completedLessons === 'number'
      ? completedLessons
      : 0;

    const normalizedProgress =
      typeof progress === 'number'
        ? progress
        : progress != null
        ? Number(progress)
        : undefined as unknown as number;

    const enrollment = await enrollmentService.updateProgress(
      enrollmentId,
      userId,
      completedCount,
      normalizedProgress as number
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
    const userId = req.user!.id;
    const { courseId } = req.params;

    const normalizedCourseId =
      typeof courseId === 'string' ? courseId.trim() : String(courseId);

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
    const userId = req.user!.id;
    const { courseId } = req.params;

    const normalizedCourseId =
      typeof courseId === 'string' ? courseId.trim() : String(courseId);

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
    const userId = req.user!.id;
    const { courseId } = req.params;

    const normalizedCourseId =
      typeof courseId === 'string' ? courseId.trim() : String(courseId);

    const stats = await enrollmentService.getCourseStats(userId, normalizedCourseId);

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  });
}

export default new EnrollmentController();

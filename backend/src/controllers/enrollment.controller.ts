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

    const enrollment = await enrollmentService.getEnrollmentById(id, userId);

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
    const { completedLessons, progress } = req.body;

    const enrollment = await enrollmentService.updateProgress(
      id,
      userId,
      completedLessons,
      progress
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

    const hasAccess = await enrollmentService.checkAccess(userId, courseId);

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

    const students = await enrollmentService.getCourseStudents(userId, courseId);

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

    const stats = await enrollmentService.getCourseStats(userId, courseId);

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  });
}

export default new EnrollmentController();


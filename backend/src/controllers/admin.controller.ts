import { Request, Response } from 'express';
import { UserRole, VerificationStatus, ReportStatus } from '@prisma/client';
import adminService from '../services/admin.service';
import asyncHandler from '../utils/asyncHandler';

/**
 * Admin Controller
 * Handles HTTP requests for admin-related endpoints
 */
class AdminController {
  /**
   * Get platform statistics
   * GET /api/admin/stats
   */
  getPlatformStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await adminService.getPlatformStats();

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  });

  /**
   * Get all users with filters
   * GET /api/admin/users
   */
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const { role, isActive, search, page, limit } = req.query;

    const result = await adminService.getAllUsers({
      role: role as UserRole,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Get user by ID
   * GET /api/admin/users/:id
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await adminService.getUserById(id);

    res.status(200).json({
      status: 'success',
      data: user,
    });
  });

  /**
   * Update user status
   * PUT /api/admin/users/:id/status
   */
  updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await adminService.updateUserStatus(id, isActive);

    res.status(200).json({
      status: 'success',
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user,
    });
  });

  /**
   * Delete user
   * DELETE /api/admin/users/:id
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await adminService.deleteUser(id);

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully',
    });
  });

  /**
   * Get all courses (including unpublished)
   * GET /api/admin/courses
   */
  getAllCourses = asyncHandler(async (req: Request, res: Response) => {
    const { isPublished, category, page, limit } = req.query;

    const result = await adminService.getAllCourses({
      isPublished: isPublished === 'true' ? true : isPublished === 'false' ? false : undefined,
      category: category as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Approve/Reject course
   * PUT /api/admin/courses/:id/publish
   */
  updateCourseStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isPublished } = req.body;

    const course = await adminService.updateCourseStatus(id, isPublished);

    res.status(200).json({
      status: 'success',
      message: `Course ${isPublished ? 'published' : 'unpublished'} successfully`,
      data: course,
    });
  });

  /**
   * Delete course
   * DELETE /api/admin/courses/:id
   */
  deleteCourse = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await adminService.deleteCourse(id);

    res.status(200).json({
      status: 'success',
      message: 'Course deleted successfully',
    });
  });

  /**
   * Get all verification requests
   * GET /api/admin/verifications
   */
  getAllVerifications = asyncHandler(async (req: Request, res: Response) => {
    const { status, page, limit } = req.query;

    const result = await adminService.getAllVerifications({
      status: status as VerificationStatus,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Review verification
   * PUT /api/admin/verifications/:id
   */
  reviewVerification = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;
    const { status, reviewNotes } = req.body;

    const verification = await adminService.reviewVerification(
      id,
      adminId,
      status as VerificationStatus,
      reviewNotes
    );

    res.status(200).json({
      status: 'success',
      message: 'Verification reviewed successfully',
      data: verification,
    });
  });

  /**
   * Get all reports
   * GET /api/admin/reports
   */
  getAllReports = asyncHandler(async (req: Request, res: Response) => {
    const { status, type, page, limit } = req.query;

    const result = await adminService.getAllReports({
      status: status as ReportStatus,
      type: type as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Update report status
   * PUT /api/admin/reports/:id
   */
  updateReportStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, resolution } = req.body;

    const report = await adminService.updateReportStatus(
      id,
      status as ReportStatus,
      resolution
    );

    res.status(200).json({
      status: 'success',
      message: 'Report updated successfully',
      data: report,
    });
  });

  /**
   * Get financial statistics
   * GET /api/admin/financials
   */
  getFinancials = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const result = await adminService.getFinancials(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Get recent activities
   * GET /api/admin/activities
   */
  getRecentActivities = asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query;

    const activities = await adminService.getRecentActivities(
      limit ? parseInt(limit as string) : 20
    );

    res.status(200).json({
      status: 'success',
      data: activities,
    });
  });
}

export default new AdminController();


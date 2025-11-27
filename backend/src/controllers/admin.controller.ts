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
   * List teacher commissions
   * GET /api/admin/financials/commissions
   */
  getTeacherCommissions = asyncHandler(async (req: Request, res: Response) => {
    const { search, page, limit } = req.query as { search?: string; page?: string; limit?: string };
    const data = await adminService.getTeacherCommissions({
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    res.status(200).json({ status: 'success', data });
  });

  /**
   * Update a teacher commission rate
   * PUT /api/admin/financials/commissions/:userId
   */
  updateTeacherCommission = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params as { userId: string };
    const { commissionRate } = req.body as { commissionRate: number | null };
    const adminId = req.user!.id;

    const updated = await adminService.updateTeacherCommission(userId, adminId, commissionRate);
    res.status(200).json({ status: 'success', data: updated, message: 'Commission updated' });
  });

  /**
   * Get recent activities
   * GET /api/admin/activities
   */
  getRecentActivities = asyncHandler(async (req: Request, res: Response) => {
    const { limit, page } = req.query;

    const data = await adminService.getRecentActivities({
      limit: limit ? parseInt(limit as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data,
    });
  });

  /**
   * Create a new user
   * POST /api/admin/users
   */
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, role, phone, address, department } = req.body;
    const adminId = req.user!.id;

    const user = await adminService.createUser({
      email,
      password,
      firstName,
      lastName,
      role,
      phone,
      address,
      department,
      createdBy: adminId,
    });

    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: user,
    });
  });

  /**
   * Update user information
   * PUT /api/admin/users/:id
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;

    const user = await adminService.updateUser(id, req.body, adminId);

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: user,
    });
  });

  /**
   * Reset user password
   * PUT /api/admin/users/:id/password
   */
  resetUserPassword = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    const adminId = req.user!.id;

    const user = await adminService.resetUserPassword(id, newPassword, adminId);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully',
      data: user,
    });
  });

  /**
   * Lock/Unlock user account
   * PUT /api/admin/users/:id/lock
   */
  lockUserAccount = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { lock, reason } = req.body;
    const adminId = req.user!.id;

    const user = await adminService.lockUserAccount(id, lock, adminId, reason);

    res.status(200).json({
      status: 'success',
      message: `User account ${lock ? 'locked' : 'unlocked'} successfully`,
      data: user,
    });
  });

  /**
   * Batch delete users
   * POST /api/admin/users/batch/delete
   */
  batchDeleteUsers = asyncHandler(async (req: Request, res: Response) => {
    const { userIds } = req.body;
    const adminId = req.user!.id;

    await adminService.batchDeleteUsers(userIds, adminId);

    res.status(200).json({
      status: 'success',
      message: 'Users deleted successfully',
    });
  });

  /**
   * Batch update user status
   * POST /api/admin/users/batch/status
   */
  batchUpdateUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const { userIds, isActive } = req.body;
    const adminId = req.user!.id;

    await adminService.batchUpdateUserStatus(userIds, isActive, adminId);

    res.status(200).json({
      status: 'success',
      message: `Users ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  });

  /**
   * Get user audit logs
   * GET /api/admin/users/audit-logs
   */
  getUserAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const { userId, adminId, action, page, limit } = req.query;

    const result = await adminService.getUserAuditLogs({
      userId: userId as string,
      adminId: adminId as string,
      action: action as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });
  /**
   * Get settlements (aggregated by teacher)
   * GET /api/admin/financials/settlements
   */
  getSettlements = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, page, limit } = req.query as { startDate?: string; endDate?: string; page?: string; limit?: string };
    const data = await adminService.getSettlements({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    res.status(200).json({ status: 'success', data });
  });

  /**
   * Get invoices & bills (payments list)
   * GET /api/admin/financials/invoices
   */
  getInvoices = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, page, limit, search } = req.query as { startDate?: string; endDate?: string; page?: string; limit?: string; search?: string };
    const data = await adminService.getInvoices({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
    });
    res.status(200).json({ status: 'success', data });
  });

  getRevenueAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, groupBy } = req.query as { startDate?: string; endDate?: string; groupBy?: 'day' | 'week' | 'month' };
    const data = await adminService.getRevenueAnalytics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      groupBy,
    });
    res.status(200).json({ status: 'success', data });
  });
}

export default new AdminController();


import { Request, Response } from 'express';
import { ReportStatus, ReportType, UserRole } from '@prisma/client';
import reportService from '../services/report.service';
import asyncHandler from '../utils/asyncHandler';

/**
 * Report Controller
 * Handles HTTP requests for report-related endpoints
 */
class ReportController {
  /**
   * Submit a report
   * POST /api/reports
   */
  submitReport = asyncHandler(async (req: Request, res: Response) => {
    const reporterId = req.user!.id;
    const { reportedId, type, description } = req.body;

    const report = await reportService.submitReport(
      reporterId,
      reportedId,
      type as ReportType,
      description
    );

    res.status(201).json({
      status: 'success',
      message: 'Report submitted successfully',
      data: report,
    });
  });

  /**
   * Get user's submitted reports
   * GET /api/reports/my-reports
   */
  getMyReports = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const reports = await reportService.getUserReports(userId);

    res.status(200).json({
      status: 'success',
      data: reports,
    });
  });

  /**
   * Get report by ID
   * GET /api/reports/:id
   */
  getReportById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const isAdmin = req.user!.role === UserRole.ADMIN;

    const report = await reportService.getReportById(id, userId, isAdmin);

    res.status(200).json({
      status: 'success',
      data: report,
    });
  });

  /**
   * Get all reports (Admin only)
   * GET /api/reports
   */
  getAllReports = asyncHandler(async (req: Request, res: Response) => {
    const { status, type, page, limit } = req.query;

    const result = await reportService.getAllReports(
      status as ReportStatus,
      type as ReportType,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Update report status (Admin only)
   * PUT /api/reports/:id/status
   */
  updateReportStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, resolution } = req.body;

    const report = await reportService.updateReportStatus(
      id,
      status as ReportStatus,
      resolution
    );

    res.status(200).json({
      status: 'success',
      message: 'Report status updated successfully',
      data: report,
    });
  });

  /**
   * Get reports against a teacher (Admin only)
   * GET /api/reports/teacher/:teacherId
   */
  getTeacherReports = asyncHandler(async (req: Request, res: Response) => {
    const { teacherId } = req.params;

    const result = await reportService.getTeacherReports(teacherId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });
}

export default new ReportController();


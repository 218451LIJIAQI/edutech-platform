import { Request, Response } from 'express';
import { ReportStatus, ReportType, UserRole } from '@prisma/client';
import reportService from '../services/report.service';
import asyncHandler from '../utils/asyncHandler';
import { BadRequestError } from '../utils/errors';

/**
 * Report Controller
 * Handles HTTP requests for report-related endpoints
 */
class ReportController {
  /**
   * Submit a report
   * POST /api/reports
   * Supports reporting teachers, courses, and community content
   */
  submitReport = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const reporterId = req.user.id;
    const { reportedId, type, description, contentType, contentId } = req.body as {
      reportedId?: string;
      type?: ReportType;
      description?: string;
      contentType?: string;
      contentId?: string;
    };

    if (!reportedId || typeof reportedId !== 'string' || !reportedId.trim()) {
      throw new BadRequestError('Reported ID is required');
    }

    if (!type || !Object.values(ReportType).includes(type)) {
      throw new BadRequestError('Valid report type is required');
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      throw new BadRequestError('Description is required');
    }

    const report = await reportService.submitReport(
      reporterId,
      reportedId.trim(),
      type,
      description.trim(),
      contentType && typeof contentType === 'string' ? contentType.trim() : undefined,
      contentId && typeof contentId === 'string' ? contentId.trim() : undefined
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
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;

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
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params as { id?: string };
    const isAdmin = req.user.role === UserRole.ADMIN;

    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Report ID is required');
    }

    const report = await reportService.getReportById(id.trim(), userId, isAdmin);

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
    const { status, type, page, limit } = req.query as {
      status?: string | string[];
      type?: string | string[];
      page?: string | string[];
      limit?: string | string[];
    };

    const pickFirst = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

    const statusValue = pickFirst(status);
    const typeValue = pickFirst(type);
    const pageValue = pickFirst(page);
    const limitValue = pickFirst(limit);

    const parsedPage = pageValue ? Number.parseInt(pageValue, 10) : undefined;
    const parsedLimit = limitValue ? Number.parseInt(limitValue, 10) : undefined;

    const safePage = parsedPage && Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : undefined;
    const safeLimit = parsedLimit && Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

    const result = await reportService.getAllReports(
      statusValue && Object.values(ReportStatus).includes(statusValue as ReportStatus)
        ? (statusValue as ReportStatus)
        : undefined,
      typeValue && Object.values(ReportType).includes(typeValue as ReportType)
        ? (typeValue as ReportType)
        : undefined,
      safePage,
      safeLimit
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
    const { id } = req.params as { id?: string };
    const { status, resolution } = req.body as { status?: ReportStatus; resolution?: string };

    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Report ID is required');
    }

    if (!status || !Object.values(ReportStatus).includes(status)) {
      throw new BadRequestError('Valid report status is required');
    }

    const report = await reportService.updateReportStatus(
      id.trim(),
      status,
      resolution && typeof resolution === 'string' ? resolution.trim() : undefined
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
    const { teacherId } = req.params as { teacherId?: string };

    if (!teacherId || typeof teacherId !== 'string' || !teacherId.trim()) {
      throw new BadRequestError('Teacher ID is required');
    }

    const result = await reportService.getTeacherReports(teacherId.trim());

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });
}

export default new ReportController();

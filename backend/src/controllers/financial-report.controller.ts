import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import asyncHandler from "../utils/async-handler";
import financialReportService from "../services/financial-report.service";
import autoVerificationService from "../services/auto-verification.service";
import { AuthenticationError, AuthorizationError } from "../utils/errors";

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

const requireAdmin = (req: Request): string => {
  if (!req.user) {
    throw new AuthenticationError("Authentication required");
  }

  if (req.user.role !== UserRole.ADMIN) {
    throw new AuthorizationError("Admin access required");
  }

  return req.user.id;
};

/**
 * Financial Report Controller
 * Handles auto-generated financial reports and auto-verification statistics.
 */
class FinancialReportController {
  /**
   * Get auto-generated financial summary (daily/weekly/monthly/all-time).
   * GET /api/v1/admin/financial-reports/summary
   */
  getSummary = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const summary = await financialReportService.getFinancialSummary();

    sendSuccess(res, summary, "Financial summary generated successfully");
  });

  /**
   * Get auto-computed teacher settlements.
   * GET /api/v1/admin/financial-reports/teacher-settlements
   */
  getTeacherSettlements = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const page = req.query.page
      ? parseInt(req.query.page as string, 10)
      : undefined;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const result = await financialReportService.getTeacherSettlements({
      page,
      limit,
      startDate,
      endDate,
    });

    sendSuccess(res, result);
  });

  /**
   * Export financial data for a given date range.
   * GET /api/v1/admin/financial-reports/export
   */
  exportData = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const data = await financialReportService.getExportData({
      startDate,
      endDate,
    });

    sendSuccess(res, data, "Financial export data generated successfully");
  });

  /**
   * Get auto-verification statistics.
   * GET /api/v1/admin/financial-reports/auto-verification-stats
   */
  getAutoVerificationStats = asyncHandler(
    async (req: Request, res: Response) => {
      requireAdmin(req);

      const stats = await autoVerificationService.getAutoVerificationStats();

      sendSuccess(res, stats);
    },
  );
}

export default new FinancialReportController();

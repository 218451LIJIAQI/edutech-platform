import { Request, Response } from "express";
import asyncHandler from "../utils/async-handler";
import financialReportService from "../services/financial-report.service";
import autoVerificationService from "../services/auto-verification.service";
import {
  parseBoundedInt,
  parseOptionalString,
  requireAdminUser,
  sendSuccess,
} from "../utils/http";

class FinancialReportController {
  getSummary = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const summary = await financialReportService.getFinancialSummary();
    sendSuccess(res, summary, "Financial summary generated successfully");
  });

  getTeacherSettlements = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const result = await financialReportService.getTeacherSettlements({
      page: parseBoundedInt(req.query.page, 1, { min: 1, fieldName: "page" }),
      limit: parseBoundedInt(req.query.limit, 20, {
        min: 1,
        max: 100,
        fieldName: "limit",
      }),
      startDate: parseOptionalString(req.query.startDate),
      endDate: parseOptionalString(req.query.endDate),
    });
    sendSuccess(res, result);
  });

  exportData = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const data = await financialReportService.getExportData({
      startDate: parseOptionalString(req.query.startDate),
      endDate: parseOptionalString(req.query.endDate),
    });
    sendSuccess(res, data, "Financial export data generated successfully");
  });

  getAutoVerificationStats = asyncHandler(
    async (req: Request, res: Response) => {
      requireAdminUser(req);
      const stats = await autoVerificationService.getAutoVerificationStats();
      sendSuccess(res, stats);
    },
  );
}

export default new FinancialReportController();

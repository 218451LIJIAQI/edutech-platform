import { Request, Response } from "express";
import { ReportStatus, ReportType, UserRole } from "@prisma/client";
import reportService from "../services/report.service";
import asyncHandler from "../utils/async-handler";
import { BadRequestError } from "../utils/errors";
import {
  parseOptionalEnum,
  parseOptionalString,
  parseQueryPositiveInt,
  parseRequiredEnum,
  parseRequiredParam,
  parseRequiredString,
  requireAdminUser,
  requireAuthUser,
  requireAuthUserId,
  sendCreated,
  sendSuccess,
} from "../utils/http";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_RESOLUTION_LENGTH = 3000;

class ReportController {
  submitReport = asyncHandler(async (req: Request, res: Response) => {
    const reporterId = requireAuthUserId(req);
    const reportedId = parseRequiredString(req.body?.reportedId, "reportedId");

    if (reportedId === reporterId) {
      throw new BadRequestError("You cannot report yourself");
    }

    const type = parseRequiredEnum(req.body?.type, ReportType, "type");
    const description = parseRequiredString(
      req.body?.description,
      "description",
      { maxLength: MAX_DESCRIPTION_LENGTH },
    );
    const contentType = parseOptionalString(
      req.body?.contentType,
      "contentType",
      100,
    );
    const contentId = parseOptionalString(
      req.body?.contentId,
      "contentId",
      200,
    );

    if (
      (contentType && contentType !== "teacher" && !contentId) ||
      (!contentType && contentId)
    ) {
      throw new BadRequestError(
        "contentType and contentId must be provided together",
      );
    }

    const report = await reportService.submitReport(
      reporterId,
      reportedId,
      type,
      description,
      contentType,
      contentId,
    );

    sendCreated(res, report, "Report submitted successfully");
  });

  getMyReports = asyncHandler(async (req: Request, res: Response) => {
    const reports = await reportService.getUserReports(requireAuthUserId(req));
    sendSuccess(res, reports);
  });

  getReportById = asyncHandler(async (req: Request, res: Response) => {
    const user = requireAuthUser(req);
    const report = await reportService.getReportById(
      parseRequiredParam(req.params.id, "Report ID"),
      user.id,
      user.role === UserRole.ADMIN,
    );
    sendSuccess(res, report);
  });

  getAllReports = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const result = await reportService.getAllReports(
      parseOptionalEnum(req.query.status, ReportStatus, "status"),
      parseOptionalEnum(req.query.type, ReportType, "type"),
      parseQueryPositiveInt(req.query.page, "page", {
        fallback: DEFAULT_PAGE,
        max: MAX_LIMIT,
      }) as number,
      parseQueryPositiveInt(req.query.limit, "limit", {
        fallback: DEFAULT_LIMIT,
        max: MAX_LIMIT,
      }) as number,
    );
    sendSuccess(res, result);
  });

  updateReportStatus = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const report = await reportService.updateReportStatus(
      parseRequiredParam(req.params.id, "Report ID"),
      parseRequiredEnum(req.body?.status, ReportStatus, "status"),
      parseOptionalString(
        req.body?.resolution,
        "resolution",
        MAX_RESOLUTION_LENGTH,
      ),
    );
    sendSuccess(res, report, "Report status updated successfully");
  });

  getTeacherReports = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const result = await reportService.getTeacherReports(
      parseRequiredParam(req.params.teacherId, "Teacher ID"),
    );
    sendSuccess(res, result);
  });
}

export default new ReportController();

import { Request, Response } from "express";
import { ReportStatus, ReportType, UserRole } from "@prisma/client";
import reportService from "../services/report.service";
import asyncHandler from "../utils/async-handler";
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
} from "../utils/errors";

/**
 * Report Controller
 * Handles HTTP requests for report-related endpoints.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_RESOLUTION_LENGTH = 3000;

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

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AuthenticationError("Authentication required");
  }

  return req.user.id;
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

const getFirstQueryValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0].trim() : undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
};

const parseRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} is required`);
  }

  const parsed = value.trim();

  if (parsed.length === 0) {
    throw new BadRequestError(`${fieldName} cannot be empty`);
  }

  return parsed;
};

const parseOptionalString = (
  value: unknown,
  fieldName: string,
  maxLength?: number,
): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} must be a string`);
  }

  const parsed = value.trim();

  if (parsed.length === 0) {
    return undefined;
  }

  if (maxLength !== undefined && parsed.length > maxLength) {
    throw new BadRequestError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return parsed;
};

const parseRequiredLimitedString = (
  value: unknown,
  fieldName: string,
  maxLength: number,
): string => {
  const parsed = parseRequiredString(value, fieldName);

  if (parsed.length > maxLength) {
    throw new BadRequestError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return parsed;
};

const parseRequiredEnum = <T extends string>(
  value: unknown,
  enumObject: Record<string, T>,
  fieldName: string,
): T => {
  const parsed = parseRequiredString(value, fieldName);
  const allowedValues = Object.values(enumObject);

  if (!allowedValues.includes(parsed as T)) {
    throw new BadRequestError(
      `${fieldName} must be one of: ${allowedValues.join(", ")}`,
    );
  }

  return parsed as T;
};

const parseOptionalQueryEnum = <T extends string>(
  value: unknown,
  enumObject: Record<string, T>,
  fieldName: string,
): T | undefined => {
  const parsed = getFirstQueryValue(value);

  if (!parsed) {
    return undefined;
  }

  const allowedValues = Object.values(enumObject);

  if (!allowedValues.includes(parsed as T)) {
    throw new BadRequestError(
      `${fieldName} must be one of: ${allowedValues.join(", ")}`,
    );
  }

  return parsed as T;
};

const parsePositiveInteger = (
  value: unknown,
  fallback: number,
  fieldName: string,
  max = MAX_LIMIT,
): number => {
  const rawValue = getFirstQueryValue(value);

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestError(`${fieldName} must be a positive integer`);
  }

  return Math.min(parsed, max);
};

const parseReportId = (req: Request): string => {
  return parseRequiredString(req.params.id, "Report ID");
};

class ReportController {
  /**
   * Submit a report.
   * POST /api/reports
   * Supports reporting teachers, courses, and community content.
   */
  submitReport = asyncHandler(async (req: Request, res: Response) => {
    const reporterId = getAuthenticatedUserId(req);

    const reportedId = parseRequiredString(req.body?.reportedId, "reportedId");

    if (reportedId === reporterId) {
      throw new BadRequestError("You cannot report yourself");
    }

    const type = parseRequiredEnum(req.body?.type, ReportType, "type");
    const description = parseRequiredLimitedString(
      req.body?.description,
      "description",
      MAX_DESCRIPTION_LENGTH,
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

    sendSuccess(res, report, "Report submitted successfully", 201);
  });

  /**
   * Get current user's submitted reports.
   * GET /api/reports/my-reports
   */
  getMyReports = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const reports = await reportService.getUserReports(userId);

    sendSuccess(res, reports);
  });

  /**
   * Get report by ID.
   * GET /api/reports/:id
   */
  getReportById = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const reportId = parseReportId(req);
    const isAdmin = req.user?.role === UserRole.ADMIN;

    const report = await reportService.getReportById(reportId, userId, isAdmin);

    sendSuccess(res, report);
  });

  /**
   * Get all reports.
   * Admin-only endpoint.
   * GET /api/reports
   */
  getAllReports = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const status = parseOptionalQueryEnum(
      req.query.status,
      ReportStatus,
      "status",
    );
    const type = parseOptionalQueryEnum(req.query.type, ReportType, "type");
    const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE, "page");
    const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT, "limit");

    const result = await reportService.getAllReports(status, type, page, limit);

    sendSuccess(res, result);
  });

  /**
   * Update report status.
   * Admin-only endpoint.
   * PUT /api/reports/:id/status
   */
  updateReportStatus = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const reportId = parseReportId(req);
    const status = parseRequiredEnum(req.body?.status, ReportStatus, "status");
    const resolution = parseOptionalString(
      req.body?.resolution,
      "resolution",
      MAX_RESOLUTION_LENGTH,
    );

    const report = await reportService.updateReportStatus(
      reportId,
      status,
      resolution,
    );

    sendSuccess(res, report, "Report status updated successfully");
  });

  /**
   * Get reports against a teacher.
   * Admin-only endpoint.
   * GET /api/reports/teacher/:teacherId
   */
  getTeacherReports = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const teacherId = parseRequiredString(req.params.teacherId, "Teacher ID");

    const result = await reportService.getTeacherReports(teacherId);

    sendSuccess(res, result);
  });
}

export default new ReportController();

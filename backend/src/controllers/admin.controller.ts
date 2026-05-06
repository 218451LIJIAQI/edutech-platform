import { Request, Response } from "express";
import {
  ReportStatus,
  ReportType,
  UserRole,
  VerificationStatus,
} from "@prisma/client";
import adminService from "../services/admin.service";
import asyncHandler from "../utils/async-handler";
import { AuthenticationError, BadRequestError } from "../utils/errors";

/**
 * Admin Controller
 * Handles HTTP requests for admin-related endpoints.
 */

type OriginValue = unknown;
type PaginationQuery = {
  page?: number;
  limit?: number;
};

type DateRangeQuery = {
  startDate?: Date;
  endDate?: Date;
};

type RevenueGroupBy = "day" | "week" | "month";
type AdminUserSortBy =
  | "email"
  | "firstName"
  | "lastName"
  | "lastLoginAt"
  | "loginCount"
  | "createdAt"
  | "updatedAt";
type SortOrder = "asc" | "desc";

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

const DATE_ONLY_QUERY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getQueryString = (value: OriginValue): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    const trimmed = value[0].trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
};

const parseOptionalString = (
  value: OriginValue,
  fieldName: string,
): string | undefined => {
  const parsed = getQueryString(value);

  if (parsed === undefined) return undefined;

  if (parsed.length === 0) {
    throw new BadRequestError(`${fieldName} cannot be empty.`);
  }

  return parsed;
};

const parseOptionalBodyString = (
  value: OriginValue,
  fieldName: string,
): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} must be a string.`);
  }

  const parsed = value.trim();

  if (!parsed) {
    throw new BadRequestError(`${fieldName} cannot be empty.`);
  }

  return parsed;
};

const parseOptionalNullableBodyString = (
  value: OriginValue,
  fieldName: string,
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} must be a string or null.`);
  }

  const parsed = value.trim();

  return parsed || null;
};

const parseRequiredString = (value: OriginValue, fieldName: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestError(`${fieldName} is required.`);
  }

  return value.trim();
};

const parseOptionalBoolean = (
  value: OriginValue,
  fieldName: string,
): boolean | undefined => {
  if (value === undefined || value === null) return undefined;

  if (typeof value === "boolean") return value;

  const parsed = getQueryString(value);

  if (parsed === undefined) return undefined;

  if (parsed === "true") return true;
  if (parsed === "false") return false;

  throw new BadRequestError(`${fieldName} must be true or false.`);
};

const parseRequiredBoolean = (
  value: OriginValue,
  fieldName: string,
): boolean => {
  const parsed = parseOptionalBoolean(value, fieldName);

  if (parsed === undefined) {
    throw new BadRequestError(
      `${fieldName} is required and must be true or false.`,
    );
  }

  return parsed;
};

const parseOptionalPositiveInteger = (
  value: OriginValue,
  fieldName: string,
  max = 1000,
): number | undefined => {
  const parsed = getQueryString(value);

  if (parsed === undefined) return undefined;

  const numberValue = Number(parsed);

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    throw new BadRequestError(`${fieldName} must be a positive integer.`);
  }

  if (numberValue > max) return max;

  return numberValue;
};

const parsePagination = (query: Request["query"]): PaginationQuery => {
  return {
    page: parseOptionalPositiveInteger(query.page, "page"),
    limit: parseOptionalPositiveInteger(query.limit, "limit", 100),
  };
};

const parseOptionalDate = (
  value: OriginValue,
  fieldName: string,
  options?: { endOfDay?: boolean },
): Date | undefined => {
  const parsed = getQueryString(value);

  if (parsed === undefined) return undefined;

  const date = DATE_ONLY_QUERY_PATTERN.test(parsed)
    ? new Date(
        `${parsed}T${
          options?.endOfDay ? "23:59:59.999" : "00:00:00.000"
        }Z`,
      )
    : new Date(parsed);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError(`${fieldName} must be a valid date.`);
  }

  return date;
};

const parseDateRange = (query: Request["query"]): DateRangeQuery => {
  const startDate = parseOptionalDate(query.startDate, "startDate");
  const endDate = parseOptionalDate(query.endDate, "endDate", {
    endOfDay: true,
  });

  if (startDate && endDate && startDate > endDate) {
    throw new BadRequestError("startDate cannot be later than endDate.");
  }

  return { startDate, endDate };
};

const parseNamedDateRange = (
  query: Request["query"],
  startFieldName: string,
  endFieldName: string,
): DateRangeQuery => {
  const startDate = parseOptionalDate(query[startFieldName], startFieldName);
  const endDate = parseOptionalDate(query[endFieldName], endFieldName, {
    endOfDay: true,
  });

  if (startDate && endDate && startDate > endDate) {
    throw new BadRequestError(
      `${startFieldName} cannot be later than ${endFieldName}.`,
    );
  }

  return { startDate, endDate };
};

const parseEnumValue = <T extends Record<string, string>>(
  value: OriginValue,
  enumObject: T,
  fieldName: string,
): T[keyof T] | undefined => {
  const parsed = getQueryString(value);

  if (parsed === undefined) return undefined;

  const allowedValues = Object.values(enumObject);

  if (!allowedValues.includes(parsed)) {
    throw new BadRequestError(
      `${fieldName} must be one of: ${allowedValues.join(", ")}.`,
    );
  }

  return parsed as T[keyof T];
};

const parseRevenueGroupBy = (
  value: OriginValue,
): RevenueGroupBy | undefined => {
  const parsed = getQueryString(value);

  if (parsed === undefined) return undefined;

  if (parsed === "day" || parsed === "week" || parsed === "month") {
    return parsed;
  }

  throw new BadRequestError("groupBy must be one of: day, week, month.");
};

const parseAdminUserSortBy = (
  value: OriginValue,
): AdminUserSortBy | undefined => {
  const parsed = getQueryString(value);

  if (parsed === undefined) return undefined;

  const allowedValues: AdminUserSortBy[] = [
    "email",
    "firstName",
    "lastName",
    "lastLoginAt",
    "loginCount",
    "createdAt",
    "updatedAt",
  ];

  if (!allowedValues.includes(parsed as AdminUserSortBy)) {
    throw new BadRequestError(
      `sortBy must be one of: ${allowedValues.join(", ")}.`,
    );
  }

  return parsed as AdminUserSortBy;
};

const parseSortOrder = (value: OriginValue): SortOrder | undefined => {
  const parsed = getQueryString(value);

  if (parsed === undefined) return undefined;

  if (parsed === "asc" || parsed === "desc") {
    return parsed;
  }

  throw new BadRequestError("sortOrder must be asc or desc.");
};

const parseOptionalEnumBody = <T extends Record<string, string>>(
  value: OriginValue,
  enumObject: T,
  fieldName: string,
): T[keyof T] | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} must be a string.`);
  }

  const parsed = value.trim();
  const allowedValues = Object.values(enumObject);

  if (!allowedValues.includes(parsed)) {
    throw new BadRequestError(
      `${fieldName} must be one of: ${allowedValues.join(", ")}.`,
    );
  }

  return parsed as T[keyof T];
};

const parseNullableNumber = (
  value: OriginValue,
  fieldName: string,
  min?: number,
  max?: number,
): number | null => {
  if (value === null) return null;

  const parsed =
    typeof value === "number" ? value : Number(getQueryString(value));

  if (!Number.isFinite(parsed)) {
    throw new BadRequestError(`${fieldName} must be a valid number or null.`);
  }

  if (min !== undefined && parsed < min) {
    throw new BadRequestError(`${fieldName} must be at least ${min}.`);
  }

  if (max !== undefined && parsed > max) {
    throw new BadRequestError(`${fieldName} must be at most ${max}.`);
  }

  return parsed;
};

const parseRequiredStringArray = (
  value: OriginValue,
  fieldName: string,
): string[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestError(`${fieldName} must be a non-empty array.`);
  }

  const parsed = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (parsed.length !== value.length || parsed.length === 0) {
    throw new BadRequestError(
      `${fieldName} must contain valid string IDs only.`,
    );
  }

  return parsed;
};

const getAuthenticatedAdminId = (req: Request): string => {
  if (!req.user) {
    throw new AuthenticationError("Authentication required");
  }

  return req.user.id;
};

class AdminController {
  /**
   * Get platform statistics
   * GET /api/admin/stats
   */
  getPlatformStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await adminService.getPlatformStats();
    sendSuccess(res, stats);
  });

  /**
   * Get all users with filters
   * GET /api/admin/users
   */
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const { startDate: createdAfter, endDate: createdBefore } =
      parseNamedDateRange(req.query, "createdAfter", "createdBefore");

    const result = await adminService.getAllUsers({
      role: parseEnumValue(req.query.role, UserRole, "role"),
      isActive: parseOptionalBoolean(req.query.isActive, "isActive"),
      isLocked: parseOptionalBoolean(req.query.isLocked, "isLocked"),
      search: parseOptionalString(req.query.search, "search"),
      sortBy: parseAdminUserSortBy(req.query.sortBy),
      sortOrder: parseSortOrder(req.query.sortOrder),
      createdAfter,
      createdBefore,
      ...parsePagination(req.query),
    });

    sendSuccess(res, result);
  });

  /**
   * Get user by ID
   * GET /api/admin/users/:id
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const user = await adminService.getUserById(req.params.id);
    sendSuccess(res, user);
  });

  /**
   * Update user status
   * PUT /api/admin/users/:id/status
   */
  updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const adminId = getAuthenticatedAdminId(req);
    const isActive = parseRequiredBoolean(req.body?.isActive, "isActive");

    const user = await adminService.updateUserStatus(
      req.params.id,
      isActive,
      adminId,
    );

    sendSuccess(
      res,
      user,
      `User ${isActive ? "activated" : "deactivated"} successfully`,
    );
  });

  /**
   * Delete user
   * DELETE /api/admin/users/:id
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const adminId = getAuthenticatedAdminId(req);
    const force =
      parseOptionalBoolean(req.query.force, "force") ??
      parseOptionalBoolean(req.body?.force, "force") ??
      false;

    await adminService.deleteUser(req.params.id, { force, adminId });

    sendSuccess(
      res,
      undefined,
      force
        ? "User permanently deleted successfully"
        : "User deactivated successfully",
    );
  });

  /**
   * Get all courses, including unpublished courses
   * GET /api/admin/courses
   */
  getAllCourses = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.getAllCourses({
      isPublished: parseOptionalBoolean(req.query.isPublished, "isPublished"),
      category: parseOptionalString(req.query.category, "category"),
      search: parseOptionalString(req.query.search, "search"),
      ...parsePagination(req.query),
    });

    sendSuccess(res, result);
  });

  /**
   * Publish or unpublish a course
   * PUT /api/admin/courses/:id/publish
   */
  updateCourseStatus = asyncHandler(async (req: Request, res: Response) => {
    const isPublished = parseRequiredBoolean(
      req.body?.isPublished,
      "isPublished",
    );

    const course = await adminService.updateCourseStatus(
      req.params.id,
      isPublished,
    );

    sendSuccess(
      res,
      course,
      `Course ${isPublished ? "published" : "unpublished"} successfully`,
    );
  });

  /**
   * Delete course
   * DELETE /api/admin/courses/:id
   */
  deleteCourse = asyncHandler(async (req: Request, res: Response) => {
    await adminService.deleteCourse(req.params.id);

    sendSuccess(res, undefined, "Course deleted successfully");
  });

  /**
   * Get all verification requests
   * GET /api/admin/verifications
   */
  getAllVerifications = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.getAllVerifications({
      status: parseEnumValue(req.query.status, VerificationStatus, "status"),
      ...parsePagination(req.query),
    });

    sendSuccess(res, result);
  });

  /**
   * Review verification
   * PUT /api/admin/verifications/:id
   */
  reviewVerification = asyncHandler(async (req: Request, res: Response) => {
    const adminId = getAuthenticatedAdminId(req);
    const status = parseEnumValue(
      req.body?.status,
      VerificationStatus,
      "status",
    );

    if (!status) {
      throw new BadRequestError("status is required.");
    }

    const verification = await adminService.reviewVerification(
      req.params.id,
      adminId,
      status,
      typeof req.body?.reviewNotes === "string"
        ? req.body.reviewNotes.trim()
        : undefined,
    );

    sendSuccess(res, verification, "Verification reviewed successfully");
  });

  /**
   * Get all reports
   * GET /api/admin/reports
   */
  getAllReports = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.getAllReports({
      status: parseEnumValue(req.query.status, ReportStatus, "status"),
      type: parseEnumValue(req.query.type, ReportType, "type"),
      ...parsePagination(req.query),
    });

    sendSuccess(res, result);
  });

  /**
   * Update report status
   * PUT /api/admin/reports/:id
   */
  updateReportStatus = asyncHandler(async (req: Request, res: Response) => {
    const status = parseEnumValue(req.body?.status, ReportStatus, "status");

    if (!status) {
      throw new BadRequestError("status is required.");
    }

    const report = await adminService.updateReportStatus(
      req.params.id,
      status,
      typeof req.body?.resolution === "string"
        ? req.body.resolution.trim()
        : undefined,
    );

    sendSuccess(res, report, "Report updated successfully");
  });

  /**
   * Get financial statistics
   * GET /api/admin/financials
   */
  getFinancials = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = parseDateRange(req.query);

    const result = await adminService.getFinancials(startDate, endDate);

    sendSuccess(res, result);
  });

  /**
   * List teacher commissions
   * GET /api/admin/financials/commissions
   */
  getTeacherCommissions = asyncHandler(async (req: Request, res: Response) => {
    const data = await adminService.getTeacherCommissions({
      search: parseOptionalString(req.query.search, "search"),
      ...parsePagination(req.query),
    });

    sendSuccess(res, data);
  });

  /**
   * Update a teacher commission rate
   * PUT /api/admin/financials/commissions/:userId
   */
  updateTeacherCommission = asyncHandler(
    async (req: Request, res: Response) => {
      const adminId = getAuthenticatedAdminId(req);
      const commissionRate = parseNullableNumber(
        req.body?.commissionRate,
        "commissionRate",
        0,
        100,
      );

      const updated = await adminService.updateTeacherCommission(
        req.params.userId,
        adminId,
        commissionRate,
      );

      sendSuccess(res, updated, "Commission updated successfully");
    },
  );

  /**
   * Get recent activities
   * GET /api/admin/activities
   */
  getRecentActivities = asyncHandler(async (req: Request, res: Response) => {
    const data = await adminService.getRecentActivities(
      parsePagination(req.query),
    );

    sendSuccess(res, data);
  });

  /**
   * Create a new user
   * POST /api/admin/users
   */
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const adminId = getAuthenticatedAdminId(req);

    const user = await adminService.createUser({
      email: parseRequiredString(req.body?.email, "email"),
      password: parseRequiredString(req.body?.password, "password"),
      firstName: parseRequiredString(req.body?.firstName, "firstName"),
      lastName: parseRequiredString(req.body?.lastName, "lastName"),
      role:
        parseOptionalEnumBody(req.body?.role, UserRole, "role") ??
        UserRole.STUDENT,
      phone:
        parseOptionalNullableBodyString(req.body?.phone, "phone") ?? undefined,
      address:
        parseOptionalNullableBodyString(req.body?.address, "address") ??
        undefined,
      department:
        parseOptionalNullableBodyString(req.body?.department, "department") ??
        undefined,
      createdBy: adminId,
    });

    sendSuccess(res, user, "User created successfully", 201);
  });

  /**
   * Update user information
   * PUT /api/admin/users/:id
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const adminId = getAuthenticatedAdminId(req);

    const user = await adminService.updateUser(
      req.params.id,
      {
        firstName: parseOptionalBodyString(req.body?.firstName, "firstName"),
        lastName: parseOptionalBodyString(req.body?.lastName, "lastName"),
        email: parseOptionalBodyString(req.body?.email, "email"),
        phone: parseOptionalNullableBodyString(req.body?.phone, "phone"),
        address: parseOptionalNullableBodyString(req.body?.address, "address"),
        department: parseOptionalNullableBodyString(
          req.body?.department,
          "department",
        ),
        avatar: parseOptionalNullableBodyString(req.body?.avatar, "avatar"),
        role: parseOptionalEnumBody(req.body?.role, UserRole, "role"),
        isActive: parseOptionalBoolean(req.body?.isActive, "isActive"),
        isLocked: parseOptionalBoolean(req.body?.isLocked, "isLocked"),
      },
      adminId,
    );

    sendSuccess(res, user, "User updated successfully");
  });

  /**
   * Reset user password
   * PUT /api/admin/users/:id/password
   */
  resetUserPassword = asyncHandler(async (req: Request, res: Response) => {
    const adminId = getAuthenticatedAdminId(req);
    const newPassword = parseRequiredString(
      req.body?.newPassword,
      "newPassword",
    );

    const user = await adminService.resetUserPassword(
      req.params.id,
      newPassword,
      adminId,
    );

    sendSuccess(res, user, "Password reset successfully");
  });

  /**
   * Lock or unlock user account
   * PUT /api/admin/users/:id/lock
   */
  lockUserAccount = asyncHandler(async (req: Request, res: Response) => {
    const adminId = getAuthenticatedAdminId(req);
    const lock = parseRequiredBoolean(req.body?.lock, "lock");

    const user = await adminService.lockUserAccount(
      req.params.id,
      lock,
      adminId,
      typeof req.body?.reason === "string" ? req.body.reason.trim() : undefined,
    );

    sendSuccess(
      res,
      user,
      `User account ${lock ? "locked" : "unlocked"} successfully`,
    );
  });

  /**
   * Batch delete users
   * POST /api/admin/users/batch/delete
   */
  batchDeleteUsers = asyncHandler(async (req: Request, res: Response) => {
    const adminId = getAuthenticatedAdminId(req);
    const userIds = parseRequiredStringArray(req.body?.userIds, "userIds");

    const result = await adminService.batchDeleteUsers(userIds, adminId);

    sendSuccess(res, result, "Users deactivated successfully");
  });

  /**
   * Batch update user status
   * POST /api/admin/users/batch/status
   */
  batchUpdateUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const adminId = getAuthenticatedAdminId(req);
    const userIds = parseRequiredStringArray(req.body?.userIds, "userIds");
    const isActive = parseRequiredBoolean(req.body?.isActive, "isActive");

    await adminService.batchUpdateUserStatus(userIds, isActive, adminId);

    sendSuccess(
      res,
      undefined,
      `Users ${isActive ? "activated" : "deactivated"} successfully`,
    );
  });

  /**
   * Get user audit logs
   * GET /api/admin/users/audit-logs
   */
  getUserAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.getUserAuditLogs({
      userId: parseOptionalString(req.query.userId, "userId"),
      adminId: parseOptionalString(req.query.adminId, "adminId"),
      action: parseOptionalString(req.query.action, "action"),
      ...parsePagination(req.query),
    });

    sendSuccess(res, result);
  });

  /**
   * Get settlements aggregated by teacher
   * GET /api/admin/financials/settlements
   */
  getSettlements = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = parseDateRange(req.query);

    const data = await adminService.getSettlements({
      startDate,
      endDate,
      ...parsePagination(req.query),
    });

    sendSuccess(res, data);
  });

  /**
   * Get invoices and bills
   * GET /api/admin/financials/invoices
   */
  getInvoices = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = parseDateRange(req.query);

    const data = await adminService.getInvoices({
      startDate,
      endDate,
      search: parseOptionalString(req.query.search, "search"),
      ...parsePagination(req.query),
    });

    sendSuccess(res, data);
  });

  /**
   * Get revenue analytics
   * GET /api/admin/financials/revenue-analytics
   */
  getRevenueAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = parseDateRange(req.query);

    const data = await adminService.getRevenueAnalytics({
      startDate,
      endDate,
      groupBy: parseRevenueGroupBy(req.query.groupBy),
    });

    sendSuccess(res, data);
  });
}

export default new AdminController();

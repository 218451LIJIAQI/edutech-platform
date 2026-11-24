import { Request, Response } from "express";
import {
  ReportStatus,
  ReportType,
  UserRole,
  VerificationStatus,
} from "@prisma/client";
import adminService from "../services/admin.service";
import {
  deleteAdminCourse,
  getAllAdminCourses,
  getAllAdminVerifications,
  updateAdminCourseStatus,
} from "../services/admin/admin-content-management";
import {
  getAdminFinancials,
  getAdminInvoices,
  getAdminRevenueAnalytics,
  getAdminSettlements,
  getAdminTeacherCommissions,
  updateAdminTeacherCommission,
} from "../services/admin/admin-financials";
import {
  getAdminPlatformStats,
  getAdminRecentActivities,
} from "../services/admin/admin-insights";
import reportService from "../services/report.service";
import teacherService from "../services/teacher.service";
import asyncHandler from "../utils/async-handler";
import { BadRequestError } from "../utils/errors";
import {
  parseDateRange,
  parseNullableNumber,
  parseNullableString,
  parseOptionalBoolean,
  parseOptionalEnum,
  parseOptionalString,
  parseQueryPositiveInt,
  parseRequiredBoolean,
  parseRequiredEnum,
  parseRequiredString,
  parseStringArray,
  requireAuthUserId,
  sendCreated,
  sendSuccess,
} from "../utils/http";

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

const REVENUE_GROUP_BY: readonly RevenueGroupBy[] = [
  "day",
  "week",
  "month",
] as const;
const USER_SORT_FIELDS: readonly AdminUserSortBy[] = [
  "email",
  "firstName",
  "lastName",
  "lastLoginAt",
  "loginCount",
  "createdAt",
  "updatedAt",
] as const;
const SORT_ORDERS: readonly SortOrder[] = ["asc", "desc"] as const;
const REVIEWABLE_VERIFICATION_STATUSES = [
  VerificationStatus.APPROVED,
  VerificationStatus.REJECTED,
] as const;

const parsePagination = (query: Request["query"]) => ({
  page: parseQueryPositiveInt(query.page, "page", { max: 1000 }),
  limit: parseQueryPositiveInt(query.limit, "limit", { max: 100 }),
});

const parseCommissionRate = (value: unknown): number | null => {
  if (value === undefined) {
    throw new BadRequestError("commissionRate must be a valid number or null");
  }
  return parseNullableNumber(value, "commissionRate", { min: 0, max: 100 }) ?? null;
};

class AdminController {
  getPlatformStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await getAdminPlatformStats();
    sendSuccess(res, stats);
  });

  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const { startDate: createdAfter, endDate: createdBefore } = parseDateRange(
      req.query,
      { startKey: "createdAfter", endKey: "createdBefore" },
    );

    const result = await adminService.getAllUsers({
      role: parseOptionalEnum(req.query.role, UserRole, "role"),
      isActive: parseOptionalBoolean(req.query.isActive, "isActive"),
      isLocked: parseOptionalBoolean(req.query.isLocked, "isLocked"),
      search: parseOptionalString(req.query.search),
      sortBy: parseOptionalEnum(req.query.sortBy, USER_SORT_FIELDS, "sortBy"),
      sortOrder: parseOptionalEnum(
        req.query.sortOrder,
        SORT_ORDERS,
        "sortOrder",
      ),
      createdAfter,
      createdBefore,
      ...parsePagination(req.query),
    });

    sendSuccess(res, result);
  });

  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const user = await adminService.getUserById(req.params.id);
    sendSuccess(res, user);
  });

  updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const isActive = parseRequiredBoolean(req.body?.isActive, "isActive");
    const user = await adminService.updateUserStatus(
      req.params.id,
      isActive,
      requireAuthUserId(req),
    );

    sendSuccess(
      res,
      user,
      `User ${isActive ? "activated" : "deactivated"} successfully`,
    );
  });

  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const force =
      parseOptionalBoolean(req.query.force, "force") ??
      parseOptionalBoolean(req.body?.force, "force") ??
      false;

    await adminService.deleteUser(req.params.id, {
      force,
      adminId: requireAuthUserId(req),
    });

    sendSuccess(
      res,
      undefined,
      force
        ? "User permanently deleted successfully"
        : "User deactivated successfully",
    );
  });

  getAllCourses = asyncHandler(async (req: Request, res: Response) => {
    const result = await getAllAdminCourses({
      isPublished: parseOptionalBoolean(req.query.isPublished, "isPublished"),
      category: parseOptionalString(req.query.category),
      search: parseOptionalString(req.query.search),
      ...parsePagination(req.query),
    });
    sendSuccess(res, result);
  });

  updateCourseStatus = asyncHandler(async (req: Request, res: Response) => {
    const isPublished = parseRequiredBoolean(
      req.body?.isPublished,
      "isPublished",
    );
    const course = await updateAdminCourseStatus(req.params.id, isPublished);
    sendSuccess(
      res,
      course,
      `Course ${isPublished ? "published" : "unpublished"} successfully`,
    );
  });

  deleteCourse = asyncHandler(async (req: Request, res: Response) => {
    await deleteAdminCourse(req.params.id);
    sendSuccess(res, undefined, "Course deleted successfully");
  });

  getAllVerifications = asyncHandler(async (req: Request, res: Response) => {
    const result = await getAllAdminVerifications({
      status: parseOptionalEnum(req.query.status, VerificationStatus, "status"),
      ...parsePagination(req.query),
    });
    sendSuccess(res, result);
  });

  reviewVerification = asyncHandler(async (req: Request, res: Response) => {
    const verification = await teacherService.reviewVerification(
      req.params.id,
      requireAuthUserId(req),
      parseRequiredEnum(
        req.body?.status,
        REVIEWABLE_VERIFICATION_STATUSES,
        "status",
        "status must be APPROVED or REJECTED.",
      ),
      parseOptionalString(req.body?.reviewNotes, "reviewNotes", 500),
    );
    sendSuccess(res, verification, "Verification reviewed successfully");
  });

  getAllReports = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query);
    const result = await reportService.getAllReports(
      parseOptionalEnum(req.query.status, ReportStatus, "status"),
      parseOptionalEnum(req.query.type, ReportType, "type"),
      page,
      limit,
    );
    sendSuccess(res, result);
  });

  updateReportStatus = asyncHandler(async (req: Request, res: Response) => {
    const report = await reportService.updateReportStatus(
      req.params.id,
      parseRequiredEnum(req.body?.status, ReportStatus, "status"),
      parseOptionalString(req.body?.resolution, "resolution", 2000),
    );
    sendSuccess(res, report, "Report updated successfully");
  });

  getFinancials = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = parseDateRange(req.query);
    const result = await getAdminFinancials(startDate, endDate);
    sendSuccess(res, result);
  });

  getTeacherCommissions = asyncHandler(async (req: Request, res: Response) => {
    const data = await getAdminTeacherCommissions({
      search: parseOptionalString(req.query.search),
      ...parsePagination(req.query),
    });
    sendSuccess(res, data);
  });

  updateTeacherCommission = asyncHandler(
    async (req: Request, res: Response) => {
      const updated = await updateAdminTeacherCommission(
        req.params.userId,
        requireAuthUserId(req),
        parseCommissionRate(req.body?.commissionRate),
      );
      sendSuccess(res, updated, "Commission updated successfully");
    },
  );

  getRecentActivities = asyncHandler(async (req: Request, res: Response) => {
    const data = await getAdminRecentActivities(parsePagination(req.query));
    sendSuccess(res, data);
  });

  createUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await adminService.createUser({
      email: parseRequiredString(req.body?.email, "email"),
      password: parseRequiredString(req.body?.password, "password", {
        trim: false,
      }),
      firstName: parseRequiredString(req.body?.firstName, "firstName", {
        minLength: 2,
        maxLength: 50,
      }),
      lastName: parseRequiredString(req.body?.lastName, "lastName", {
        minLength: 2,
        maxLength: 50,
      }),
      role:
        parseOptionalEnum(req.body?.role, UserRole, "role") ?? UserRole.STUDENT,
      phone: parseNullableString(req.body?.phone, "phone") ?? undefined,
      address: parseNullableString(req.body?.address, "address") ?? undefined,
      department:
        parseNullableString(req.body?.department, "department") ?? undefined,
      createdBy: requireAuthUserId(req),
    });

    sendCreated(res, user, "User created successfully");
  });

  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await adminService.updateUser(
      req.params.id,
      {
        firstName: parseOptionalString(req.body?.firstName, "firstName", {
          minLength: 2,
          maxLength: 50,
          rejectBlank: true,
          rejectNull: true,
        }),
        lastName: parseOptionalString(req.body?.lastName, "lastName", {
          minLength: 2,
          maxLength: 50,
          rejectBlank: true,
          rejectNull: true,
        }),
        email: parseOptionalString(req.body?.email, "email", {
          rejectBlank: true,
          rejectNull: true,
        }),
        phone: parseNullableString(req.body?.phone, "phone"),
        address: parseNullableString(req.body?.address, "address"),
        department: parseNullableString(req.body?.department, "department"),
        avatar: parseNullableString(req.body?.avatar, "avatar"),
        role: parseOptionalEnum(req.body?.role, UserRole, "role", {
          rejectNull: true,
          rejectBlank: true,
        }),
        isActive: parseOptionalBoolean(req.body?.isActive, "isActive", {
          rejectNull: true,
          rejectBlank: true,
        }),
        isLocked: parseOptionalBoolean(req.body?.isLocked, "isLocked", {
          rejectNull: true,
          rejectBlank: true,
        }),
      },
      requireAuthUserId(req),
    );

    sendSuccess(res, user, "User updated successfully");
  });

  resetUserPassword = asyncHandler(async (req: Request, res: Response) => {
    const user = await adminService.resetUserPassword(
      req.params.id,
      parseRequiredString(req.body?.newPassword, "newPassword", {
        trim: false,
      }),
      requireAuthUserId(req),
    );
    sendSuccess(res, user, "Password reset successfully");
  });

  lockUserAccount = asyncHandler(async (req: Request, res: Response) => {
    const lock = parseRequiredBoolean(req.body?.lock, "lock");
    const user = await adminService.lockUserAccount(
      req.params.id,
      lock,
      requireAuthUserId(req),
      parseOptionalString(req.body?.reason),
    );
    sendSuccess(
      res,
      user,
      `User account ${lock ? "locked" : "unlocked"} successfully`,
    );
  });

  batchDeleteUsers = asyncHandler(async (req: Request, res: Response) => {
    const userIds = parseStringArray(req.body?.userIds, "userIds", {
      required: true,
      dedupe: false,
    }) as string[];
    const result = await adminService.batchDeleteUsers(
      userIds,
      requireAuthUserId(req),
    );
    const message =
      result.failed.length > 0
        ? `Deactivated ${result.affected} user(s); ${result.failed.length} skipped`
        : "Users deactivated successfully";
    sendSuccess(res, result, message);
  });

  batchUpdateUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const userIds = parseStringArray(req.body?.userIds, "userIds", {
      required: true,
      dedupe: false,
    }) as string[];
    const isActive = parseRequiredBoolean(req.body?.isActive, "isActive");
    const result = await adminService.batchUpdateUserStatus(
      userIds,
      isActive,
      requireAuthUserId(req),
    );
    const actionLabel = isActive ? "activated" : "deactivated";
    const message =
      result.failed.length > 0
        ? `${result.affected} user(s) ${actionLabel}; ${result.failed.length} skipped`
        : `Users ${actionLabel} successfully`;
    sendSuccess(res, result, message);
  });

  getUserAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.getUserAuditLogs({
      userId: parseOptionalString(req.query.userId),
      adminId: parseOptionalString(req.query.adminId),
      action: parseOptionalString(req.query.action),
      ...parsePagination(req.query),
    });
    sendSuccess(res, result);
  });

  getSettlements = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = parseDateRange(req.query);
    const data = await getAdminSettlements({
      startDate,
      endDate,
      ...parsePagination(req.query),
    });
    sendSuccess(res, data);
  });

  getInvoices = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = parseDateRange(req.query);
    const data = await getAdminInvoices({
      startDate,
      endDate,
      search: parseOptionalString(req.query.search),
      ...parsePagination(req.query),
    });
    sendSuccess(res, data);
  });

  getRevenueAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = parseDateRange(req.query);
    const data = await getAdminRevenueAnalytics({
      startDate,
      endDate,
      groupBy: parseOptionalEnum(
        req.query.groupBy,
        REVENUE_GROUP_BY,
        "groupBy",
      ),
    });
    sendSuccess(res, data);
  });
}

export default new AdminController();

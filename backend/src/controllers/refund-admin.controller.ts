import { Request, Response } from "express";
import { RefundStatus, UserRole } from "@prisma/client";
import asyncHandler from "../utils/async-handler";
import refundAdminService from "../services/refund-admin.service";
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
} from "../utils/errors";

/**
 * Refund Admin Controller
 * Handles admin refund review, approval, rejection, processing, completion,
 * and refund statistics endpoints.
 */

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_OFFSET = 100000;
const MAX_ADMIN_NOTES_LENGTH = 2000;
const MAX_REJECTION_REASON_LENGTH = 1000;

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
  maxLength: number,
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

  if (parsed.length > maxLength) {
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

const parseRefundId = (req: Request): string => {
  return parseRequiredString(req.params.id, "Refund ID");
};

const parseRefundStatus = (value: unknown): RefundStatus | undefined => {
  const parsed = getFirstQueryValue(value);

  if (!parsed) {
    return undefined;
  }

  if (!Object.values(RefundStatus).includes(parsed as RefundStatus)) {
    throw new BadRequestError(
      `status must be one of: ${Object.values(RefundStatus).join(", ")}`,
    );
  }

  return parsed as RefundStatus;
};

const parseNonNegativeInteger = (
  value: unknown,
  fallback: number,
  fieldName: string,
  max?: number,
): number => {
  const rawValue = getFirstQueryValue(value);

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BadRequestError(`${fieldName} must be a non-negative integer`);
  }

  return max !== undefined ? Math.min(parsed, max) : parsed;
};

const parsePositiveInteger = (
  value: unknown,
  fallback: number,
  fieldName: string,
  max?: number,
): number => {
  const rawValue = getFirstQueryValue(value);

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestError(`${fieldName} must be a positive integer`);
  }

  return max !== undefined ? Math.min(parsed, max) : parsed;
};

class RefundAdminController {
  /**
   * Get all refunds with optional filters.
   * GET /api/admin/refunds
   */
  getAllRefunds = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const status = parseRefundStatus(req.query.status);
    const limit = parsePositiveInteger(
      req.query.limit,
      DEFAULT_LIMIT,
      "limit",
      MAX_LIMIT,
    );
    const offset = parseNonNegativeInteger(
      req.query.offset,
      0,
      "offset",
      MAX_OFFSET,
    );

    const result = await refundAdminService.getAllRefunds(
      status,
      limit,
      offset,
    );

    sendSuccess(res, result);
  });

  /**
   * Get refund by ID.
   * GET /api/admin/refunds/:id
   */
  getRefundById = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const refundId = parseRefundId(req);

    const refund = await refundAdminService.getRefundById(refundId);

    sendSuccess(res, refund);
  });

  /**
   * Approve a refund request.
   * POST /api/admin/refunds/:id/approve
   */
  approveRefund = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const refundId = parseRefundId(req);
    const adminNotes = parseOptionalString(
      req.body?.adminNotes,
      "adminNotes",
      MAX_ADMIN_NOTES_LENGTH,
    );

    const refund = await refundAdminService.approveRefund(refundId, adminNotes);

    sendSuccess(res, refund, "Refund approved successfully");
  });

  /**
   * Reject a refund request.
   * POST /api/admin/refunds/:id/reject
   */
  rejectRefund = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const refundId = parseRefundId(req);
    const rejectionReason = parseRequiredLimitedString(
      req.body?.rejectionReason,
      "rejectionReason",
      MAX_REJECTION_REASON_LENGTH,
    );

    const refund = await refundAdminService.rejectRefund(
      refundId,
      rejectionReason,
    );

    sendSuccess(res, refund, "Refund rejected successfully");
  });

  /**
   * Mark a refund as processing.
   * POST /api/admin/refunds/:id/processing
   */
  markAsProcessing = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const refundId = parseRefundId(req);
    const adminNotes = parseOptionalString(
      req.body?.adminNotes,
      "adminNotes",
      MAX_ADMIN_NOTES_LENGTH,
    );

    const refund = await refundAdminService.markAsProcessing(
      refundId,
      adminNotes,
    );

    sendSuccess(res, refund, "Refund marked as processing successfully");
  });

  /**
   * Complete a refund.
   * POST /api/admin/refunds/:id/complete
   */
  completeRefund = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const refundId = parseRefundId(req);
    const adminNotes = parseOptionalString(
      req.body?.adminNotes,
      "adminNotes",
      MAX_ADMIN_NOTES_LENGTH,
    );

    const refund = await refundAdminService.completeRefund(
      refundId,
      adminNotes,
    );

    sendSuccess(res, refund, "Refund completed successfully");
  });

  /**
   * Get refund statistics.
   * GET /api/admin/refunds/stats
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const stats = await refundAdminService.getRefundStats();

    sendSuccess(res, stats);
  });
}

export default new RefundAdminController();

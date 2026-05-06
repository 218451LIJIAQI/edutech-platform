import { Request, Response } from "express";
import {
  SupportTicketPriority,
  SupportTicketStatus,
  UserRole,
} from "@prisma/client";
import asyncHandler from "../utils/async-handler";
import supportAdminService from "../services/support-admin.service";
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
} from "../utils/errors";

/**
 * Support Admin Controller
 * Handles admin support ticket management endpoints.
 */

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_OFFSET = 100000;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_RESOLUTION_LENGTH = 3000;
const MAX_ATTACHMENT_LENGTH = 1000;

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
    const parsed = value.trim();
    return parsed.length > 0 ? parsed : undefined;
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

const parseTicketId = (req: Request): string => {
  return parseRequiredString(req.params.id, "Ticket ID");
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

class SupportAdminController {
  /**
   * Get all support tickets with optional filters.
   * GET /api/admin/support/tickets
   */
  getAllTickets = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const status = parseOptionalQueryEnum(
      req.query.status,
      SupportTicketStatus,
      "status",
    );
    const priority = parseOptionalQueryEnum(
      req.query.priority,
      SupportTicketPriority,
      "priority",
    );
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

    const result = await supportAdminService.getAllTickets(
      status,
      priority,
      limit,
      offset,
    );

    sendSuccess(res, result);
  });

  /**
   * Get support ticket by ID.
   * GET /api/admin/support/tickets/:id
   */
  getTicketById = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const ticketId = parseTicketId(req);

    const ticket = await supportAdminService.getTicketById(ticketId);

    sendSuccess(res, ticket);
  });

  /**
   * Assign ticket to the current admin.
   * POST /api/admin/support/tickets/:id/assign
   */
  assignTicket = asyncHandler(async (req: Request, res: Response) => {
    const adminId = requireAdmin(req);
    const ticketId = parseTicketId(req);

    const ticket = await supportAdminService.assignTicket(ticketId, adminId);

    sendSuccess(res, ticket, "Ticket assigned successfully");
  });

  /**
   * Add admin response to ticket.
   * POST /api/admin/support/tickets/:id/responses
   */
  addResponse = asyncHandler(async (req: Request, res: Response) => {
    const adminId = requireAdmin(req);
    const ticketId = parseTicketId(req);
    const message = parseRequiredLimitedString(
      req.body?.message,
      "message",
      MAX_MESSAGE_LENGTH,
    );
    const attachment = parseOptionalString(
      req.body?.attachment,
      "attachment",
      MAX_ATTACHMENT_LENGTH,
    );

    const responseMessage = await supportAdminService.addAdminResponse(
      ticketId,
      adminId,
      message,
      attachment,
    );

    sendSuccess(res, responseMessage, "Response added successfully", 201);
  });

  /**
   * Resolve support ticket.
   * POST /api/admin/support/tickets/:id/resolve
   */
  resolveTicket = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const ticketId = parseTicketId(req);
    const resolution = parseRequiredLimitedString(
      req.body?.resolution,
      "resolution",
      MAX_RESOLUTION_LENGTH,
    );

    const ticket = await supportAdminService.resolveTicket(
      ticketId,
      resolution,
    );

    sendSuccess(res, ticket, "Ticket resolved successfully");
  });

  /**
   * Close support ticket.
   * POST /api/admin/support/tickets/:id/close
   */
  closeTicket = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const ticketId = parseTicketId(req);

    const ticket = await supportAdminService.closeTicket(ticketId);

    sendSuccess(res, ticket, "Ticket closed successfully");
  });

  /**
   * Get support ticket statistics.
   * GET /api/admin/support/tickets/stats
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const stats = await supportAdminService.getTicketStats();

    sendSuccess(res, stats);
  });
}

export default new SupportAdminController();

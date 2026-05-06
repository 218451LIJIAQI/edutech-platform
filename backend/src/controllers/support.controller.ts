import { Request, Response } from "express";
import {
  SupportTicketPriority,
  SupportTicketStatus,
  UserRole,
} from "@prisma/client";
import asyncHandler from "../utils/async-handler";
import supportService from "../services/support.service";
import { AuthenticationError, BadRequestError } from "../utils/errors";
import { applyProtectedAssetHeaders } from "../utils/protected-asset";

/**
 * Support Controller
 * Handles user-facing support ticket endpoints.
 */

const MAX_SUBJECT_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_CATEGORY_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_RESOLUTION_LENGTH = 3000;
const MAX_ATTACHMENT_LENGTH = 1000;
const MAX_QUERY_LIMIT = 100;

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

const getAuthenticatedUser = (req: Request): { id: string; role: UserRole } => {
  if (!req.user) {
    throw new AuthenticationError("Authentication required");
  }

  return {
    id: req.user.id,
    role: req.user.role,
  };
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

const parseOptionalPriority = (
  value: unknown,
): SupportTicketPriority | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = parseRequiredString(value, "priority");

  if (
    !Object.values(SupportTicketPriority).includes(
      parsed as SupportTicketPriority,
    )
  ) {
    throw new BadRequestError(
      `priority must be one of: ${Object.values(SupportTicketPriority).join(", ")}`,
    );
  }

  return parsed as SupportTicketPriority;
};

const parseOptionalStatus = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = parseRequiredString(value, "status");

  if (
    !Object.values(SupportTicketStatus).includes(parsed as SupportTicketStatus)
  ) {
    throw new BadRequestError(
      `status must be one of: ${Object.values(SupportTicketStatus).join(", ")}`,
    );
  }

  return parsed as SupportTicketStatus;
};

const parseOptionalPositiveInteger = (
  value: unknown,
  fieldName: string,
  max = MAX_QUERY_LIMIT,
): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestError(`${fieldName} must be a positive integer`);
  }

  return Math.min(parsed, max);
};

const parseTicketId = (req: Request): string => {
  return parseRequiredString(req.params.id, "Ticket ID");
};

class SupportController {
  /**
   * Create a new support ticket.
   * POST /api/support/tickets
   */
  createTicket = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);

    const subject = parseRequiredLimitedString(
      req.body?.subject,
      "subject",
      MAX_SUBJECT_LENGTH,
    );
    const description = parseRequiredLimitedString(
      req.body?.description,
      "description",
      MAX_DESCRIPTION_LENGTH,
    );
    const category = parseRequiredLimitedString(
      req.body?.category,
      "category",
      MAX_CATEGORY_LENGTH,
    );
    const orderId = parseOptionalString(req.body?.orderId, "orderId");
    const priority = parseOptionalPriority(req.body?.priority);
    const attachment = parseOptionalString(
      req.body?.attachment,
      "attachment",
      MAX_ATTACHMENT_LENGTH,
    );

    const ticket = await supportService.createTicket(
      userId,
      subject,
      description,
      category,
      orderId,
      priority,
      attachment,
    );

    sendSuccess(res, ticket, "Support ticket created successfully", 201);
  });

  /**
   * View a support message attachment through a protected access path.
   * GET /api/support/messages/:messageId/attachment
   */
  getMessageAttachment = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthenticatedUser(req);
    const messageId = parseRequiredString(req.params.messageId, "Message ID");

    const asset = await supportService.getMessageAttachmentAsset(
      user.id,
      user.role,
      messageId,
    );

    if (asset.redirectUrl) {
      applyProtectedAssetHeaders(res);
      return res.redirect(asset.redirectUrl);
    }

    if (!asset.absolutePath) {
      throw new BadRequestError("Support attachment is unavailable");
    }

    applyProtectedAssetHeaders(res, {
      disposition: "inline",
      filename: asset.filename,
    });

    return res.sendFile(asset.absolutePath);
  });

  /**
   * Get all support tickets for the current user.
   * GET /api/support/tickets
   */
  getUserTickets = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);

    const tickets = await supportService.getUserTickets(userId, {
      page: parseOptionalPositiveInteger(req.query.page, "page"),
      limit: parseOptionalPositiveInteger(req.query.limit, "limit"),
      status: parseOptionalStatus(req.query.status),
    });

    sendSuccess(res, tickets);
  });

  /**
   * Get a specific support ticket by ID.
   * GET /api/support/tickets/:id
   */
  getTicketById = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);
    const ticketId = parseTicketId(req);

    const ticket = await supportService.getTicketById(userId, ticketId);

    sendSuccess(res, ticket);
  });

  /**
   * Add a message to a support ticket.
   * POST /api/support/tickets/:id/messages
   */
  addMessage = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);
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

    const responseMessage = await supportService.addMessage(
      userId,
      ticketId,
      message,
      attachment,
    );

    sendSuccess(res, responseMessage, "Message added successfully", 201);
  });

  /**
   * Close a support ticket.
   * POST /api/support/tickets/:id/close
   */
  closeTicket = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);
    const ticketId = parseTicketId(req);
    const resolution = parseOptionalString(
      req.body?.resolution,
      "resolution",
      MAX_RESOLUTION_LENGTH,
    );

    const ticket = await supportService.closeTicket(
      userId,
      ticketId,
      resolution,
    );

    sendSuccess(res, ticket, "Support ticket closed successfully");
  });

  /**
   * Get support tickets for a specific order.
   * GET /api/support/orders/:orderId/tickets
   */
  getTicketsByOrderId = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);
    const orderId = parseRequiredString(req.params.orderId, "Order ID");

    const tickets = await supportService.getTicketsByOrderId(userId, orderId);

    sendSuccess(res, tickets);
  });

  /**
   * Get support statistics for the current user.
   * GET /api/support/stats
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);

    const stats = await supportService.getStats(userId);

    sendSuccess(res, stats);
  });
}

export default new SupportController();

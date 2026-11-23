import { Request, Response } from "express";
import { SupportTicketPriority, SupportTicketStatus } from "@prisma/client";
import asyncHandler from "../utils/async-handler";
import supportService from "../services/support.service";
import { sendProtectedAsset } from "../utils/protected-asset";
import {
  parseOptionalEnum,
  parseOptionalString,
  parseQueryPositiveInt,
  parseRequiredParam,
  parseRequiredString,
  requireAuthUser,
  requireAuthUserId,
  sendCreated,
  sendSuccess,
} from "../utils/http";

const MAX_SUBJECT_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_CATEGORY_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_RESOLUTION_LENGTH = 3000;
const MAX_ATTACHMENT_LENGTH = 1000;
const MAX_QUERY_LIMIT = 100;

class SupportController {
  createTicket = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await supportService.createTicket(
      requireAuthUserId(req),
      parseRequiredString(req.body?.subject, "subject", {
        maxLength: MAX_SUBJECT_LENGTH,
      }),
      parseRequiredString(req.body?.description, "description", {
        maxLength: MAX_DESCRIPTION_LENGTH,
      }),
      parseRequiredString(req.body?.category, "category", {
        maxLength: MAX_CATEGORY_LENGTH,
      }),
      parseOptionalString(req.body?.orderId, "orderId"),
      parseOptionalEnum(
        req.body?.priority,
        SupportTicketPriority,
        "priority",
      ),
      parseOptionalString(
        req.body?.attachment,
        "attachment",
        MAX_ATTACHMENT_LENGTH,
      ),
    );
    sendCreated(res, ticket, "Support ticket created successfully");
  });

  getMessageAttachment = asyncHandler(async (req: Request, res: Response) => {
    const user = requireAuthUser(req);
    const asset = await supportService.getMessageAttachmentAsset(
      user.id,
      user.role,
      parseRequiredParam(req.params.messageId, "Message ID"),
    );

    sendProtectedAsset(res, asset, {
      disposition: "inline",
      unavailableMessage: "Support attachment is unavailable",
    });
  });

  getUserTickets = asyncHandler(async (req: Request, res: Response) => {
    const tickets = await supportService.getUserTickets(requireAuthUserId(req), {
      page: parseQueryPositiveInt(req.query.page, "page", {
        max: MAX_QUERY_LIMIT,
      }),
      limit: parseQueryPositiveInt(req.query.limit, "limit", {
        max: MAX_QUERY_LIMIT,
      }),
      status: parseOptionalEnum(
        req.query.status,
        SupportTicketStatus,
        "status",
      ),
    });
    sendSuccess(res, tickets);
  });

  getTicketById = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await supportService.getTicketById(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Ticket ID"),
    );
    sendSuccess(res, ticket);
  });

  addMessage = asyncHandler(async (req: Request, res: Response) => {
    const responseMessage = await supportService.addMessage(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Ticket ID"),
      parseRequiredString(req.body?.message, "message", {
        maxLength: MAX_MESSAGE_LENGTH,
      }),
      parseOptionalString(
        req.body?.attachment,
        "attachment",
        MAX_ATTACHMENT_LENGTH,
      ),
    );
    sendCreated(res, responseMessage, "Message added successfully");
  });

  closeTicket = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await supportService.closeTicket(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Ticket ID"),
      parseOptionalString(
        req.body?.resolution,
        "resolution",
        MAX_RESOLUTION_LENGTH,
      ),
    );
    sendSuccess(res, ticket, "Support ticket closed successfully");
  });

  getTicketsByOrderId = asyncHandler(async (req: Request, res: Response) => {
    const tickets = await supportService.getTicketsByOrderId(
      requireAuthUserId(req),
      parseRequiredParam(req.params.orderId, "Order ID"),
    );
    sendSuccess(res, tickets);
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await supportService.getStats(requireAuthUserId(req));
    sendSuccess(res, stats);
  });
}

export default new SupportController();

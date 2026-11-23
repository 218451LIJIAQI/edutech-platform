import { Request, Response } from "express";
import { SupportTicketPriority, SupportTicketStatus } from "@prisma/client";
import asyncHandler from "../utils/async-handler";
import supportAdminService from "../services/support-admin.service";
import {
  parseOptionalEnum,
  parseOptionalString,
  parseQueryNonNegativeInt,
  parseQueryPositiveInt,
  parseRequiredParam,
  parseRequiredString,
  requireAdminUser,
  requireAdminUserId,
  sendCreated,
  sendSuccess,
} from "../utils/http";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_OFFSET = 100000;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_RESOLUTION_LENGTH = 3000;
const MAX_ATTACHMENT_LENGTH = 1000;

class SupportAdminController {
  getAllTickets = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const result = await supportAdminService.getAllTickets(
      parseOptionalEnum(req.query.status, SupportTicketStatus, "status"),
      parseOptionalEnum(req.query.priority, SupportTicketPriority, "priority"),
      parseQueryPositiveInt(req.query.limit, "limit", {
        fallback: DEFAULT_LIMIT,
        max: MAX_LIMIT,
      }) as number,
      parseQueryNonNegativeInt(req.query.offset, "offset", {
        fallback: 0,
        max: MAX_OFFSET,
      }) as number,
    );
    sendSuccess(res, result);
  });

  getTicketById = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const ticket = await supportAdminService.getTicketById(
      parseRequiredParam(req.params.id, "Ticket ID"),
    );
    sendSuccess(res, ticket);
  });

  assignTicket = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await supportAdminService.assignTicket(
      parseRequiredParam(req.params.id, "Ticket ID"),
      requireAdminUserId(req),
    );
    sendSuccess(res, ticket, "Ticket assigned successfully");
  });

  addResponse = asyncHandler(async (req: Request, res: Response) => {
    const responseMessage = await supportAdminService.addAdminResponse(
      parseRequiredParam(req.params.id, "Ticket ID"),
      requireAdminUserId(req),
      parseRequiredString(req.body?.message, "message", {
        maxLength: MAX_MESSAGE_LENGTH,
      }),
      parseOptionalString(
        req.body?.attachment,
        "attachment",
        MAX_ATTACHMENT_LENGTH,
      ),
    );
    sendCreated(res, responseMessage, "Response added successfully");
  });

  resolveTicket = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const ticket = await supportAdminService.resolveTicket(
      parseRequiredParam(req.params.id, "Ticket ID"),
      parseRequiredString(req.body?.resolution, "resolution", {
        maxLength: MAX_RESOLUTION_LENGTH,
      }),
    );
    sendSuccess(res, ticket, "Ticket resolved successfully");
  });

  closeTicket = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const ticket = await supportAdminService.closeTicket(
      parseRequiredParam(req.params.id, "Ticket ID"),
    );
    sendSuccess(res, ticket, "Ticket closed successfully");
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const stats = await supportAdminService.getTicketStats();
    sendSuccess(res, stats);
  });
}

export default new SupportAdminController();

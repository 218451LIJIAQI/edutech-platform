import { Request, Response } from "express";
import { RefundStatus } from "@prisma/client";
import asyncHandler from "../utils/async-handler";
import refundAdminService from "../services/refund-admin.service";
import {
  parseOptionalEnum,
  parseOptionalString,
  parseQueryNonNegativeInt,
  parseQueryPositiveInt,
  parseRequiredParam,
  parseRequiredString,
  requireAdminUser,
  sendSuccess,
} from "../utils/http";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_OFFSET = 100000;
const MAX_ADMIN_NOTES_LENGTH = 2000;
const MAX_REJECTION_REASON_LENGTH = 1000;

class RefundAdminController {
  getAllRefunds = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const result = await refundAdminService.getAllRefunds(
      parseOptionalEnum(req.query.status, RefundStatus, "status"),
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

  getRefundById = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const refund = await refundAdminService.getRefundById(
      parseRequiredParam(req.params.id, "Refund ID"),
    );
    sendSuccess(res, refund);
  });

  approveRefund = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const refund = await refundAdminService.approveRefund(
      parseRequiredParam(req.params.id, "Refund ID"),
      parseOptionalString(
        req.body?.adminNotes,
        "adminNotes",
        MAX_ADMIN_NOTES_LENGTH,
      ),
    );
    sendSuccess(res, refund, "Refund approved successfully");
  });

  rejectRefund = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const refund = await refundAdminService.rejectRefund(
      parseRequiredParam(req.params.id, "Refund ID"),
      parseRequiredString(req.body?.rejectionReason, "rejectionReason", {
        maxLength: MAX_REJECTION_REASON_LENGTH,
      }),
    );
    sendSuccess(res, refund, "Refund rejected successfully");
  });

  markAsProcessing = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const refund = await refundAdminService.markAsProcessing(
      parseRequiredParam(req.params.id, "Refund ID"),
      parseOptionalString(
        req.body?.adminNotes,
        "adminNotes",
        MAX_ADMIN_NOTES_LENGTH,
      ),
    );
    sendSuccess(res, refund, "Refund marked as processing successfully");
  });

  completeRefund = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const refund = await refundAdminService.completeRefund(
      parseRequiredParam(req.params.id, "Refund ID"),
      parseOptionalString(
        req.body?.adminNotes,
        "adminNotes",
        MAX_ADMIN_NOTES_LENGTH,
      ),
    );
    sendSuccess(res, refund, "Refund completed successfully");
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const stats = await refundAdminService.getRefundStats();
    sendSuccess(res, stats);
  });
}

export default new RefundAdminController();

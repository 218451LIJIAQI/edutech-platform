import { Request, Response } from "express";
import { RefundMethod } from "@prisma/client";
import asyncHandler from "../utils/async-handler";
import ordersService from "../services/orders.service";
import { BadRequestError } from "../utils/errors";
import {
  parseOptionalEnum,
  parseOptionalString,
  parsePositiveAmount,
  parseRequiredParam,
  requireAuthUserId,
  sendCreated,
  sendSuccess,
} from "../utils/http";

const MAX_REASON_LENGTH = 1000;
const MAX_NOTES_LENGTH = 2000;

class OrdersController {
  getMyOrders = asyncHandler(async (req: Request, res: Response) => {
    const orders = await ordersService.getMyOrders(requireAuthUserId(req));
    sendSuccess(res, orders);
  });

  getOrderById = asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersService.getOrderById(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Order ID"),
    );
    sendSuccess(res, order);
  });

  cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersService.cancelOrder(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Order ID"),
      parseOptionalString(req.body?.reason, "reason", MAX_REASON_LENGTH),
    );
    sendSuccess(res, order, "Order cancelled successfully");
  });

  requestRefund = asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuthUserId(req);
    const orderId = parseRequiredParam(req.params.id, "Order ID");
    const amount = parsePositiveAmount(req.body?.amount, "Refund amount", {
      roundCents: true,
    });
    const refundMethod = parseOptionalEnum(
      req.body?.refundMethod,
      RefundMethod,
      "refundMethod",
    );
    const bankDetails = parseOptionalString(
      req.body?.bankDetails,
      "bankDetails",
      MAX_NOTES_LENGTH,
    );

    if (refundMethod === RefundMethod.BANK_TRANSFER && !bankDetails) {
      throw new BadRequestError(
        "bankDetails is required when refundMethod is BANK_TRANSFER",
      );
    }

    const refund = await ordersService.requestRefund(
      userId,
      orderId,
      amount,
      parseOptionalString(req.body?.reason, "reason", MAX_REASON_LENGTH),
      parseOptionalString(req.body?.reasonCategory, "reasonCategory", 100),
      refundMethod,
      bankDetails,
      parseOptionalString(req.body?.notes, "notes", MAX_NOTES_LENGTH),
    );

    sendCreated(res, refund, "Refund requested successfully");
  });

  getRefundByOrderId = asyncHandler(async (req: Request, res: Response) => {
    const refund = await ordersService.getRefundByOrderId(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Order ID"),
    );
    sendSuccess(res, refund);
  });

  getRefundsByOrderId = asyncHandler(async (req: Request, res: Response) => {
    const refunds = await ordersService.getRefundsByOrderId(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Order ID"),
    );
    sendSuccess(res, refunds);
  });

  getUserRefunds = asyncHandler(async (req: Request, res: Response) => {
    const refunds = await ordersService.getUserRefunds(requireAuthUserId(req));
    sendSuccess(res, refunds);
  });
}

export default new OrdersController();

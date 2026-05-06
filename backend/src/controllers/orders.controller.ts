import { Request, Response } from "express";
import { RefundMethod } from "@prisma/client";
import asyncHandler from "../utils/async-handler";
import ordersService from "../services/orders.service";
import { AuthenticationError, BadRequestError } from "../utils/errors";

/**
 * Orders Controller
 * Handles HTTP requests for order and refund-related endpoints.
 */

const MAX_REASON_LENGTH = 1000;
const MAX_NOTES_LENGTH = 2000;

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

const parseOrderId = (req: Request): string => {
  return parseRequiredString(req.params.id, "Order ID");
};

const parsePositiveAmount = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new BadRequestError("Refund amount must be a positive number");
  }

  // Keep two decimal places for financial values before passing to the service.
  return Math.round(parsed * 100) / 100;
};

const parseRefundMethod = (value: unknown): RefundMethod | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = parseRequiredString(value, "refundMethod");

  if (!Object.values(RefundMethod).includes(parsed as RefundMethod)) {
    throw new BadRequestError(
      `refundMethod must be one of: ${Object.values(RefundMethod).join(", ")}`,
    );
  }

  return parsed as RefundMethod;
};

class OrdersController {
  /**
   * Get all orders for the current user.
   * GET /api/orders/my
   */
  getMyOrders = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const orders = await ordersService.getMyOrders(userId);

    sendSuccess(res, orders);
  });

  /**
   * Get a specific order by ID owned by the current user.
   * GET /api/orders/:id
   */
  getOrderById = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const orderId = parseOrderId(req);

    const order = await ordersService.getOrderById(userId, orderId);

    sendSuccess(res, order);
  });

  /**
   * Cancel an order if it is eligible.
   * POST /api/orders/:id/cancel
   */
  cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const orderId = parseOrderId(req);
    const reason = parseOptionalString(
      req.body?.reason,
      "reason",
      MAX_REASON_LENGTH,
    );

    const order = await ordersService.cancelOrder(userId, orderId, reason);

    sendSuccess(res, order, "Order cancelled successfully");
  });

  /**
   * Request a refund for an order.
   * POST /api/orders/:id/refund-request
   */
  requestRefund = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const orderId = parseOrderId(req);

    const amount = parsePositiveAmount(req.body?.amount);
    const refundMethod = parseRefundMethod(req.body?.refundMethod);
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

    sendSuccess(res, refund, "Refund requested successfully", 201);
  });

  /**
   * Get latest refund details for an order.
   * GET /api/orders/:id/refund
   */
  getRefundByOrderId = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const orderId = parseOrderId(req);

    const refund = await ordersService.getRefundByOrderId(userId, orderId);

    sendSuccess(res, refund);
  });

  /**
   * Get all refund records for an order.
   * GET /api/orders/:id/refunds
   */
  getRefundsByOrderId = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const orderId = parseOrderId(req);

    const refunds = await ordersService.getRefundsByOrderId(userId, orderId);

    sendSuccess(res, refunds);
  });

  /**
   * Get all refunds for the current user.
   * GET /api/orders/refunds
   */
  getUserRefunds = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const refunds = await ordersService.getUserRefunds(userId);

    sendSuccess(res, refunds);
  });
}

export default new OrdersController();

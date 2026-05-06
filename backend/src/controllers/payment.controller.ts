import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import paymentService from "../services/payment.service";
import asyncHandler from "../utils/async-handler";
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
} from "../utils/errors";

/**
 * Payment Controller
 * Handles HTTP requests for payment-related endpoints.
 */

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

const requireAdmin = (req: Request): string => {
  if (!req.user) {
    throw new AuthenticationError("Authentication required");
  }

  if (req.user.role !== UserRole.ADMIN) {
    throw new AuthorizationError("Admin access required");
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

class PaymentController {
  /**
   * Create payment intent for a single lesson package.
   * POST /api/payments/create-intent
   */
  createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const packageId = parseRequiredString(req.body?.packageId, "Package ID");

    const result = await paymentService.createPaymentIntent(userId, packageId);

    sendSuccess(res, result, "Payment created successfully", 201);
  });

  /**
   * Create payment intent for the current user's cart.
   * POST /api/payments/cart/create-intent
   */
  createCartPaymentIntent = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = getAuthenticatedUserId(req);

      const result = await paymentService.createCartPaymentIntent(userId);

      sendSuccess(res, result, "Cart payment created successfully", 201);
    },
  );

  /**
   * Confirm payment.
   * POST /api/payments/confirm
   */
  confirmPayment = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const paymentId = parseRequiredString(req.body?.paymentId, "Payment ID");

    const result = await paymentService.confirmPayment(paymentId, userId);

    sendSuccess(res, result, "Payment confirmed successfully");
  });

  /**
   * Get current user's payment history.
   * GET /api/payments/my-payments
   */
  getMyPayments = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const payments = await paymentService.getUserPayments(userId);

    sendSuccess(res, payments);
  });

  /**
   * Get payment by ID.
   * GET /api/payments/:id
   */
  getPaymentById = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const paymentId = parseRequiredString(req.params.id, "Payment ID");

    const payment = await paymentService.getPaymentById(paymentId, userId);

    sendSuccess(res, payment);
  });

  /**
   * Get teacher's total earnings.
   * GET /api/payments/teacher/earnings
   */
  getTeacherEarnings = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const result = await paymentService.getTeacherEarnings(userId);

    sendSuccess(res, result);
  });

  /**
   * Get teacher's earnings grouped by course.
   * GET /api/payments/teacher/earnings-by-course
   */
  getTeacherEarningsByCourse = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = getAuthenticatedUserId(req);

      const result = await paymentService.getTeacherEarningsByCourse(userId);

      sendSuccess(res, result);
    },
  );

  /**
   * Process a payment refund.
   * Admin-only endpoint.
   * POST /api/payments/:id/refund
   */
  requestRefund = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const paymentId = parseRequiredString(req.params.id, "Payment ID");

    const payment = await paymentService.requestRefund(paymentId);

    sendSuccess(res, payment, "Refund processed successfully");
  });
}

export default new PaymentController();

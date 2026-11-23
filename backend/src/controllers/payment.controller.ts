import { Request, Response } from "express";
import paymentService from "../services/payment.service";
import asyncHandler from "../utils/async-handler";
import {
  parseRequiredParam,
  parseRequiredString,
  requireAdminUser,
  requireAuthUserId,
  sendCreated,
  sendSuccess,
} from "../utils/http";

class PaymentController {
  createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentService.createPaymentIntent(
      requireAuthUserId(req),
      parseRequiredString(req.body?.packageId, "Package ID"),
    );
    sendCreated(res, result, "Payment created successfully");
  });

  createCartPaymentIntent = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await paymentService.createCartPaymentIntent(
        requireAuthUserId(req),
      );
      sendCreated(res, result, "Cart payment created successfully");
    },
  );

  confirmPayment = asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentService.confirmPayment(
      parseRequiredString(req.body?.paymentId, "Payment ID"),
      requireAuthUserId(req),
    );
    sendSuccess(res, result, "Payment confirmed successfully");
  });

  getMyPayments = asyncHandler(async (req: Request, res: Response) => {
    const payments = await paymentService.getUserPayments(
      requireAuthUserId(req),
    );
    sendSuccess(res, payments);
  });

  getPaymentById = asyncHandler(async (req: Request, res: Response) => {
    const payment = await paymentService.getPaymentById(
      parseRequiredParam(req.params.id, "Payment ID"),
      requireAuthUserId(req),
    );
    sendSuccess(res, payment);
  });

  getTeacherEarnings = asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentService.getTeacherEarnings(
      requireAuthUserId(req),
    );
    sendSuccess(res, result);
  });

  getTeacherEarningsByCourse = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await paymentService.getTeacherEarningsByCourse(
        requireAuthUserId(req),
      );
      sendSuccess(res, result);
    },
  );

  requestRefund = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const payment = await paymentService.requestRefund(
      parseRequiredParam(req.params.id, "Payment ID"),
    );
    sendSuccess(res, payment, "Refund processed successfully");
  });
}

export default new PaymentController();

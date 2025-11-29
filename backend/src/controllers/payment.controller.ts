import { Request, Response } from 'express';
import paymentService from '../services/payment.service';
import asyncHandler from '../utils/asyncHandler';
import { BadRequestError } from '../utils/errors';

/**
 * Payment Controller
 * Handles HTTP requests for payment-related endpoints
 */
class PaymentController {
  /**
   * Create payment intent
   * POST /api/payments/create-intent
   */
  createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { packageId } = req.body as { packageId?: string };

    if (!packageId || typeof packageId !== 'string' || !packageId.trim()) {
      throw new BadRequestError('Package ID is required');
    }

    const result = await paymentService.createPaymentIntent(userId, packageId.trim());

    res.status(201).json({
      status: 'success',
      message: 'Payment intent created successfully',
      data: result,
    });
  });

  /**
   * Create cart payment intent
   * POST /api/payments/cart/create-intent
   */
  createCartPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const result = await paymentService.createCartPaymentIntent(userId);

    res.status(201).json({
      status: 'success',
      message: 'Cart payment intent created successfully',
      data: result,
    });
  });

  /**
   * Confirm payment
   * POST /api/payments/confirm
   */
  confirmPayment = asyncHandler(async (req: Request, res: Response) => {
    const { paymentId, stripePaymentId } = req.body as { paymentId?: string; stripePaymentId?: string };

    if (!paymentId || typeof paymentId !== 'string' || !paymentId.trim()) {
      throw new BadRequestError('Payment ID is required');
    }

    const result = await paymentService.confirmPayment(
      paymentId.trim(),
      stripePaymentId && typeof stripePaymentId === 'string' ? stripePaymentId.trim() : undefined
    );

    res.status(200).json({
      status: 'success',
      message: 'Payment confirmed successfully',
      data: result,
    });
  });

  /**
   * Get user's payment history
   * GET /api/payments/my-payments
   */
  getMyPayments = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;

    const payments = await paymentService.getUserPayments(userId);

    res.status(200).json({
      status: 'success',
      data: payments,
    });
  });

  /**
   * Get payment by ID
   * GET /api/payments/:id
   */
  getPaymentById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params as { id?: string };

    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Payment ID is required');
    }

    const payment = await paymentService.getPaymentById(id.trim(), userId);

    res.status(200).json({
      status: 'success',
      data: payment,
    });
  });

  /**
   * Get teacher's earnings
   * GET /api/payments/teacher/earnings
   */
  getTeacherEarnings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;

    const result = await paymentService.getTeacherEarnings(userId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Get teacher's earnings grouped by course
   * GET /api/payments/teacher/earnings-by-course
   */
  getTeacherEarningsByCourse = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;

    const result = await paymentService.getTeacherEarningsByCourse(userId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Request refund (Admin only)
   * POST /api/payments/:id/refund
   */
  requestRefund = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };

    const payment = await paymentService.requestRefund(id);

    res.status(200).json({
      status: 'success',
      message: 'Refund processed successfully',
      data: payment,
    });
  });
}

export default new PaymentController();

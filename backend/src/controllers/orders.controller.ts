import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import ordersService from '../services/orders.service';

class OrdersController {
  /**
   * Get all orders for the current user
   * GET /api/orders/my
   */
  getMyOrders = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const orders = await ordersService.getMyOrders(userId);
    res.status(200).json({ status: 'success', data: orders });
  });

  /**
   * Get a specific order by ID (owned by current user)
   * GET /api/orders/:id
   */
  getOrderById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const orderId = typeof id === 'string' ? id.trim() : String(id);

    const order = await ordersService.getOrderById(userId, orderId);
    res.status(200).json({ status: 'success', data: order });
  });

  /**
   * Cancel an order (if eligible)
   * POST /api/orders/:id/cancel
   */
  cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const orderId = typeof id === 'string' ? id.trim() : String(id);

    const { reason } = (req.body || {}) as { reason?: string };
    const normalizedReason = typeof reason === 'string' ? reason.trim() : undefined;

    const order = await ordersService.cancelOrder(userId, orderId, normalizedReason);
    res
      .status(200)
      .json({ status: 'success', message: 'Order cancelled', data: order });
  });

  /**
   * Request a refund for an order
   * POST /api/orders/:id/refunds
   */
  requestRefund = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const orderId = typeof id === 'string' ? id.trim() : String(id);

    const {
      amount,
      reason,
      reasonCategory,
      refundMethod,
      bankDetails,
      notes,
    } = (req.body || {}) as {
      amount: number | string;
      reason?: string;
      reasonCategory?: string;
      refundMethod?: string;
      bankDetails?: string;
      notes?: string;
    };

    const normalizedAmount =
      typeof amount === 'number' ? amount : amount != null ? Number(amount) : NaN;

    const refund = await ordersService.requestRefund(
      userId,
      orderId,
      normalizedAmount,
      typeof reason === 'string' ? reason.trim() : reason,
      typeof reasonCategory === 'string' ? reasonCategory.trim() : reasonCategory,
      typeof refundMethod === 'string' ? refundMethod.trim() : refundMethod,
      typeof bankDetails === 'string' ? bankDetails.trim() : bankDetails,
      typeof notes === 'string' ? notes.trim() : notes
    );

    res.status(201).json({
      status: 'success',
      message: 'Refund requested',
      data: refund,
    });
  });

  /**
   * Get refund details for an order
   * GET /api/orders/:id/refunds
   */
  getRefundByOrderId = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const orderId = typeof id === 'string' ? id.trim() : String(id);

    const refund = await ordersService.getRefundByOrderId(userId, orderId);
    res.status(200).json({ status: 'success', data: refund });
  });

  /**
   * Get all refunds for the current user
   * GET /api/orders/refunds
   */
  getUserRefunds = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const refunds = await ordersService.getUserRefunds(userId);
    res.status(200).json({ status: 'success', data: refunds });
  });
}

export default new OrdersController();

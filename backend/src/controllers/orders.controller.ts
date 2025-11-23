import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import ordersService from '../services/orders.service';

class OrdersController {
  getMyOrders = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const orders = await ordersService.getMyOrders(userId);
    res.status(200).json({ status: 'success', data: orders });
  });

  getOrderById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };
    const order = await ordersService.getOrderById(userId, id);
    res.status(200).json({ status: 'success', data: order });
  });

  cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };
    const { reason } = req.body as { reason?: string };
    const order = await ordersService.cancelOrder(userId, id, reason);
    res.status(200).json({ status: 'success', message: 'Order cancelled', data: order });
  });

  requestRefund = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };
    const { amount, reason } = req.body as { amount: number; reason?: string };
    const refund = await ordersService.requestRefund(userId, id, amount, reason);
    res.status(201).json({ status: 'success', message: 'Refund requested', data: refund });
  });
}

export default new OrdersController();


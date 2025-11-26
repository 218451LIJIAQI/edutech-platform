import api from './api';
import { ApiResponse } from '@/types';
import { Order, Refund } from '@/types';

const ordersService = {
  /**
   * Get all orders for the current user
   */
  getMyOrders: async (): Promise<Order[]> => {
    const res = await api.get<ApiResponse<Order[]>>('/orders');
    return res.data.data!;
  },

  /**
   * Get order details by ID
   */
  getOrderById: async (id: string): Promise<Order> => {
    const res = await api.get<ApiResponse<Order>>(`/orders/${id}`);
    return res.data.data!;
  },

  /**
   * Cancel a pending order
   */
  cancelOrder: async (id: string, reason?: string): Promise<Order> => {
    const res = await api.post<ApiResponse<Order>>(`/orders/${id}/cancel`, { reason });
    return res.data.data!;
  },

  /**
   * Request a refund for a paid order
   */
  requestRefund: async (
    id: string,
    amount: number,
    reason?: string,
    reasonCategory?: string,
    refundMethod?: string,
    bankDetails?: string,
    notes?: string
  ): Promise<Refund> => {
    const res = await api.post<ApiResponse<Refund>>(`/orders/${id}/refund-request`, {
      amount,
      reason,
      reasonCategory,
      refundMethod,
      bankDetails,
      notes,
    });
    return res.data.data!;
  },

  /**
   * Get refund details for an order
   */
  getRefundByOrderId: async (id: string): Promise<Refund | null> => {
    const res = await api.get<ApiResponse<Refund | null>>(`/orders/${id}/refund`);
    return res.data.data!;
  },

  /**
   * Get all refunds for the current user
   */
  getUserRefunds: async (): Promise<Refund[]> => {
    const res = await api.get<ApiResponse<Refund[]>>('/orders/refunds/list');
    return res.data.data!;
  },
};

export default ordersService;


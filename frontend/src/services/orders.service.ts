import api from './api';
import { ApiResponse, Order, Refund } from '@/types';
import { extractData } from './response-utils';
import { normalizeOrder, normalizeRefund } from '@/utils/asset-normalizers';

const requireOrderId = (id: string): string => {
  const trimmed = id?.trim();
  if (!trimmed) {
    throw new Error('Order ID is required');
  }
  return trimmed;
};

const ordersService = {
  getMyOrders: async (): Promise<Order[]> => {
    const res = await api.get<ApiResponse<Order[]>>('/orders');
    return (res.data.data || []).map(normalizeOrder);
  },

  getOrderById: async (id: string): Promise<Order> => {
    const orderId = requireOrderId(id);
    const res = await api.get<ApiResponse<Order>>(`/orders/${orderId}`);
    return normalizeOrder(extractData(res));
  },

  cancelOrder: async (id: string, reason?: string): Promise<Order> => {
    const orderId = requireOrderId(id);
    const res = await api.post<ApiResponse<Order>>(`/orders/${orderId}/cancel`, {
      reason: reason?.trim(),
    });
    return normalizeOrder(extractData(res));
  },

  requestRefund: async (
    id: string,
    amount: number,
    reason?: string,
    reasonCategory?: string,
    refundMethod?: string,
    bankDetails?: string,
    notes?: string
  ): Promise<Refund> => {
    const orderId = requireOrderId(id);
    if (amount <= 0) {
      throw new Error('Refund amount must be greater than 0');
    }
    const res = await api.post<ApiResponse<Refund>>(`/orders/${orderId}/refund-request`, {
      amount,
      reason: reason?.trim(),
      reasonCategory: reasonCategory?.trim(),
      refundMethod: refundMethod?.trim(),
      bankDetails: bankDetails?.trim(),
      notes: notes?.trim(),
    });
    return normalizeRefund(extractData(res));
  },

  getRefundsByOrderId: async (id: string): Promise<Refund[]> => {
    const orderId = requireOrderId(id);
    const res = await api.get<ApiResponse<Refund[]>>(`/orders/${orderId}/refunds`);
    return extractData(res).map(normalizeRefund);
  },
};

export default ordersService;

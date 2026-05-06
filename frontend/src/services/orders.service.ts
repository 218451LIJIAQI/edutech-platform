import api from './api';
import clientLogger from '@/utils/logger';
import { ApiResponse } from '@/types';
import { Order, Refund } from '@/types';
import { extractData } from './response-utils';
import { normalizeOrder, normalizeRefund } from '@/utils/asset-normalizers';

const ordersService = {
  /**
   * Get all orders for the current user
   */
  getMyOrders: async (): Promise<Order[]> => {
    try {
      const res = await api.get<ApiResponse<Order[]>>('/orders');
      return (res.data.data || []).map(normalizeOrder);
    } catch (error) {
      clientLogger.error('Failed to fetch orders:', error);
      throw error;
    }
  },

  /**
   * Get order details by ID
   */
  getOrderById: async (id: string): Promise<Order> => {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Order ID is required');
      }
      const res = await api.get<ApiResponse<Order>>(`/orders/${id}`);
      return normalizeOrder(extractData(res));
    } catch (error) {
      clientLogger.error(`Failed to fetch order ${id}:`, error);
      throw error;
    }
  },

  /**
   * Cancel a pending order
   */
  cancelOrder: async (id: string, reason?: string): Promise<Order> => {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Order ID is required');
      }
      const res = await api.post<ApiResponse<Order>>(`/orders/${id}/cancel`, {
        reason: reason?.trim(),
      });
      return normalizeOrder(extractData(res));
    } catch (error) {
      clientLogger.error(`Failed to cancel order ${id}:`, error);
      throw error;
    }
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
    try {
      if (!id || id.trim() === '') {
        throw new Error('Order ID is required');
      }
      if (amount <= 0) {
        throw new Error('Refund amount must be greater than 0');
      }
      const res = await api.post<ApiResponse<Refund>>(`/orders/${id}/refund-request`, {
        amount,
        reason: reason?.trim(),
        reasonCategory: reasonCategory?.trim(),
        refundMethod: refundMethod?.trim(),
        bankDetails: bankDetails?.trim(),
        notes: notes?.trim(),
      });
      return normalizeRefund(extractData(res));
    } catch (error) {
      clientLogger.error(`Failed to request refund for order ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get refund details for an order
   */
  getRefundByOrderId: async (id: string): Promise<Refund | null> => {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Order ID is required');
      }
      const res = await api.get<ApiResponse<Refund | null>>(`/orders/${id}/refund`, {
        validateStatus: (status) => status === 404 || (status >= 200 && status < 300),
      });
      if (res.status === 404) {
        return null;
      }
      return res.data.data ? normalizeRefund(res.data.data) : null;
    } catch (error) {
      clientLogger.error(`Failed to fetch refund for order ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get all refund records for an order
   */
  getRefundsByOrderId: async (id: string): Promise<Refund[]> => {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Order ID is required');
      }
      const res = await api.get<ApiResponse<Refund[]>>(`/orders/${id}/refunds`);
      return extractData(res).map(normalizeRefund);
    } catch (error) {
      clientLogger.error(`Failed to fetch refunds for order ${id}:`, error);
      throw error;
    }
  },

};

export default ordersService;

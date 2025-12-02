import api from './api';
import { ApiResponse } from '@/types';
import { Order, Refund } from '@/types';

/**
 * Helper function to extract data from API response with error handling
 */
function extractData<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.data) {
    throw new Error(response.data.message || 'No data received from server');
  }
  return response.data.data;
}

const ordersService = {
  /**
   * Get all orders for the current user
   */
  getMyOrders: async (): Promise<Order[]> => {
    try {
      const res = await api.get<ApiResponse<Order[]>>('/orders');
      return res.data.data || [];
    } catch (error) {
      console.error('Failed to fetch orders:', error);
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
      return extractData(res);
    } catch (error) {
      console.error(`Failed to fetch order ${id}:`, error);
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
      return extractData(res);
    } catch (error) {
      console.error(`Failed to cancel order ${id}:`, error);
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
      return extractData(res);
    } catch (error) {
      console.error(`Failed to request refund for order ${id}:`, error);
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
      const res = await api.get<ApiResponse<Refund | null>>(`/orders/${id}/refund`);
      return res.data.data ?? null;
    } catch (error) {
      console.error(`Failed to fetch refund for order ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get all refunds for the current user
   */
  getUserRefunds: async (): Promise<Refund[]> => {
    try {
      const res = await api.get<ApiResponse<Refund[]>>('/orders/refunds/list');
      return res.data.data || [];
    } catch (error) {
      console.error('Failed to fetch user refunds:', error);
      throw error;
    }
  },
};

export default ordersService;

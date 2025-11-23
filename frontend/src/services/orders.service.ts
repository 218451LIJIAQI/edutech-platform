import api from './api';
import { ApiResponse } from '@/types';
import { Order, Refund } from '@/types';

const ordersService = {
  getMyOrders: async (): Promise<Order[]> => {
    const res = await api.get<ApiResponse<Order[]>>('/orders');
    return res.data.data!;
  },

  getOrderById: async (id: string): Promise<Order> => {
    const res = await api.get<ApiResponse<Order>>(`/orders/${id}`);
    return res.data.data!;
    
  },

  cancelOrder: async (id: string, reason?: string): Promise<Order> => {
    const res = await api.post<ApiResponse<Order>>(`/orders/${id}/cancel`, { reason });
    return res.data.data!;
  },

  requestRefund: async (id: string, amount: number, reason?: string): Promise<Refund> => {
    const res = await api.post<ApiResponse<Refund>>(`/orders/${id}/refund-request`, { amount, reason });
    return res.data.data!;
  },
};

export default ordersService;


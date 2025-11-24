import api from './api';
import { ApiResponse, LessonPackage, Course } from '@/types';

export interface CartItemDTO {
  id: string;
  userId: string;
  packageId: string;
  quantity: number;
  addedAt: string;
  package?: LessonPackage & { course?: Course };
}

export interface CartSummaryDTO {
  items: CartItemDTO[];
  totalAmount: number;
  currency: string;
}

const cartService = {
  getCart: async (): Promise<CartSummaryDTO> => {
    const res = await api.get<ApiResponse<CartSummaryDTO>>('/cart');
    return res.data.data!;
  },

  addItem: async (packageId: string): Promise<CartItemDTO> => {
    const res = await api.post<ApiResponse<CartItemDTO>>('/cart/items', { packageId });
    return res.data.data!;
  },

  removeItem: async (packageId: string): Promise<void> => {
    await api.delete(`/cart/items/${packageId}`);
  },

  clear: async (): Promise<void> => {
    await api.delete('/cart/clear');
  },
};

export default cartService;


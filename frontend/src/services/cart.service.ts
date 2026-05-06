import api from './api';
import { ApiResponse, LessonPackage, Course } from '@/types';
import { extractData } from './response-utils';
import { normalizeCartSummary, normalizeLessonPackage } from '@/utils/asset-normalizers';

interface CartItemDTO {
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
  /**
   * Get current user's cart
   */
  getCart: async (): Promise<CartSummaryDTO> => {
    const res = await api.get<ApiResponse<CartSummaryDTO>>('/cart');
    return normalizeCartSummary(extractData(res));
  },

  /**
   * Add an item to the cart
   */
  addItem: async (packageId: string): Promise<CartItemDTO> => {
    const res = await api.post<ApiResponse<CartItemDTO>>('/cart/items', { packageId });
    const item = extractData(res);
    return {
      ...item,
      package: item.package ? normalizeLessonPackage(item.package) : item.package,
    };
  },

  /**
   * Remove an item from the cart
   */
  removeItem: async (packageId: string): Promise<void> => {
    await api.delete(`/cart/items/${packageId}`);
  },

  /**
   * Clear all items from the cart
   */
  clear: async (): Promise<void> => {
    await api.delete('/cart/clear');
  },
};

export default cartService;

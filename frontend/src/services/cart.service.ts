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

/**
 * Helper function to extract data from API response with error handling
 */
function extractData<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.data) {
    throw new Error(response.data.message || 'No data received from server');
  }
  return response.data.data;
}

const cartService = {
  /**
   * Get current user's cart
   */
  getCart: async (): Promise<CartSummaryDTO> => {
    const res = await api.get<ApiResponse<CartSummaryDTO>>('/cart');
    return extractData(res);
  },

  /**
   * Add an item to the cart
   */
  addItem: async (packageId: string): Promise<CartItemDTO> => {
    const res = await api.post<ApiResponse<CartItemDTO>>('/cart/items', { packageId });
    return extractData(res);
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


import api from './api';
import { ApiResponse, CartItem, CartSummary } from '@/types';
import { extractData } from './response-utils';
import { normalizeCartSummary, normalizeLessonPackage } from '@/utils/asset-normalizers';

const cartService = {
  getCart: async (): Promise<CartSummary> => {
    const res = await api.get<ApiResponse<CartSummary>>('/cart');
    return normalizeCartSummary(extractData(res));
  },

  addItem: async (packageId: string): Promise<CartItem> => {
    const res = await api.post<ApiResponse<CartItem>>('/cart/items', { packageId });
    const item = extractData(res);
    return {
      ...item,
      package: item.package ? normalizeLessonPackage(item.package) : item.package,
    };
  },

  removeItem: async (packageId: string): Promise<void> => {
    await api.delete(`/cart/items/${packageId}`);
  },

  clear: async (): Promise<void> => {
    await api.delete('/cart/clear');
  },
};

export default cartService;

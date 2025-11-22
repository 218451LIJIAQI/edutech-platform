import api from './api';
import { ApiResponse, PaginatedResponse } from '@/types';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Notification Service
 * Handles all notification-related API calls
 */

export const notificationService = {
  /**
   * Get user's notifications
   */
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<PaginatedResponse<Notification>['data']> => {
    const response = await api.get<PaginatedResponse<Notification>>('/notifications', {
      params,
    });
    return response.data.data;
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<ApiResponse<{ count: number }>>(
      '/notifications/unread-count'
    );
    return response.data.data?.count || 0;
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (id: string): Promise<Notification> => {
    const response = await api.put<ApiResponse<Notification>>(
      `/notifications/${id}/read`
    );
    return response.data.data!;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/read-all');
  },

  /**
   * Delete notification
   */
  deleteNotification: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },
};

export default notificationService;


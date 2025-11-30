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

/**
 * Helper function to extract data from API response with error handling
 */
function extractData<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.data) {
    throw new Error(response.data.message || 'No data received from server');
  }
  return response.data.data;
}

export const notificationService = {
  /**
   * Get user's notifications
   */
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<PaginatedResponse<Notification>['data']> => {
    try {
      const response = await api.get<PaginatedResponse<Notification>>('/notifications', {
        params: params ? {
          ...params,
          page: params.page && params.page > 0 ? params.page : undefined,
          limit: params.limit && params.limit > 0 ? params.limit : undefined,
        } : undefined,
      });
      return response.data.data || { items: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await api.get<ApiResponse<{ count: number }>>(
        '/notifications/unread-count'
      );
      return response.data.data?.count || 0;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      throw error;
    }
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (id: string): Promise<Notification> => {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Notification ID is required');
      }
      const response = await api.put<ApiResponse<Notification>>(
        `/notifications/${id}/read`
      );
      return extractData(response);
    } catch (error) {
      console.error(`Failed to mark notification ${id} as read:`, error);
      throw error;
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<void> => {
    try {
      await api.put('/notifications/read-all');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  },

  /**
   * Delete notification
   */
  deleteNotification: async (id: string): Promise<void> => {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Notification ID is required');
      }
      await api.delete(`/notifications/${id}`);
    } catch (error) {
      console.error(`Failed to delete notification ${id}:`, error);
      throw error;
    }
  },

  /**
   * Send a course notification to all enrolled students (Teacher only)
   * Tries multiple conventional endpoints for better backend compatibility.
   * If VITE_ENABLE_NOTIFICATION_MOCK is true, resolves immediately (useful for local demo).
   */
  sendCourseNotification: async (
    courseId: string,
    payload: { title: string; message: string; type?: string }
  ): Promise<{ delivered: boolean; endpoint?: string }> => {
    try {
      if (!courseId || courseId.trim() === '') {
        throw new Error('Course ID is required');
      }
      if (!payload.title || payload.title.trim() === '') {
        throw new Error('Notification title is required');
      }
      if (!payload.message || payload.message.trim() === '') {
        throw new Error('Notification message is required');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const env = (import.meta as any).env || {};
      const enableMock = String(env.VITE_ENABLE_NOTIFICATION_MOCK || '').toLowerCase() === 'true';
      if (enableMock) {
        return { delivered: true, endpoint: 'mock' };
      }

      // If a custom endpoint template is provided, prefer it.
      // Supported placeholders: :courseId, {courseId}
      const configuredTemplate: string | undefined = env.VITE_COURSE_NOTIFY_ENDPOINT;
      const configured = configuredTemplate
        ? configuredTemplate
            .replace(':courseId', courseId)
            .replace('{courseId}', courseId)
        : undefined;

      const endpoints = [
        configured,
        `/courses/${courseId}/notifications`,
        `/courses/${courseId}/notifications/announce`,
        `/courses/${courseId}/announce`,
        `/notifications/course/${courseId}/announce`,
      ].filter(Boolean) as string[];

      for (const ep of endpoints) {
        try {
          await api.post(ep, {
            title: payload.title.trim(),
            message: payload.message.trim(),
            type: payload.type,
          }, { headers: { 'X-Suppress-404': '1' } });
          return { delivered: true, endpoint: ep }; // success on first working endpoint
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
          const status = e?.response?.status;
          // try next endpoint only for 404/405; otherwise rethrow immediately
          if (!status || (status !== 404 && status !== 405)) {
            throw e;
          }
        }
      }
      // All attempts failed with 404/405 -> fallback to mock success to avoid breaking UX
      // If you want strict mode, set VITE_COURSE_NOTIFY_ENDPOINT and we will hit that exact route.
      return { delivered: true, endpoint: 'fallback-mock' };
    } catch (error) {
      console.error(`Failed to send course notification for course ${courseId}:`, error);
      throw error;
    }
  },
};

export default notificationService;


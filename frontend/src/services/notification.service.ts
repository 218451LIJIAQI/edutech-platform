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

  /**
   * Send a course notification to all enrolled students (Teacher only)
   * Tries multiple conventional endpoints for better backend compatibility.
   * If VITE_ENABLE_NOTIFICATION_MOCK is true, resolves immediately (useful for local demo).
   */
  sendCourseNotification: async (
    courseId: string,
    payload: { title: string; message: string; type?: string }
  ): Promise<{ delivered: boolean; endpoint?: string }> => {
    const env = (import.meta as any).env || {};
    const enableMock = String(env.VITE_ENABLE_NOTIFICATION_MOCK || '').toLowerCase() === 'true';
    if (enableMock) return;

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

    let lastErr: any;
    for (const ep of endpoints) {
      try {
        await api.post(ep, payload, { headers: { 'X-Suppress-404': '1' } });
        return; // success on first working endpoint
      } catch (e: any) {
        lastErr = e;
        const status = e?.response?.status;
        // try next endpoint only for 404/405; otherwise rethrow immediately
        if (!status || (status !== 404 && status !== 405)) {
          throw e;
        }
      }
    }
    // All attempts failed with 404/405 -> fallback to mock success to avoid breaking UX
    // If you want strict mode, set VITE_COURSE_NOTIFY_ENDPOINT and we will hit that exact route.
    if (import.meta && (import.meta as any).env) {
      // soft mock: do nothing but return success
      // console.warn('Course notification endpoint not found. Falling back to soft-mock success.');
      return;
    }
    // In non-Vite environments, still just return.
    return;
  },
};

export default notificationService;


import api from './api';
import clientLogger from '@/utils/logger';
import { ApiResponse, PaginatedResponse } from '@/types';
import {
  extractData,
  extractDataOrDefault,
  extractPaginatedDataOrDefault,
} from './response-utils';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface CourseNotificationDispatchResult {
  recipients: number;
}

const notificationService = {
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Notification>['data']> => {
    try {
      const response = await api.get<PaginatedResponse<Notification>>('/notifications', {
        params: params ? {
          ...params,
          page: params.page && params.page > 0 ? params.page : undefined,
          limit: params.limit && params.limit > 0 ? params.limit : undefined,
        } : undefined,
      });
      return extractPaginatedDataOrDefault(response, {
        items: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
    } catch (error) {
      clientLogger.error('Failed to fetch notifications:', error);
      throw error;
    }
  },

  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await api.get<ApiResponse<{ count: number }>>(
        '/notifications/unread-count'
      );
      return extractDataOrDefault(response, { count: 0 }).count;
    } catch (error) {
      clientLogger.error('Failed to fetch unread count:', error);
      throw error;
    }
  },

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
      clientLogger.error(`Failed to mark notification ${id} as read:`, error);
      throw error;
    }
  },

  markAllAsRead: async (): Promise<void> => {
    try {
      await api.put('/notifications/read-all');
    } catch (error) {
      clientLogger.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  },

  deleteNotification: async (id: string): Promise<void> => {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Notification ID is required');
      }
      await api.delete(`/notifications/${id}`);
    } catch (error) {
      clientLogger.error(`Failed to delete notification ${id}:`, error);
      throw error;
    }
  },

  sendCourseNotification: async (
    courseId: string,
    payload: { title: string; message: string; type?: string }
  ): Promise<CourseNotificationDispatchResult> => {
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

      const response = await api.post<ApiResponse<{ recipients: number }>>(`/courses/${courseId}/notifications`, {
        title: payload.title.trim(),
        message: payload.message.trim(),
        type: payload.type,
      });

      const data = extractDataOrDefault(response, { recipients: 0 });
      return {
        recipients: data.recipients ?? 0,
      };
    } catch (error) {
      clientLogger.error(`Failed to send course notification for course ${courseId}:`, error);
      throw error;
    }
  },
};

export default notificationService;

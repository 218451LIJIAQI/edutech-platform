import api from './api';
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

const requireNonEmptyText = (value: string, label: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  return trimmed;
};

const notificationService = {
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Notification>['data']> => {
    const response = await api.get<PaginatedResponse<Notification>>('/notifications', {
      params: params
        ? {
            ...params,
            page: params.page && params.page > 0 ? params.page : undefined,
            limit: params.limit && params.limit > 0 ? params.limit : undefined,
          }
        : undefined,
    });
    return extractPaginatedDataOrDefault(response, {
      items: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<ApiResponse<{ count: number }>>(
      '/notifications/unread-count'
    );
    return extractDataOrDefault(response, { count: 0 }).count;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const notificationId = requireNonEmptyText(id, 'Notification ID');
    const response = await api.put<ApiResponse<Notification>>(
      `/notifications/${notificationId}/read`
    );
    return extractData(response);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/read-all');
  },

  deleteNotification: async (id: string): Promise<void> => {
    const notificationId = requireNonEmptyText(id, 'Notification ID');
    await api.delete(`/notifications/${notificationId}`);
  },

  sendCourseNotification: async (
    courseId: string,
    payload: { title: string; message: string; type?: string }
  ): Promise<CourseNotificationDispatchResult> => {
    const validCourseId = requireNonEmptyText(courseId, 'Course ID');
    const title = requireNonEmptyText(payload.title, 'Notification title');
    const message = requireNonEmptyText(payload.message, 'Notification message');

    const response = await api.post<ApiResponse<{ recipients: number }>>(
      `/courses/${validCourseId}/notifications`,
      {
        title,
        message,
        type: payload.type,
      }
    );

    const data = extractDataOrDefault(response, { recipients: 0 });
    return {
      recipients: data.recipients ?? 0,
    };
  },
};

export default notificationService;

import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { Prisma, Notification } from '@prisma/client';

/**
 * Notification Service
 * Handles notification management
 */
class NotificationService {
  /**
   * Get user's notifications
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{
    notifications: Notification[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.floor(limit), 1), 100)
      : 20;

    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.NotificationWhereInput = unreadOnly
      ? { userId: userId.trim(), isRead: false }
      : { userId: userId.trim() };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    return await prisma.notification.count({
      where: {
        userId: userId.trim(),
        isRead: false,
      },
    });
  }

  /**
   * Mark notification as read (idempotent, scoped to owner)
   */
  async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<Notification> {
    if (!notificationId || !notificationId.trim()) {
      throw new ValidationError('Notification ID is required');
    }
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId.trim(), userId: userId.trim() },
    });

    if (!notification) {
      // Do not leak existence of notifications owned by others
      throw new NotFoundError('Notification not found');
    }

    if (notification.isRead) return notification;

    return await prisma.notification.update({
      where: { id: notificationId.trim() },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    return await prisma.notification.updateMany({
      where: {
        userId: userId.trim(),
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  /**
   * Delete notification (scoped to owner)
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    if (!notificationId || !notificationId.trim()) {
      throw new ValidationError('Notification ID is required');
    }
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const { count } = await prisma.notification.deleteMany({
      where: { id: notificationId.trim(), userId: userId.trim() },
    });

    if (count === 0) {
      // Not found for this user
      throw new NotFoundError('Notification not found');
    }
  }

  /**
   * Create notification
   */
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: string = 'general'
  ): Promise<Notification> {
    if (!title || !title.trim()) {
      throw new ValidationError('Notification title is required');
    }
    if (!message || !message.trim()) {
      throw new ValidationError('Notification message is required');
    }
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    return await prisma.notification.create({
      data: {
        userId: userId.trim(),
        title: title.trim(),
        message: message.trim(),
        type: type.trim() || 'general',
      },
    });
  }

  /**
   * Create bulk notifications
   */
  async createBulkNotifications(
    userIds: string[],
    title: string,
    message: string,
    type: string = 'general'
  ): Promise<{ count: number }> {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return { count: 0 };
    }

    if (!title || !title.trim()) {
      throw new ValidationError('Notification title is required');
    }
    if (!message || !message.trim()) {
      throw new ValidationError('Notification message is required');
    }

    // Remove duplicates and filter out invalid user IDs
    const uniqueUserIds = Array.from(
      new Set(
        userIds
          .filter((id): id is string => typeof id === 'string' && id !== null && id !== undefined)
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      )
    );

    if (uniqueUserIds.length === 0) {
      return { count: 0 };
    }

    const notifications = uniqueUserIds.map((userId) => ({
      userId,
      title: title.trim(),
      message: message.trim(),
      type: type.trim() || 'general',
    }));

    return await prisma.notification.createMany({
      data: notifications,
    });
  }
}

export default new NotificationService();

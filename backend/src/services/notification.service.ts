import prisma from '../config/database';
import { NotFoundError } from '../utils/errors';
import { Prisma } from '@prisma/client';

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
  ) {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.floor(limit), 1), 100)
      : 20;

    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.NotificationWhereInput = unreadOnly
      ? { userId, isRead: false }
      : { userId };

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
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Mark notification as read (idempotent, scoped to owner)
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      // Do not leak existence of notifications owned by others
      throw new NotFoundError('Notification not found');
    }

    if (notification.isRead) return notification;

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: {
        userId,
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
  async deleteNotification(notificationId: string, userId: string) {
    const { count } = await prisma.notification.deleteMany({
      where: { id: notificationId, userId },
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
  ) {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
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
  ) {
    const notifications = userIds.map((userId) => ({
      userId,
      title,
      message,
      type,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });
  }
}

export default new NotificationService();

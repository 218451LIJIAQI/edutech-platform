import prisma from '../config/database';
import { NotFoundError, AuthorizationError } from '../utils/errors';

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
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new AuthorizationError('You can only mark your own notifications as read');
    }

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
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new AuthorizationError('You can only delete your own notifications');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });
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


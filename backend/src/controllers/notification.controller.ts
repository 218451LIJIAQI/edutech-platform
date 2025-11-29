import { Request, Response } from 'express';
import notificationService from '../services/notification.service';
import asyncHandler from '../utils/asyncHandler';
import { BadRequestError } from '../utils/errors';

/**
 * Notification Controller
 * Handles HTTP requests for notification-related endpoints
 */
class NotificationController {
  /**
   * Get user's notifications
   * GET /api/notifications
   */
  getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { page, limit, unreadOnly } = req.query as {
      page?: string;
      limit?: string;
      unreadOnly?: string | boolean;
    };

    const parsedPage = page ? Math.max(1, parseInt(page, 10) || 1) : undefined;
    const parsedLimit = limit ? Math.min(Math.max(1, parseInt(limit, 10) || 10), 100) : undefined;

    const result = await notificationService.getUserNotifications(
      userId,
      parsedPage,
      parsedLimit,
      unreadOnly === 'true' || unreadOnly === true
    );

    res.status(200).json({
      status: 'success',
      data: {
        items: result.notifications,
        pagination: result.pagination,
      },
    });
  });

  /**
   * Get unread count
   * GET /api/notifications/unread-count
   */
  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;

    const count = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      status: 'success',
      data: { count },
    });
  });

  /**
   * Mark notification as read
   * PUT /api/notifications/:id/read
   */
  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params;

    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Notification ID is required');
    }

    const notification = await notificationService.markAsRead(id.trim(), userId);

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read',
      data: notification,
    });
  });

  /**
   * Mark all notifications as read
   * PUT /api/notifications/read-all
   */
  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;

    await notificationService.markAllAsRead(userId);

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read',
    });
  });

  /**
   * Delete notification
   * DELETE /api/notifications/:id
   */
  deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params;

    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Notification ID is required');
    }

    await notificationService.deleteNotification(id.trim(), userId);

    res.status(200).json({
      status: 'success',
      message: 'Notification deleted successfully',
    });
  });

  /**
   * Create notification (Admin only)
   * POST /api/notifications
   */
  createNotification = asyncHandler(async (req: Request, res: Response) => {
    const { userId, title, message, type } = req.body as {
      userId?: string;
      title?: string;
      message?: string;
      type?: string;
    };

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new BadRequestError('User ID is required');
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new BadRequestError('Title is required');
    }

    if (title.trim().length > 200) {
      throw new BadRequestError('Title must not exceed 200 characters');
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new BadRequestError('Message is required');
    }

    if (message.trim().length > 1000) {
      throw new BadRequestError('Message must not exceed 1000 characters');
    }

    const notification = await notificationService.createNotification(
      userId.trim(),
      title.trim(),
      message.trim(),
      type?.trim()
    );

    res.status(201).json({
      status: 'success',
      message: 'Notification created successfully',
      data: notification,
    });
  });
}

export default new NotificationController();

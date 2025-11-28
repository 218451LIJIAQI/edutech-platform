import { Request, Response } from 'express';
import notificationService from '../services/notification.service';
import asyncHandler from '../utils/asyncHandler';

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
    const userId = req.user!.id;
    const { page, limit, unreadOnly } = req.query as {
      page?: string;
      limit?: string;
      unreadOnly?: string | boolean;
    };

    const result = await notificationService.getUserNotifications(
      userId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
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
    const userId = req.user!.id;

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
    const userId = req.user!.id;
    const { id } = req.params as { id: string };

    const notification = await notificationService.markAsRead(id, userId);

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
  markAllAsRead = asyncHandler(async (_req: Request, res: Response) => {
    const userId = res.req.user!.id;

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
    const userId = req.user!.id;
    const { id } = req.params as { id: string };

    await notificationService.deleteNotification(id, userId);

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
      userId: string;
      title: string;
      message: string;
      type?: string;
    };

    const notification = await notificationService.createNotification(
      userId,
      title,
      message,
      type
    );

    res.status(201).json({
      status: 'success',
      message: 'Notification created successfully',
      data: notification,
    });
  });
}

export default new NotificationController();

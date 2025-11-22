import { Router } from 'express';
import { UserRole } from '@prisma/client';
import notificationController from '../controllers/notification.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/**
 * Notification Routes
 */

// Get user's notifications
router.get('/', authenticate, notificationController.getMyNotifications);

// Get unread count
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

// Mark notification as read
router.put('/:id/read', authenticate, notificationController.markAsRead);

// Mark all as read
router.put('/read-all', authenticate, notificationController.markAllAsRead);

// Delete notification
router.delete('/:id', authenticate, notificationController.deleteNotification);

// Create notification (Admin only)
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  notificationController.createNotification
);

export default router;


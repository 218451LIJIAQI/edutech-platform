import { Router } from 'express';
import { UserRole } from '@prisma/client';
import notificationController from '../controllers/notification.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { body, param, query } from 'express-validator';

const router = Router();

/**
 * Notification Routes
 */

// Get user's notifications
router.get(
  '/',
  authenticate,
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100'),
    query('unreadOnly').optional().isBoolean().withMessage('unreadOnly must be a boolean'),
  ]),
  notificationController.getMyNotifications
);

// Get unread count
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

// Mark notification as read
router.put(
  '/:id/read',
  authenticate,
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  notificationController.markAsRead
);

// Mark all as read
router.put('/read-all', authenticate, notificationController.markAllAsRead);

// Delete notification
router.delete(
  '/:id',
  authenticate,
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  notificationController.deleteNotification
);

// Create notification (Admin only)
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validate([
    body('userId').notEmpty().withMessage('userId is required').isUUID().withMessage('Invalid userId'),
    body('title').trim().notEmpty().withMessage('title is required').isLength({ max: 200 }).withMessage('title too long'),
    body('message').trim().notEmpty().withMessage('message is required').isLength({ max: 2000 }).withMessage('message too long'),
    body('type').trim().notEmpty().withMessage('type is required').isLength({ max: 50 }).withMessage('type too long'),
  ]),
  notificationController.createNotification
);

export default router;

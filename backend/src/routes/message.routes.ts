import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { body, param, query } from 'express-validator';
import {
  getContacts,
  getOrCreateThread,
  getMessages,
  sendMessage,
  getThreads,
  getUnreadCount,
  markMessagesAsRead,
  getContactUnreadCount,
} from '../controllers/message.controller';

const router = Router();

/**
 * Message Routes
 * All routes require authentication
 */

// Get contacts (users available to message)
router.get('/contacts', authenticate, getContacts);

// Get all threads for current user
router.get(
  '/threads',
  authenticate,
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100'),
  ]),
  getThreads
);

// Get total unread message count
router.get('/unread-count', authenticate, getUnreadCount);

// Get unread count for a specific contact
router.get(
  '/contacts/:contactId/unread-count',
  authenticate,
  validate([param('contactId').notEmpty().withMessage('contactId is required').isUUID().withMessage('Invalid contactId')]),
  getContactUnreadCount
);

// Get or create thread with a user
router.post(
  '/threads',
  authenticate,
  validate([
    body('contactId')
      .notEmpty()
      .withMessage('contactId is required')
      .isUUID()
      .withMessage('Invalid contactId'),
  ]),
  getOrCreateThread
);

// Get messages in a thread
router.get(
  '/threads/:threadId/messages',
  authenticate,
  validate([
    param('threadId').notEmpty().withMessage('threadId is required').isUUID().withMessage('Invalid threadId'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100'),
  ]),
  getMessages
);

// Send a message
router.post(
  '/threads/:threadId/messages',
  authenticate,
  validate([
    param('threadId').notEmpty().withMessage('threadId is required').isUUID().withMessage('Invalid threadId'),
    body('content').optional().isString().isLength({ min: 1, max: 5000 }).withMessage('Invalid content length'),
  ]),
  sendMessage
);

// Mark messages as read in a thread
router.put(
  '/threads/:threadId/mark-as-read',
  authenticate,
  validate([
    param('threadId').notEmpty().withMessage('threadId is required').isUUID().withMessage('Invalid threadId'),
  ]),
  markMessagesAsRead
);

export default router;

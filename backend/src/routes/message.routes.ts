import { Router } from 'express';
import { authenticate } from '../middleware/auth';
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
router.get('/threads', authenticate, getThreads);

// Get total unread message count
router.get('/unread-count', authenticate, getUnreadCount);

// Get unread count for a specific contact
router.get('/contacts/:contactId/unread-count', authenticate, getContactUnreadCount);

// Get or create thread with a user
router.post('/threads', authenticate, getOrCreateThread);

// Get messages in a thread
router.get('/threads/:threadId/messages', authenticate, getMessages);

// Send a message
router.post('/threads/:threadId/messages', authenticate, sendMessage);

// Mark messages as read in a thread
router.put('/threads/:threadId/mark-as-read', authenticate, markMessagesAsRead);

export default router;


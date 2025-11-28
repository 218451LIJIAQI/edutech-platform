import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import supportController from '../controllers/support.controller';
import { validate } from '../middleware/validate';
import { body, param } from 'express-validator';

const router = Router();

/**
 * Support Ticket Routes
 * All routes require authentication
 */

// Create a new support ticket
router.post(
  '/',
  authenticate,
  validate([
    body('subject')
      .trim()
      .notEmpty()
      .withMessage('subject is required')
      .isLength({ max: 150 })
      .withMessage('subject too long'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('description is required')
      .isLength({ max: 2000 })
      .withMessage('description too long'),
    body('category')
      .trim()
      .notEmpty()
      .withMessage('category is required')
      .isLength({ max: 50 })
      .withMessage('category too long'),
    body('orderId').optional().isUUID().withMessage('Invalid orderId'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('priority must be low, medium, or high'),
  ]),
  supportController.createTicket
);

// Get all support tickets for the current user
router.get('/', authenticate, supportController.getUserTickets);

// Get support statistics
router.get('/stats', authenticate, supportController.getStats);

// Get support tickets for a specific order
router.get(
  '/order/:orderId',
  authenticate,
  validate([param('orderId').notEmpty().withMessage('orderId is required').isUUID().withMessage('Invalid orderId')]),
  supportController.getTicketsByOrderId
);

// Get a specific support ticket by ID
router.get(
  '/:id',
  authenticate,
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  supportController.getTicketById
);

// Add a message to a support ticket
router.post(
  '/:id/messages',
  authenticate,
  validate([
    param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id'),
    body('message').trim().notEmpty().withMessage('message is required').isLength({ max: 2000 }).withMessage('message too long'),
    body('attachment').optional().isString().withMessage('attachment must be a string'),
  ]),
  supportController.addMessage
);

// Close a support ticket
router.post(
  '/:id/close',
  authenticate,
  validate([
    param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id'),
    body('resolution').optional().trim().isString().isLength({ max: 2000 }).withMessage('resolution too long'),
  ]),
  supportController.closeTicket
);

export default router;

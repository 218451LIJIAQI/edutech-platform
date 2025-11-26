import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import supportController from '../controllers/support.controller';

const router = Router();

/**
 * Support Ticket Routes
 * All routes require authentication
 */

// Create a new support ticket
router.post('/', authenticate, supportController.createTicket);

// Get all support tickets for the current user
router.get('/', authenticate, supportController.getUserTickets);

// Get support statistics
router.get('/stats', authenticate, supportController.getStats);

// Get support tickets for a specific order
router.get('/order/:orderId', authenticate, supportController.getTicketsByOrderId);

// Get a specific support ticket by ID
router.get('/:id', authenticate, supportController.getTicketById);

// Add a message to a support ticket
router.post('/:id/messages', authenticate, supportController.addMessage);

// Close a support ticket
router.post('/:id/close', authenticate, supportController.closeTicket);

export default router;


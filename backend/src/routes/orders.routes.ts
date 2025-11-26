import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { body, param } from 'express-validator';
import ordersController from '../controllers/orders.controller';

const router = Router();

// List my orders
router.get(
  '/',
  authenticate,
  authorize(UserRole.STUDENT),
  ordersController.getMyOrders
);

// Get order detail
router.get(
  '/:id',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([param('id').isUUID().withMessage('Invalid order id')]),
  ordersController.getOrderById
);

// Cancel order
router.post(
  '/:id/cancel',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([
    param('id').isUUID().withMessage('Invalid order id'),
    body('reason').optional().isString().isLength({ max: 500 }),
  ]),
  ordersController.cancelOrder
);

// Request refund
router.post(
  '/:id/refund-request',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([
    param('id').isUUID().withMessage('Invalid order id'),
    body('amount').notEmpty().isFloat({ min: 0 }),
    body('reason').optional().isString().isLength({ max: 500 }),
    body('reasonCategory').optional().isString(),
    body('refundMethod').optional().isString(),
    body('bankDetails').optional().isString(),
    body('notes').optional().isString().isLength({ max: 1000 }),
  ]),
  ordersController.requestRefund
);

// Get refund details for an order
router.get(
  '/:id/refund',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([param('id').isUUID().withMessage('Invalid order id')]),
  ordersController.getRefundByOrderId
);

// Get all refunds for the current user
router.get(
  '/refunds/list',
  authenticate,
  authorize(UserRole.STUDENT),
  ordersController.getUserRefunds
);

export default router;


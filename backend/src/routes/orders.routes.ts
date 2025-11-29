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

// Get all refunds for the current user (must be before /:id to avoid route conflict)
router.get(
  '/refunds/list',
  authenticate,
  authorize(UserRole.STUDENT),
  ordersController.getUserRefunds
);

// Get order detail
router.get(
  '/:id',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid order id')]),
  ordersController.getOrderById
);

// Cancel order
router.post(
  '/:id/cancel',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([
    param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid order id'),
    body('reason').optional().trim().isString().isLength({ max: 500 }).withMessage('reason too long'),
  ]),
  ordersController.cancelOrder
);

// Request refund
router.post(
  '/:id/refund-request',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([
    param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid order id'),
    body('amount').notEmpty().withMessage('amount is required').isFloat({ min: 0 }).withMessage('amount must be >= 0'),
    body('reason').optional().trim().isString().isLength({ max: 500 }).withMessage('reason too long'),
    body('reasonCategory').optional().trim().isString(),
    body('refundMethod').optional().trim().isString(),
    body('bankDetails').optional().trim().isString(),
    body('notes').optional().trim().isString().isLength({ max: 1000 }).withMessage('notes too long'),
  ]),
  ordersController.requestRefund
);

// Get refund details for an order
router.get(
  '/:id/refund',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid order id')]),
  ordersController.getRefundByOrderId
);

export default router;

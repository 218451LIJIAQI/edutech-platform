import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { body } from 'express-validator';
import paymentController from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

/**
 * Payment Routes
 */

// Student routes
router.post(
  '/create-intent',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([
    body('packageId')
      .notEmpty()
      .withMessage('Package ID is required')
      .isUUID()
      .withMessage('Invalid package ID'),
  ]),
  paymentController.createPaymentIntent
);

router.post(
  '/confirm',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([
    body('paymentId')
      .notEmpty()
      .withMessage('Payment ID is required')
      .isUUID()
      .withMessage('Invalid payment ID'),
    body('stripePaymentId')
      .optional()
      .isString()
      .withMessage('Invalid Stripe payment ID'),
  ]),
  paymentController.confirmPayment
);

router.get(
  '/my-payments',
  authenticate,
  authorize(UserRole.STUDENT),
  paymentController.getMyPayments
);

router.get(
  '/:id',
  authenticate,
  authorize(UserRole.STUDENT),
  paymentController.getPaymentById
);

// Teacher routes
router.get(
  '/teacher/earnings',
  authenticate,
  authorize(UserRole.TEACHER),
  paymentController.getTeacherEarnings
);

// Admin routes
router.post(
  '/:id/refund',
  authenticate,
  authorize(UserRole.ADMIN),
  paymentController.requestRefund
);

export default router;


import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { body, param } from 'express-validator';
import paymentController from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

/**
 * Payment Routes
 */

// More specific routes first (before /:id)

// Student routes - POST endpoints
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

// Cart checkout intent
router.post(
  '/cart/create-intent',
  authenticate,
  authorize(UserRole.STUDENT),
  paymentController.createCartPaymentIntent
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

// Teacher routes - must come before /:id routes
router.get(
  '/teacher/earnings',
  authenticate,
  authorize(UserRole.TEACHER),
  paymentController.getTeacherEarnings
);

router.get(
  '/teacher/earnings-by-course',
  authenticate,
  authorize(UserRole.TEACHER),
  paymentController.getTeacherEarningsByCourse
);

// Student routes - GET endpoints
router.get(
  '/my-payments',
  authenticate,
  authorize(UserRole.STUDENT),
  paymentController.getMyPayments
);

// Generic routes - must come last
router.get(
  '/:id',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  paymentController.getPaymentById
);

// Admin routes
router.post(
  '/:id/refund',
  authenticate,
  authorize(UserRole.ADMIN),
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  paymentController.requestRefund
);

export default router;

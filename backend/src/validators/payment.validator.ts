import { body } from 'express-validator';

/**
 * Validation rules for payment endpoints
 */

export const createPaymentIntentValidation = [
  body('packageId')
    .notEmpty()
    .withMessage('Package ID is required')
    .isUUID()
    .withMessage('Package ID must be a valid UUID'),
];

export const confirmPaymentValidation = [
  body('paymentId')
    .notEmpty()
    .withMessage('Payment ID is required')
    .isUUID()
    .withMessage('Payment ID must be a valid UUID'),

  body('stripePaymentId')
    .notEmpty()
    .withMessage('Stripe payment ID is required')
    .isString()
    .withMessage('Stripe payment ID must be a string'),
];

export default {
  createPaymentIntentValidation,
  confirmPaymentValidation,
};


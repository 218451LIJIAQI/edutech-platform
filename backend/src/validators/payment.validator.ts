import { body } from 'express-validator';

/**
 * Validation rules for payment endpoints
 */

export const createPaymentIntentValidation = [
  body('packageId')
    .exists({ checkNull: true })
    .withMessage('Package ID is required')
    .bail()
    .isString()
    .withMessage('Package ID must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Package ID is required')
    .bail()
    .isUUID()
    .withMessage('Package ID must be a valid UUID'),
];

export const confirmPaymentValidation = [
  body('paymentId')
    .exists({ checkNull: true })
    .withMessage('Payment ID is required')
    .bail()
    .isString()
    .withMessage('Payment ID must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Payment ID is required')
    .bail()
    .isUUID()
    .withMessage('Payment ID must be a valid UUID'),

  body('stripePaymentId')
    .exists({ checkNull: true })
    .withMessage('Stripe payment ID is required')
    .bail()
    .isString()
    .withMessage('Stripe payment ID must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Stripe payment ID is required'),
];

export default {
  createPaymentIntentValidation,
  confirmPaymentValidation,
};

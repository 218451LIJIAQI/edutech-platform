import { body } from 'express-validator';

/**
 * Validation rules for payment endpoints
 */

// Error messages constants
const ERROR_MESSAGES = {
  PACKAGE_ID_REQUIRED: 'Package ID is required',
  PACKAGE_ID_STRING: 'Package ID must be a string',
  PACKAGE_ID_UUID: 'Package ID must be a valid UUID',
  PAYMENT_ID_REQUIRED: 'Payment ID is required',
  PAYMENT_ID_STRING: 'Payment ID must be a string',
  PAYMENT_ID_UUID: 'Payment ID must be a valid UUID',
  STRIPE_PAYMENT_ID_STRING: 'Stripe payment ID must be a string',
} as const;

export const createPaymentIntentValidation = [
  body('packageId')
    .exists({ checkNull: true })
    .withMessage(ERROR_MESSAGES.PACKAGE_ID_REQUIRED)
    .bail()
    .isString()
    .withMessage(ERROR_MESSAGES.PACKAGE_ID_STRING)
    .bail()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.PACKAGE_ID_REQUIRED)
    .bail()
    .trim()
    .isUUID()
    .withMessage(ERROR_MESSAGES.PACKAGE_ID_UUID),
];

export const confirmPaymentValidation = [
  body('paymentId')
    .exists({ checkNull: true })
    .withMessage(ERROR_MESSAGES.PAYMENT_ID_REQUIRED)
    .bail()
    .isString()
    .withMessage(ERROR_MESSAGES.PAYMENT_ID_STRING)
    .bail()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.PAYMENT_ID_REQUIRED)
    .bail()
    .trim()
    .isUUID()
    .withMessage(ERROR_MESSAGES.PAYMENT_ID_UUID),

  body('stripePaymentId')
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.STRIPE_PAYMENT_ID_STRING)
    .bail()
    .trim(),
];

export default {
  createPaymentIntentValidation,
  confirmPaymentValidation,
};

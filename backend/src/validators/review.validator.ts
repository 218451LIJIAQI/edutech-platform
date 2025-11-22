import { body } from 'express-validator';

/**
 * Validation rules for review endpoints
 */

export const createReviewValidation = [
  body('enrollmentId')
    .notEmpty()
    .withMessage('Enrollment ID is required')
    .isUUID()
    .withMessage('Enrollment ID must be a valid UUID'),

  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
];

export const updateReviewValidation = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
];

export default {
  createReviewValidation,
  updateReviewValidation,
};


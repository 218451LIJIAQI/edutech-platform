import { body } from 'express-validator';

/**
 * Validation rules for review endpoints
 */

export const createReviewValidation = [
  body('enrollmentId')
    .exists({ checkNull: true })
    .withMessage('Enrollment ID is required')
    .bail()
    .isString()
    .withMessage('Enrollment ID must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Enrollment ID is required')
    .bail()
    .isUUID()
    .withMessage('Enrollment ID must be a valid UUID'),

  body('rating')
    .exists({ checkNull: true })
    .withMessage('Rating is required')
    .bail()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
    .bail()
    .toInt(),

  body('comment')
    .optional({ nullable: true })
    .isString()
    .withMessage('Comment must be a string')
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
];

export const updateReviewValidation = [
  body('rating')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
    .bail()
    .toInt(),

  body('comment')
    .optional({ nullable: true })
    .isString()
    .withMessage('Comment must be a string')
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
];

export default {
  createReviewValidation,
  updateReviewValidation,
};

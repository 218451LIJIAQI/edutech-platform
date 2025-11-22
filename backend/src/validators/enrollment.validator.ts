import { body } from 'express-validator';

/**
 * Validation rules for enrollment endpoints
 */

export const updateProgressValidation = [
  body('completedLessons')
    .notEmpty()
    .withMessage('Completed lessons count is required')
    .isInt({ min: 0 })
    .withMessage('Completed lessons must be a non-negative integer'),

  body('progress')
    .notEmpty()
    .withMessage('Progress is required')
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100'),
];

export default {
  updateProgressValidation,
};


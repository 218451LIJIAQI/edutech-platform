import { body } from 'express-validator';

/**
 * Validation rules for enrollment endpoints
 */

export const updateProgressValidation = [
  body('completedLessons')
    .exists({ checkNull: true })
    .withMessage('Completed lessons count is required')
    .bail()
    .isInt({ min: 0 })
    .withMessage('Completed lessons must be a non-negative integer')
    .bail()
    .toInt(),

  body('progress')
    .exists({ checkNull: true })
    .withMessage('Progress is required')
    .bail()
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100')
    .bail()
    .toInt(),
];

export default {
  updateProgressValidation,
};

import { body } from 'express-validator';

/**
 * Validation rules for enrollment endpoints
 */

// Error messages constants
const ERROR_MESSAGES = {
  COMPLETED_LESSONS_INVALID: 'completedLessons must be an array of non-empty IDs or a non-negative integer',
  PROGRESS_RANGE: 'Progress must be an integer between 0 and 100',
} as const;

/**
 * Validates completed lessons field
 * Accepts: array of non-empty strings, non-negative integer, or undefined
 */
const validateCompletedLessons = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.every((v) => typeof v === 'string' && v.trim().length > 0);
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) && Number.isInteger(n) && n >= 0;
  }
  return true; // allow undefined
};

/**
 * Validates progress field
 * Accepts: integer between 0-100, string representation of such integer, or undefined
 */
const validateProgress = (value: unknown): boolean => {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 && value <= 100;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n <= 100;
  }
  return true; // allow undefined
};

export const updateProgressValidation = [
  body('completedLessons')
    .optional({ nullable: true })
    .custom(validateCompletedLessons)
    .withMessage(ERROR_MESSAGES.COMPLETED_LESSONS_INVALID),

  body('progress')
    .optional({ nullable: true })
    .custom(validateProgress)
    .withMessage(ERROR_MESSAGES.PROGRESS_RANGE),
];

export default {
  updateProgressValidation,
};

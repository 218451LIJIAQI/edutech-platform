import { body, query } from 'express-validator';
import { VerificationStatus } from '@prisma/client';

/**
 * Validation rules for teacher endpoints
 */

const validateUrlOrPath = (label: string) => (value: unknown) => {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string URL or file path`);
  }
  const isUrl = /^https?:\/\/.+/.test(value);
  const isRelativePath = value.startsWith('/');
  if (!isUrl && !isRelativePath) {
    throw new Error(`${label} must be a valid URL or file path`);
  }
  return true;
};

export const updateProfileValidation = [
  body('bio')
    .optional({ nullable: true })
    .isString().withMessage('Bio must be a string')
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio must not exceed 1000 characters'),

  body('headline')
    .optional({ nullable: true })
    .isString().withMessage('Headline must be a string')
    .bail()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Headline must not exceed 200 characters'),

  body('hourlyRate')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number')
    .bail()
    .toFloat(),
];

export const addCertificationValidation = [
  body('title')
    .isString().withMessage('Certification title must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Certification title is required')
    .bail()
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),

  body('issuer')
    .isString().withMessage('Issuer must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Issuer is required')
    .bail()
    .isLength({ max: 200 })
    .withMessage('Issuer name must not exceed 200 characters'),

  body('issueDate')
    .exists({ checkNull: true })
    .withMessage('Issue date is required')
    .bail()
    .isISO8601()
    .withMessage('Issue date must be a valid date')
    .bail()
    .toDate(),

  body('expiryDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Expiry date must be a valid date')
    .bail()
    .toDate()
    .custom((value, { req }) => {
      if (!value) return true;
      const issue = req.body.issueDate ? new Date(req.body.issueDate) : undefined;
      const expiry = new Date(value);
      if (issue && !isNaN(issue.getTime()) && !isNaN(expiry.getTime())) {
        if (expiry < issue) {
          throw new Error('Expiry date cannot be before issue date');
        }
      }
      return true;
    }),

  body('credentialId')
    .optional({ nullable: true })
    .isString().withMessage('Credential ID must be a string')
    .bail()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Credential ID must not exceed 100 characters'),

  body('credentialUrl')
    .optional({ nullable: true })
    .isString().withMessage('Credential URL must be a string URL or file path')
    .bail()
    .trim()
    .custom(validateUrlOrPath('Credential URL')),
];

export const submitVerificationValidation = [
  body('documentType')
    .isString().withMessage('Document type must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Document type is required')
    .bail()
    .isIn(['teaching_certificate', 'degree', 'id_card', 'other'])
    .withMessage('Invalid document type'),

  body('documentUrl')
    .isString().withMessage('Document URL must be a string URL or file path')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Document URL is required')
    .bail()
    .custom(validateUrlOrPath('Document URL')),
];

export const reviewVerificationValidation = [
  body('status')
    .exists({ checkNull: true })
    .withMessage('Status is required')
    .bail()
    .isString().withMessage('Status must be a string')
    .bail()
    .isIn(Object.values(VerificationStatus))
    .withMessage('Invalid verification status'),

  body('reviewNotes')
    .optional({ nullable: true })
    .isString().withMessage('Review notes must be a string')
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Review notes must not exceed 500 characters'),
];

export const getTeachersValidation = [
  query('isVerified')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('isVerified must be a boolean')
    .bail()
    .toBoolean(),

  query('minRating')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 5 })
    .withMessage('minRating must be between 0 and 5')
    .bail()
    .toFloat(),

  query('page')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .bail()
    .toInt(),

  query('limit')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .bail()
    .toInt(),
];

export default {
  updateProfileValidation,
  addCertificationValidation,
  submitVerificationValidation,
  reviewVerificationValidation,
  getTeachersValidation,
};

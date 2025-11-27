import { body, query } from 'express-validator';
import { VerificationStatus } from '@prisma/client';

/**
 * Validation rules for teacher endpoints
 */

export const updateProfileValidation = [
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio must not exceed 1000 characters'),

  body('headline')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Headline must not exceed 200 characters'),

  body('hourlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number'),
];

export const addCertificationValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Certification title is required')
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),

  body('issuer')
    .trim()
    .notEmpty()
    .withMessage('Issuer is required')
    .isLength({ max: 200 })
    .withMessage('Issuer name must not exceed 200 characters'),

  body('issueDate')
    .notEmpty()
    .withMessage('Issue date is required')
    .isISO8601()
    .withMessage('Issue date must be a valid date'),

  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date'),

  body('credentialId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Credential ID must not exceed 100 characters'),

  body('credentialUrl')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      const isUrl = /^https?:\/\/.+/.test(value);
      const isRelativePath = value.startsWith('/');
      if (!isUrl && !isRelativePath) {
        throw new Error('Credential URL must be a valid URL or path');
      }
      return true;
    })
    .withMessage('Credential URL must be a valid URL or file path'),
];

export const submitVerificationValidation = [
  body('documentType')
    .trim()
    .notEmpty()
    .withMessage('Document type is required')
    .isIn(['teaching_certificate', 'degree', 'id_card', 'other'])
    .withMessage('Invalid document type'),

  body('documentUrl')
    .trim()
    .notEmpty()
    .withMessage('Document URL is required')
    .custom((value) => {
      if (!value) return true;
      const isUrl = /^https?:\/\/.+/.test(value);
      const isRelativePath = value.startsWith('/');
      if (!isUrl && !isRelativePath) {
        throw new Error('Document URL must be a valid URL or path');
      }
      return true;
    })
    .withMessage('Document URL must be a valid URL or file path'),
];

export const reviewVerificationValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(Object.values(VerificationStatus))
    .withMessage('Invalid verification status'),

  body('reviewNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Review notes must not exceed 500 characters'),
];

export const getTeachersValidation = [
  query('isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified must be a boolean'),

  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('minRating must be between 0 and 5'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export default {
  updateProfileValidation,
  addCertificationValidation,
  submitVerificationValidation,
  reviewVerificationValidation,
  getTeachersValidation,
};


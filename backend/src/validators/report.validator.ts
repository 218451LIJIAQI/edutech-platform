import { body, query } from 'express-validator';
import { ReportType, ReportStatus } from '@prisma/client';

/**
 * Validation rules for report endpoints
 */

export const submitReportValidation = [
  body('reportedId')
    .notEmpty()
    .withMessage('Reported user ID is required')
    .isUUID()
    .withMessage('Reported user ID must be a valid UUID'),

  body('type')
    .notEmpty()
    .withMessage('Report type is required')
    .isIn(Object.values(ReportType))
    .withMessage('Invalid report type'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
];

export const updateReportStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(Object.values(ReportStatus))
    .withMessage('Invalid report status'),

  body('resolution')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Resolution must not exceed 1000 characters'),
];

export const getReportsValidation = [
  query('status')
    .optional()
    .isIn(Object.values(ReportStatus))
    .withMessage('Invalid report status'),

  query('type')
    .optional()
    .isIn(Object.values(ReportType))
    .withMessage('Invalid report type'),

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
  submitReportValidation,
  updateReportStatusValidation,
  getReportsValidation,
};


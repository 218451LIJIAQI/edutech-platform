import { body, query } from 'express-validator';
import { ReportType, ReportStatus } from '@prisma/client';

/**
 * Validation rules for report endpoints
 */

export const submitReportValidation = [
  body('reportedId')
    .exists({ checkNull: true })
    .withMessage('Reported user ID is required')
    .bail()
    .isString()
    .withMessage('Reported user ID must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Reported user ID is required')
    .bail()
    .isUUID()
    .withMessage('Reported user ID must be a valid UUID'),

  body('type')
    .exists({ checkNull: true })
    .withMessage('Report type is required')
    .bail()
    .isString()
    .withMessage('Report type must be a string')
    .bail()
    .isIn(Object.values(ReportType))
    .withMessage('Invalid report type'),

  body('description')
    .isString()
    .withMessage('Description must be a string')
    .bail()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
];

export const updateReportStatusValidation = [
  body('status')
    .exists({ checkNull: true })
    .withMessage('Status is required')
    .bail()
    .isString()
    .withMessage('Status must be a string')
    .bail()
    .isIn(Object.values(ReportStatus))
    .withMessage('Invalid report status'),

  body('resolution')
    .optional({ nullable: true })
    .isString()
    .withMessage('Resolution must be a string')
    .bail()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Resolution must not be empty and must not exceed 1000 characters'),
];

export const getReportsValidation = [
  query('status')
    .optional({ nullable: true })
    .isString()
    .withMessage('Status must be a string')
    .bail()
    .trim()
    .isIn(Object.values(ReportStatus))
    .withMessage('Invalid report status'),

  query('type')
    .optional({ nullable: true })
    .isString()
    .withMessage('Type must be a string')
    .bail()
    .trim()
    .isIn(Object.values(ReportType))
    .withMessage('Invalid report type'),

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
  submitReportValidation,
  updateReportStatusValidation,
  getReportsValidation,
};

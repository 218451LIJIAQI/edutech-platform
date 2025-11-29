import { body, query } from 'express-validator';
import { ReportType, ReportStatus } from '@prisma/client';

/**
 * Validation rules for report endpoints
 */

// Error messages constants
const ERROR_MESSAGES = {
  REPORTED_ID_REQUIRED: 'Reported user ID is required',
  REPORTED_ID_STRING: 'Reported user ID must be a string',
  REPORTED_ID_UUID: 'Reported user ID must be a valid UUID',
  REPORT_TYPE_REQUIRED: 'Report type is required',
  REPORT_TYPE_STRING: 'Report type must be a string',
  REPORT_TYPE_INVALID: 'Invalid report type',
  DESCRIPTION_STRING: 'Description must be a string',
  DESCRIPTION_LENGTH: 'Description must be between 20 and 2000 characters',
  STATUS_REQUIRED: 'Status is required',
  STATUS_STRING: 'Status must be a string',
  STATUS_INVALID: 'Invalid report status',
  RESOLUTION_STRING: 'Resolution must be a string',
  RESOLUTION_LENGTH: 'Resolution must not be empty and must not exceed 1000 characters',
  QUERY_STATUS_STRING: 'Status must be a string',
  QUERY_STATUS_INVALID: 'Invalid report status',
  QUERY_TYPE_STRING: 'Type must be a string',
  QUERY_TYPE_INVALID: 'Invalid report type',
  PAGE_INTEGER: 'Page must be a positive integer',
  LIMIT_RANGE: 'Limit must be between 1 and 100',
} as const;

export const submitReportValidation = [
  body('reportedId')
    .exists({ checkNull: true })
    .withMessage(ERROR_MESSAGES.REPORTED_ID_REQUIRED)
    .bail()
    .isString()
    .withMessage(ERROR_MESSAGES.REPORTED_ID_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.REPORTED_ID_REQUIRED)
    .bail()
    .isUUID()
    .withMessage(ERROR_MESSAGES.REPORTED_ID_UUID),

  body('type')
    .exists({ checkNull: true })
    .withMessage(ERROR_MESSAGES.REPORT_TYPE_REQUIRED)
    .bail()
    .isString()
    .withMessage(ERROR_MESSAGES.REPORT_TYPE_STRING)
    .bail()
    .isIn(Object.values(ReportType))
    .withMessage(ERROR_MESSAGES.REPORT_TYPE_INVALID),

  body('description')
    .isString()
    .withMessage(ERROR_MESSAGES.DESCRIPTION_STRING)
    .bail()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage(ERROR_MESSAGES.DESCRIPTION_LENGTH),
];

export const updateReportStatusValidation = [
  body('status')
    .exists({ checkNull: true })
    .withMessage(ERROR_MESSAGES.STATUS_REQUIRED)
    .bail()
    .isString()
    .withMessage(ERROR_MESSAGES.STATUS_STRING)
    .bail()
    .isIn(Object.values(ReportStatus))
    .withMessage(ERROR_MESSAGES.STATUS_INVALID),

  body('resolution')
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.RESOLUTION_STRING)
    .bail()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage(ERROR_MESSAGES.RESOLUTION_LENGTH),
];

export const getReportsValidation = [
  query('status')
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.QUERY_STATUS_STRING)
    .bail()
    .trim()
    .isIn(Object.values(ReportStatus))
    .withMessage(ERROR_MESSAGES.QUERY_STATUS_INVALID),

  query('type')
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.QUERY_TYPE_STRING)
    .bail()
    .trim()
    .isIn(Object.values(ReportType))
    .withMessage(ERROR_MESSAGES.QUERY_TYPE_INVALID),

  query('page')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.PAGE_INTEGER)
    .bail()
    .toInt(),

  query('limit')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 100 })
    .withMessage(ERROR_MESSAGES.LIMIT_RANGE)
    .bail()
    .toInt(),
];

export default {
  submitReportValidation,
  updateReportStatusValidation,
  getReportsValidation,
};

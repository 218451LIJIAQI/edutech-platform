import { Router } from 'express';
import { UserRole, ReportType, ReportStatus } from '@prisma/client';
import { body, query } from 'express-validator';
import reportController from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

/**
 * Report Routes
 */

// Student routes
router.post(
  '/',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([
    body('reportedId')
      .notEmpty()
      .withMessage('Reported user ID is required')
      .isUUID()
      .withMessage('Invalid user ID'),
    body('type')
      .notEmpty()
      .withMessage('Report type is required')
      .isIn(Object.values(ReportType))
      .withMessage('Invalid report type'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ min: 20, max: 1000 })
      .withMessage('Description must be between 20 and 1000 characters'),
  ]),
  reportController.submitReport
);

router.get(
  '/my-reports',
  authenticate,
  authorize(UserRole.STUDENT),
  reportController.getMyReports
);

router.get('/:id', authenticate, reportController.getReportById);

// Admin routes
router.get(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validate([
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
  ]),
  reportController.getAllReports
);

router.put(
  '/:id/status',
  authenticate,
  authorize(UserRole.ADMIN),
  validate([
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
  ]),
  reportController.updateReportStatus
);

router.get(
  '/teacher/:teacherId',
  authenticate,
  authorize(UserRole.ADMIN),
  reportController.getTeacherReports
);

export default router;


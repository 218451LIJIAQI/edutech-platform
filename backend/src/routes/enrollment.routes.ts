import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { body, param } from 'express-validator';
import enrollmentController from '../controllers/enrollment.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

/**
 * Enrollment Routes
 */

// Student routes
router.get(
  '/my-courses',
  authenticate,
  authorize(UserRole.STUDENT),
  enrollmentController.getMyEnrollments
);

// Check access MUST come before the generic "/:id" route to avoid being shadowed
router.get(
  '/check-access/:courseId',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([param('courseId').notEmpty().withMessage('courseId is required').isUUID().withMessage('Invalid courseId')]),
  enrollmentController.checkAccess
);

router.get(
  '/:id',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([param('id').notEmpty().withMessage('Enrollment ID is required').isUUID().withMessage('Invalid enrollment ID')]),
  enrollmentController.getEnrollmentById
);

router.put(
  '/:id/progress',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([
    param('id').notEmpty().withMessage('Enrollment ID is required').isUUID().withMessage('Invalid enrollment ID'),
    body('completedLessons')
      .optional()
      .custom((value) => {
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
        return false;
      })
      .withMessage('completedLessons must be an array of non-empty IDs or a non-negative integer'),
    body('progress')
      .optional()
      .custom((value) => {
        if (typeof value === 'number') return Number.isInteger(value) && value >= 0 && value <= 100;
        if (typeof value === 'string' && value.trim() !== '') {
          const n = Number(value);
          return Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n <= 100;
        }
        return false;
      })
      .withMessage('Progress must be an integer between 0 and 100'),
  ]),
  enrollmentController.updateProgress
);

// Teacher routes
router.get(
  '/course/:courseId/students',
  authenticate,
  authorize(UserRole.TEACHER),
  validate([param('courseId').notEmpty().withMessage('Course ID is required').isUUID().withMessage('Invalid course ID')]),
  enrollmentController.getCourseStudents
);

router.get(
  '/course/:courseId/stats',
  authenticate,
  authorize(UserRole.TEACHER),
  validate([param('courseId').notEmpty().withMessage('Course ID is required').isUUID().withMessage('Invalid course ID')]),
  enrollmentController.getCourseStats
);

export default router;

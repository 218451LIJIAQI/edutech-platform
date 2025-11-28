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
  validate([param('courseId').notEmpty().withMessage('courseId is required')]),
  enrollmentController.checkAccess
);

router.get(
  '/:id',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([param('id').notEmpty().withMessage('id is required')]),
  enrollmentController.getEnrollmentById
);

router.put(
  '/:id/progress',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([
    param('id').notEmpty().withMessage('id is required'),
    body('completedLessons')
      .notEmpty()
      .withMessage('Completed lessons count is required')
      .isInt({ min: 0 })
      .withMessage('Completed lessons must be a positive integer'),
    body('progress')
      .notEmpty()
      .withMessage('Progress is required')
      .isInt({ min: 0, max: 100 })
      .withMessage('Progress must be between 0 and 100'),
  ]),
  enrollmentController.updateProgress
);

// Teacher routes
router.get(
  '/course/:courseId/students',
  authenticate,
  authorize(UserRole.TEACHER),
  validate([param('courseId').notEmpty().withMessage('courseId is required')]),
  enrollmentController.getCourseStudents
);

router.get(
  '/course/:courseId/stats',
  authenticate,
  authorize(UserRole.TEACHER),
  validate([param('courseId').notEmpty().withMessage('courseId is required')]),
  enrollmentController.getCourseStats
);

export default router;

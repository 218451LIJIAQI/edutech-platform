import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { body } from 'express-validator';
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

router.get(
  '/:id',
  authenticate,
  authorize(UserRole.STUDENT),
  enrollmentController.getEnrollmentById
);

router.put(
  '/:id/progress',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([
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

router.get(
  '/check-access/:courseId',
  authenticate,
  authorize(UserRole.STUDENT),
  enrollmentController.checkAccess
);

// Teacher routes
router.get(
  '/course/:courseId/students',
  authenticate,
  authorize(UserRole.TEACHER),
  enrollmentController.getCourseStudents
);

router.get(
  '/course/:courseId/stats',
  authenticate,
  authorize(UserRole.TEACHER),
  enrollmentController.getCourseStats
);

export default router;


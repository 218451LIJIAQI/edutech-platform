import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { body, query } from 'express-validator';
import reviewController from '../controllers/review.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

/**
 * Review Routes
 */

// Public routes
router.get(
  '/teacher/:teacherId',
  validate([
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
  ]),
  reviewController.getTeacherReviews
);

// Student routes
router.post(
  '/',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([
    body('enrollmentId')
      .notEmpty()
      .withMessage('Enrollment ID is required')
      .isUUID()
      .withMessage('Invalid enrollment ID'),
    body('rating')
      .notEmpty()
      .withMessage('Rating is required')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Comment must not exceed 1000 characters'),
  ]),
  reviewController.createReview
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([
    body('rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Comment must not exceed 1000 characters'),
  ]),
  reviewController.updateReview
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.STUDENT),
  reviewController.deleteReview
);

router.get(
  '/my-reviews',
  authenticate,
  authorize(UserRole.STUDENT),
  reviewController.getMyReviews
);

export default router;


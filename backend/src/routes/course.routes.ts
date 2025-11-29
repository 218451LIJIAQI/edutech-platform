import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { param } from 'express-validator';
import courseController from '../controllers/course.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ensureTeacherApproved } from '../middleware/teacherAccess';
import {
  createCourseValidation,
  updateCourseValidation,
  createLessonValidation,
  updateLessonValidation,
  createPackageValidation,
  updatePackageValidation,
  uploadMaterialValidation,
  updateMaterialValidation,
  getCoursesValidation,
} from '../validators/course.validator';

const router = Router();

/**
 * Course Routes
 * Note: More specific routes (like /my-courses) must come BEFORE generic routes (like /:id)
 */

// Public routes
router.get('/', validate(getCoursesValidation), courseController.getAllCourses);

router.get('/categories/all', courseController.getCategories);

// Teacher's own courses - MUST come before /:id
router.get(
  '/my-courses',
  authenticate,
  authorize(UserRole.TEACHER),
  courseController.getMyCourses
);

// Generic course by ID route - MUST come last
router.get(
  '/:id',
  optionalAuth,
  validate([param('id').notEmpty().withMessage('Course ID is required').isUUID().withMessage('Invalid course ID')]),
  courseController.getCourseById
);

// Teacher-only routes - Course Management
router.post(
  '/',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate(createCourseValidation),
  courseController.createCourse
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate([
    param('id').notEmpty().withMessage('Course ID is required').isUUID().withMessage('Invalid course ID'),
    ...updateCourseValidation,
  ]),
  courseController.updateCourse
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate([param('id').notEmpty().withMessage('Course ID is required').isUUID().withMessage('Invalid course ID')]),
  courseController.deleteCourse
);

// Lesson Management
router.post(
  '/:id/lessons',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate([
    param('id').notEmpty().withMessage('Course ID is required').isUUID().withMessage('Invalid course ID'),
    ...createLessonValidation,
  ]),
  courseController.createLesson
);

router.put(
  '/lessons/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate([
    param('id').notEmpty().withMessage('Lesson ID is required').isUUID().withMessage('Invalid lesson ID'),
    ...updateLessonValidation,
  ]),
  courseController.updateLesson
);

router.delete(
  '/lessons/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate([param('id').notEmpty().withMessage('Lesson ID is required').isUUID().withMessage('Invalid lesson ID')]),
  courseController.deleteLesson
);

// Package Management
router.post(
  '/:id/packages',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate([
    param('id').notEmpty().withMessage('Course ID is required').isUUID().withMessage('Invalid course ID'),
    ...createPackageValidation,
  ]),
  courseController.createPackage
);

router.put(
  '/packages/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate([
    param('id').notEmpty().withMessage('Package ID is required').isUUID().withMessage('Invalid package ID'),
    ...updatePackageValidation,
  ]),
  courseController.updatePackage
);

router.delete(
  '/packages/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate([param('id').notEmpty().withMessage('Package ID is required').isUUID().withMessage('Invalid package ID')]),
  courseController.deletePackage
);

// Material Management
router.post(
  '/:id/materials',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate([
    param('id').notEmpty().withMessage('Course ID is required').isUUID().withMessage('Invalid course ID'),
    ...uploadMaterialValidation,
  ]),
  courseController.uploadMaterial
);

router.put(
  '/materials/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate([
    param('id').notEmpty().withMessage('Material ID is required').isUUID().withMessage('Invalid material ID'),
    ...updateMaterialValidation,
  ]),
  courseController.updateMaterial
);

router.delete(
  '/materials/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate([param('id').notEmpty().withMessage('Material ID is required').isUUID().withMessage('Invalid material ID')]),
  courseController.deleteMaterial
);

// Course announcements/notifications (Teacher only, approved teachers)
router.post(
  '/:id/notifications',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate([param('id').notEmpty().withMessage('Course ID is required').isUUID().withMessage('Invalid course ID')]),
  courseController.sendCourseNotification
);

export default router;

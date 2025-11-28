import { Router } from 'express';
import { UserRole } from '@prisma/client';
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
router.get('/:id', optionalAuth, courseController.getCourseById);

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
  validate(updateCourseValidation),
  courseController.updateCourse
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  courseController.deleteCourse
);

// Lesson Management
router.post(
  '/:id/lessons',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate(createLessonValidation),
  courseController.createLesson
);

router.put(
  '/lessons/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate(updateLessonValidation),
  courseController.updateLesson
);

router.delete(
  '/lessons/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  courseController.deleteLesson
);

// Package Management
router.post(
  '/:id/packages',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate(createPackageValidation),
  courseController.createPackage
);

router.put(
  '/packages/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate(updatePackageValidation),
  courseController.updatePackage
);

router.delete(
  '/packages/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  courseController.deletePackage
);

// Material Management
router.post(
  '/:id/materials',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate(uploadMaterialValidation),
  courseController.uploadMaterial
);

router.put(
  '/materials/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  validate(updateMaterialValidation),
  courseController.updateMaterial
);

router.delete(
  '/materials/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  courseController.deleteMaterial
);

// Course announcements/notifications (Teacher only, approved teachers)
router.post(
  '/:id/notifications',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  courseController.sendCourseNotification
);

export default router;

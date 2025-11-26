import { Router } from 'express';
import { UserRole } from '@prisma/client';
import teacherController from '../controllers/teacher.controller';
import { authenticate, authorize } from '../middleware/auth';
import { ensureTeacherApproved } from '../middleware/teacherAccess';
import { validate } from '../middleware/validate';
import {
  updateProfileValidation,
  addCertificationValidation,
  submitVerificationValidation,
  reviewVerificationValidation,
  getTeachersValidation,
} from '../validators/teacher.validator';

const router = Router();

/**
 * Teacher Routes
 */

// Public routes
router.get(
  '/',
  validate(getTeachersValidation),
  teacherController.getAllTeachers
);

router.get('/:id', teacherController.getTeacherById);

// Teacher-only routes
router.get(
  '/me/profile',
  authenticate,
  authorize(UserRole.TEACHER),
  teacherController.getMyProfile
);

router.put(
  '/me/profile',
  authenticate,
  authorize(UserRole.TEACHER),
  validate(updateProfileValidation),
  teacherController.updateProfile
);

router.get(
  '/me/stats',
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
  teacherController.getMyStats
);

// Certifications
router.post(
  '/me/certifications',
  authenticate,
  authorize(UserRole.TEACHER),
  validate(addCertificationValidation),
  teacherController.addCertification
);

router.delete(
  '/me/certifications/:id',
  authenticate,
  authorize(UserRole.TEACHER),
  teacherController.deleteCertification
);

// Verifications
router.post(
  '/me/verifications',
  authenticate,
  authorize(UserRole.TEACHER),
  validate(submitVerificationValidation),
  teacherController.submitVerification
);

router.get(
  '/me/verifications',
  authenticate,
  authorize(UserRole.TEACHER),
  teacherController.getMyVerifications
);

// Extended Profile Routes
router.post(
  '/me/profile/submit',
  authenticate,
  authorize(UserRole.TEACHER),
  teacherController.submitExtendedProfile
);

router.get(
  '/me/profile/extended',
  authenticate,
  authorize(UserRole.TEACHER),
  teacherController.getExtendedProfile
);

router.put(
  '/me/profile/update',
  authenticate,
  authorize(UserRole.TEACHER),
  teacherController.updateExtendedProfile
);

// Admin routes
router.get(
  '/verifications/pending',
  authenticate,
  authorize(UserRole.ADMIN),
  teacherController.getPendingVerifications
);

router.put(
  '/verifications/:id/review',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(reviewVerificationValidation),
  teacherController.reviewVerification
);

// Admin - Teacher Registrations
router.get(
  '/admin/pending-registrations',
  authenticate,
  authorize(UserRole.ADMIN),
  teacherController.getPendingRegistrations
);

router.put(
  '/admin/registrations/:id/review',
  authenticate,
  authorize(UserRole.ADMIN),
  teacherController.reviewRegistration
);

// Admin - Teacher Profile Verification Routes
router.get(
  '/admin/pending-profiles',
  authenticate,
  authorize(UserRole.ADMIN),
  teacherController.getPendingProfileVerifications
);

router.put(
  '/admin/profiles/:id/review',
  authenticate,
  authorize(UserRole.ADMIN),
  teacherController.reviewTeacherProfile
);

// Verified Teachers (for students)
router.get(
  '/verified',
  teacherController.getVerifiedTeachers
);

export default router;


import { Router } from "express";
import { UserRole } from "@prisma/client";
import { param } from "express-validator";

import teacherController from "../controllers/teacher.controller";
import { authenticate, authorize } from "../middleware/auth";
import { ensureTeacherApproved } from "../middleware/teacher-access";
import { validate } from "../middleware/validate";

import {
  updateProfileValidation,
  addCertificationValidation,
  submitVerificationValidation,
  extendedProfileValidation,
  reviewVerificationValidation,
  reviewRegistrationValidation,
  getTeachersValidation,
} from "../validators/teacher.validator";

const router = Router();

const uuidParam = (name = "id") =>
  param(name)
    .notEmpty()
    .withMessage(`${name} is required`)
    .bail()
    .isUUID()
    .withMessage(`Invalid ${name}`);

const teacherOnly = [authenticate, authorize(UserRole.TEACHER)];

const approvedTeacherOnly = [
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
];

const adminOnly = [authenticate, authorize(UserRole.ADMIN)];

const teacherOrAdminOnly = [
  authenticate,
  authorize(UserRole.TEACHER, UserRole.ADMIN),
];

/**
 * Teacher routes.
 *
 * Public users can browse teacher profiles.
 * Teachers can manage their own profile, certifications, and verification submissions.
 * Approved teachers can access teacher-only operational features such as stats.
 * Admins can review teacher verifications, registrations, and profile submissions.
 */

// ================================
// PUBLIC TEACHER ROUTES
// ================================

router.get("/verified", teacherController.getVerifiedTeachers);

router.get(
  "/",
  validate(getTeachersValidation),
  teacherController.getAllTeachers,
);

// ================================
// TEACHER PROFILE ROUTES
// ================================

router.get("/me/profile", teacherOnly, teacherController.getMyProfile);

router.put(
  "/me/profile",
  teacherOnly,
  validate(updateProfileValidation),
  teacherController.updateProfile,
);

router.get("/me/stats", approvedTeacherOnly, teacherController.getMyStats);

// ================================
// TEACHER CERTIFICATION ROUTES
// ================================

router.post(
  "/me/certifications",
  teacherOnly,
  validate(addCertificationValidation),
  teacherController.addCertification,
);

router.delete(
  "/me/certifications/:id",
  teacherOnly,
  validate(uuidParam("id")),
  teacherController.deleteCertification,
);

// ================================
// TEACHER VERIFICATION ROUTES
// ================================

router.post(
  "/me/verifications",
  teacherOnly,
  validate(submitVerificationValidation),
  teacherController.submitVerification,
);

router.get(
  "/me/verifications",
  teacherOnly,
  teacherController.getMyVerifications,
);

router.get(
  "/verifications/:id/document",
  teacherOrAdminOnly,
  validate(uuidParam("id")),
  teacherController.getVerificationDocument,
);

router.get(
  "/certificate-assets",
  teacherOrAdminOnly,
  teacherController.getCertificateAsset,
);

// ================================
// EXTENDED PROFILE ROUTES
// ================================

router.post(
  "/me/profile/submit",
  teacherOnly,
  validate(extendedProfileValidation),
  teacherController.submitExtendedProfile,
);

router.get(
  "/me/profile/extended",
  teacherOnly,
  teacherController.getExtendedProfile,
);

router.put(
  "/me/profile/update",
  teacherOnly,
  validate(extendedProfileValidation),
  teacherController.updateExtendedProfile,
);

// ================================
// ADMIN VERIFICATION ROUTES
// ================================

router.get(
  "/verifications/pending",
  adminOnly,
  teacherController.getPendingVerifications,
);

router.put(
  "/verifications/:id/review",
  adminOnly,
  validate([uuidParam("id"), ...reviewVerificationValidation]),
  teacherController.reviewVerification,
);

// ================================
// ADMIN REGISTRATION ROUTES
// ================================

router.get(
  "/admin/pending-registrations",
  adminOnly,
  teacherController.getPendingRegistrations,
);

router.put(
  "/admin/registrations/:id/review",
  adminOnly,
  validate([uuidParam("id"), ...reviewRegistrationValidation]),
  teacherController.reviewRegistration,
);

// ================================
// ADMIN PROFILE VERIFICATION ROUTES
// ================================

router.get(
  "/admin/pending-profiles",
  adminOnly,
  teacherController.getPendingProfileVerifications,
);

router.put(
  "/admin/profiles/:id/review",
  adminOnly,
  validate([uuidParam("id"), ...reviewVerificationValidation]),
  teacherController.reviewTeacherProfile,
);

// ================================
// PUBLIC TEACHER DETAIL ROUTE
// ================================
// Keep this near the end to avoid conflicts with specific routes above.

router.get("/:id", validate(uuidParam("id")), teacherController.getTeacherById);

export default router;

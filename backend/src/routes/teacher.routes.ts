import { Router } from "express";
import teacherController from "../controllers/teacher.controller";
import {
  adminOnly,
  approvedTeacherOnly,
  teacherOnly,
  teacherOrAdminOnly,
} from "../middleware/teacher-access";
import { validate } from "../middleware/validate";
import { uuidParam } from "../validators/common.validator";
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
const idParam = uuidParam("id");

router.get("/verified", teacherController.getVerifiedTeachers);

router.get(
  "/",
  validate(getTeachersValidation),
  teacherController.getAllTeachers,
);

router.get("/me/profile", teacherOnly, teacherController.getMyProfile);

router.put(
  "/me/profile",
  teacherOnly,
  validate(updateProfileValidation),
  teacherController.updateProfile,
);

router.get("/me/stats", approvedTeacherOnly, teacherController.getMyStats);

router.post(
  "/me/certifications",
  teacherOnly,
  validate(addCertificationValidation),
  teacherController.addCertification,
);

router.delete(
  "/me/certifications/:id",
  teacherOnly,
  validate(idParam),
  teacherController.deleteCertification,
);

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
  validate(idParam),
  teacherController.getVerificationDocument,
);

router.get(
  "/certificate-assets",
  teacherOrAdminOnly,
  teacherController.getCertificateAsset,
);

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

router.get(
  "/verifications/pending",
  adminOnly,
  teacherController.getPendingVerifications,
);

router.put(
  "/verifications/:id/review",
  adminOnly,
  validate([idParam, ...reviewVerificationValidation]),
  teacherController.reviewVerification,
);

router.get(
  "/admin/pending-registrations",
  adminOnly,
  teacherController.getPendingRegistrations,
);

router.put(
  "/admin/registrations/:id/review",
  adminOnly,
  validate([idParam, ...reviewRegistrationValidation]),
  teacherController.reviewRegistration,
);

router.get(
  "/admin/pending-profiles",
  adminOnly,
  teacherController.getPendingProfileVerifications,
);

router.put(
  "/admin/profiles/:id/review",
  adminOnly,
  validate([idParam, ...reviewVerificationValidation]),
  teacherController.reviewTeacherProfile,
);

router.get("/:id", validate(idParam), teacherController.getTeacherById);

export default router;

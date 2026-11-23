import { Router } from "express";
import { UserRole } from "@prisma/client";
import { body } from "express-validator";
import courseController from "../controllers/course.controller";
import { authenticate, authorize, optionalAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { ensureTeacherApproved } from "../middleware/teacher-access";
import { uuidParam } from "../validators/common.validator";
import {
  createCourseValidation,
  updateCourseValidation,
  createLessonValidation,
  updateLessonValidation,
  createPackageValidation,
  updatePackageValidation,
  uploadMaterialValidation,
  updateMaterialValidation,
  sendCourseNotificationValidation,
  getCoursesValidation,
} from "../validators/course.validator";

const router = Router();

const courseIdParam = uuidParam("id", "course ID");
const lessonIdParam = uuidParam("id", "lesson ID");
const packageIdParam = uuidParam("id", "package ID");
const materialIdParam = uuidParam("id", "material ID");

const approvedTeacherOnly = [
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
];

const studentOnly = [authenticate, authorize(UserRole.STUDENT)];

const submitQuizValidation = [
  lessonIdParam,
  body("answers")
    .isArray({ min: 1 })
    .withMessage("answers must be a non-empty array"),
  body("answers.*")
    .optional({ values: "null" })
    .isInt({ min: 0 })
    .withMessage("Each answer must be a non-negative integer"),
];

router.get("/", validate(getCoursesValidation), courseController.getAllCourses);
router.get("/categories/all", courseController.getCategories);

router.get("/my-courses", approvedTeacherOnly, courseController.getMyCourses);

router.get(
  "/:id/quiz-attempts",
  approvedTeacherOnly,
  validate(courseIdParam),
  courseController.getCourseQuizAttempts,
);

router.get(
  "/:id/my-quiz-attempts",
  studentOnly,
  validate(courseIdParam),
  courseController.getMyCourseQuizAttempts,
);

router.post(
  "/lessons/:id/quiz/submit",
  studentOnly,
  validate(submitQuizValidation),
  courseController.submitLessonQuiz,
);

router.post(
  "/:id/lessons",
  approvedTeacherOnly,
  validate([courseIdParam, ...createLessonValidation]),
  courseController.createLesson,
);

router.put(
  "/lessons/:id",
  approvedTeacherOnly,
  validate([lessonIdParam, ...updateLessonValidation]),
  courseController.updateLesson,
);

router.delete(
  "/lessons/:id",
  approvedTeacherOnly,
  validate(lessonIdParam),
  courseController.deleteLesson,
);

router.post(
  "/:id/packages",
  approvedTeacherOnly,
  validate([courseIdParam, ...createPackageValidation]),
  courseController.createPackage,
);

router.put(
  "/packages/:id",
  approvedTeacherOnly,
  validate([packageIdParam, ...updatePackageValidation]),
  courseController.updatePackage,
);

router.delete(
  "/packages/:id",
  approvedTeacherOnly,
  validate(packageIdParam),
  courseController.deletePackage,
);

router.post(
  "/:id/materials",
  approvedTeacherOnly,
  validate([courseIdParam, ...uploadMaterialValidation]),
  courseController.uploadMaterial,
);

router.get(
  "/materials/:id/download",
  authenticate,
  validate(materialIdParam),
  courseController.downloadMaterial,
);

router.put(
  "/materials/:id",
  approvedTeacherOnly,
  validate([materialIdParam, ...updateMaterialValidation]),
  courseController.updateMaterial,
);

router.delete(
  "/materials/:id",
  approvedTeacherOnly,
  validate(materialIdParam),
  courseController.deleteMaterial,
);

router.post(
  "/:id/notifications",
  approvedTeacherOnly,
  validate([courseIdParam, ...sendCourseNotificationValidation]),
  courseController.sendCourseNotification,
);

router.post(
  "/",
  approvedTeacherOnly,
  validate(createCourseValidation),
  courseController.createCourse,
);

router.put(
  "/:id",
  approvedTeacherOnly,
  validate([courseIdParam, ...updateCourseValidation]),
  courseController.updateCourse,
);

router.delete(
  "/:id",
  approvedTeacherOnly,
  validate(courseIdParam),
  courseController.deleteCourse,
);

router.get(
  "/:id",
  optionalAuth,
  validate(courseIdParam),
  courseController.getCourseById,
);

export default router;

import { Router } from "express";
import { UserRole } from "@prisma/client";
import { body, param } from "express-validator";

import courseController from "../controllers/course.controller";
import { authenticate, authorize, optionalAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { ensureTeacherApproved } from "../middleware/teacher-access";

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
} from "../validators/course.validator";

const router = Router();

const uuidParam = (name = "id", label = "ID") =>
  param(name)
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .isUUID()
    .withMessage(`Invalid ${label.toLowerCase()}`);

const courseIdParam = uuidParam("id", "Course ID");
const lessonIdParam = uuidParam("id", "Lesson ID");
const packageIdParam = uuidParam("id", "Package ID");
const materialIdParam = uuidParam("id", "Material ID");

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

/**
 * Course routes.
 *
 * Public users can browse courses and categories.
 * Students can submit lesson quizzes.
 * Approved teachers can manage their own courses, lessons, packages, materials, and notifications.
 *
 * More specific routes must be declared before generic routes such as /:id.
 */

// ================================
// PUBLIC COURSE ROUTES
// ================================

router.get("/", validate(getCoursesValidation), courseController.getAllCourses);

router.get("/categories/all", courseController.getCategories);

// ================================
// TEACHER COURSE OVERVIEW
// ================================

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

// ================================
// STUDENT QUIZ ROUTES
// ================================

router.post(
  "/lessons/:id/quiz/submit",
  studentOnly,
  validate(submitQuizValidation),
  courseController.submitLessonQuiz,
);

// ================================
// LESSON MANAGEMENT
// ================================

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

// ================================
// PACKAGE MANAGEMENT
// ================================

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

// ================================
// MATERIAL MANAGEMENT
// ================================

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

// ================================
// COURSE NOTIFICATIONS
// ================================

router.post(
  "/:id/notifications",
  approvedTeacherOnly,
  validate(courseIdParam),
  courseController.sendCourseNotification,
);

// ================================
// COURSE MANAGEMENT
// ================================

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

// ================================
// GENERIC COURSE DETAILS
// ================================
// Keep this near the end to avoid conflicts with more specific GET routes.

router.get(
  "/:id",
  optionalAuth,
  validate(courseIdParam),
  courseController.getCourseById,
);

export default router;

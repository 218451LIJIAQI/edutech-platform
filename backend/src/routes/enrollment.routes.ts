import { Router } from "express";
import { UserRole } from "@prisma/client";
import { body, param } from "express-validator";

import enrollmentController from "../controllers/enrollment.controller";
import { authenticate, authorize } from "../middleware/auth";
import { ensureTeacherApproved } from "../middleware/teacher-access";
import { validate } from "../middleware/validate";

const router = Router();

const uuidParam = (name: string, label: string) =>
  param(name)
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .isUUID()
    .withMessage(`Invalid ${label.toLowerCase()}`);

const enrollmentIdParam = uuidParam("id", "Enrollment ID");
const courseIdParam = uuidParam("courseId", "Course ID");

const studentOnly = [authenticate, authorize(UserRole.STUDENT)];

const approvedTeacherOnly = [
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
];

const updateProgressValidation = [
  enrollmentIdParam,

  body()
    .custom((value) => {
      return (
        value &&
        typeof value === "object" &&
        Object.prototype.hasOwnProperty.call(value, "completedLessons")
      );
    })
    .withMessage("completedLessons is required"),

  body("completedLessons")
    .custom((value) => {
      if (Array.isArray(value)) {
        return value.every(
          (item) => typeof item === "string" && item.trim().length > 0,
        );
      }

      if (typeof value === "number") {
        return Number.isInteger(value) && value >= 0;
      }

      if (typeof value === "string" && value.trim() !== "") {
        const parsedValue = Number(value);
        return (
          Number.isFinite(parsedValue) &&
          Number.isInteger(parsedValue) &&
          parsedValue >= 0
        );
      }

      return false;
    })
    .withMessage(
      "completedLessons must be an array of non-empty lesson IDs or a non-negative integer",
    ),

  body("progress")
    .optional()
    .custom((value) => {
      if (typeof value === "number") {
        return Number.isInteger(value) && value >= 0 && value <= 100;
      }

      if (typeof value === "string" && value.trim() !== "") {
        const parsedValue = Number(value);
        return (
          Number.isFinite(parsedValue) &&
          Number.isInteger(parsedValue) &&
          parsedValue >= 0 &&
          parsedValue <= 100
        );
      }

      return false;
    })
    .withMessage("Progress must be an integer between 0 and 100"),
];

/**
 * Enrollment routes.
 *
 * Students can view their enrollments, check course access, and update learning progress.
 * Approved teachers can view enrolled students and course enrollment statistics.
 */

// ================================
// STUDENT ENROLLMENT ROUTES
// ================================

router.get("/my-courses", studentOnly, enrollmentController.getMyEnrollments);

router.get(
  "/check-access/:courseId",
  studentOnly,
  validate(courseIdParam),
  enrollmentController.checkAccess,
);

router.get(
  "/:id",
  studentOnly,
  validate(enrollmentIdParam),
  enrollmentController.getEnrollmentById,
);

router.put(
  "/:id/progress",
  studentOnly,
  validate(updateProgressValidation),
  enrollmentController.updateProgress,
);

// ================================
// TEACHER ENROLLMENT ROUTES
// ================================

router.get(
  "/course/:courseId/students",
  approvedTeacherOnly,
  validate(courseIdParam),
  enrollmentController.getCourseStudents,
);

router.get(
  "/course/:courseId/stats",
  approvedTeacherOnly,
  validate(courseIdParam),
  enrollmentController.getCourseStats,
);

export default router;

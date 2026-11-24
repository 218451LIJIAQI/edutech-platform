import { Router } from "express";
import { body } from "express-validator";
import enrollmentController from "../controllers/enrollment.controller";
import { approvedTeacherOnly, studentOnly } from "../middleware/teacher-access";
import { validate } from "../middleware/validate";
import { parseFiniteNumber } from "../utils/http";
import { uuidParam } from "../validators/common.validator";

const router = Router();

const enrollmentIdParam = uuidParam("id", "enrollment ID");
const courseIdParam = uuidParam("courseId", "course ID");

const isNonNegativeIntegerInput = (value: unknown): boolean => {
  const parsed = parseFiniteNumber(value);
  return parsed !== undefined && Number.isInteger(parsed) && parsed >= 0;
};

const updateProgressValidation = [
  enrollmentIdParam,
  body()
    .custom(
      (value) =>
        Boolean(value) &&
        typeof value === "object" &&
        Object.prototype.hasOwnProperty.call(value, "completedLessons"),
    )
    .withMessage("completedLessons is required"),
  body("completedLessons")
    .custom((value) => {
      if (Array.isArray(value)) {
        return value.every(
          (item) => typeof item === "string" && item.trim().length > 0,
        );
      }
      return isNonNegativeIntegerInput(value);
    })
    .withMessage(
      "completedLessons must be an array of non-empty lesson IDs or a non-negative integer",
    ),
  body("progress")
    .optional()
    .custom((value) => {
      const parsed = parseFiniteNumber(value);
      return (
        parsed !== undefined &&
        Number.isInteger(parsed) &&
        parsed >= 0 &&
        parsed <= 100
      );
    })
    .withMessage("Progress must be an integer between 0 and 100"),
];

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

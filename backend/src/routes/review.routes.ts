import { Router } from "express";
import { UserRole } from "@prisma/client";
import { body, query, param } from "express-validator";

import reviewController from "../controllers/review.controller";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

const uuidParam = (name: string) =>
  param(name)
    .notEmpty()
    .withMessage(`${name} is required`)
    .bail()
    .isUUID()
    .withMessage(`Invalid ${name}`);

const reviewIdParam = uuidParam("id");
const teacherIdParam = uuidParam("teacherId");
const courseIdParam = uuidParam("courseId");

const studentOnly = [authenticate, authorize(UserRole.STUDENT)];

const paginationValidation = [
  query("page")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional({ values: "falsy" })
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
];

const createReviewValidation = [
  body("enrollmentId")
    .notEmpty()
    .withMessage("Enrollment ID is required")
    .bail()
    .isUUID()
    .withMessage("Invalid enrollment ID"),

  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .bail()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("comment")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Comment must not exceed 1000 characters"),
];

const updateReviewValidation = [
  reviewIdParam,

  body()
    .custom((value) => {
      return (
        value &&
        typeof value === "object" &&
        ("rating" in value || "comment" in value)
      );
    })
    .withMessage("Either rating or comment is required"),

  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("comment")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Comment must not exceed 1000 characters"),
];

/**
 * Review routes.
 *
 * Public users can view teacher reviews.
 * Students can create, update, delete, and view their own reviews.
 */

// ================================
// PUBLIC REVIEW ROUTES
// ================================

router.get(
  "/teacher/:teacherId",
  validate([teacherIdParam, ...paginationValidation]),
  reviewController.getTeacherReviews,
);

router.get(
  "/course/:courseId",
  validate([courseIdParam, ...paginationValidation]),
  reviewController.getCourseReviews,
);

// ================================
// STUDENT REVIEW ROUTES
// ================================

router.post(
  "/",
  studentOnly,
  validate(createReviewValidation),
  reviewController.createReview,
);

router.get("/my-reviews", studentOnly, reviewController.getMyReviews);

router.put(
  "/:id",
  studentOnly,
  validate(updateReviewValidation),
  reviewController.updateReview,
);

router.delete(
  "/:id",
  studentOnly,
  validate(reviewIdParam),
  reviewController.deleteReview,
);

export default router;

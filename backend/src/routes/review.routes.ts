import { Router } from "express";
import { body } from "express-validator";
import reviewController from "../controllers/review.controller";
import { studentOnly } from "../middleware/teacher-access";
import { validate } from "../middleware/validate";
import {
  paginationQueryValidators,
  uuidBodyField,
  uuidParam,
} from "../validators/common.validator";

const router = Router();

const reviewIdParam = uuidParam("id");
const teacherIdParam = uuidParam("teacherId");
const courseIdParam = uuidParam("courseId");
const paginationValidation = paginationQueryValidators(50);

const commentField = body("comment")
  .optional({ values: "falsy" })
  .trim()
  .isLength({ max: 1000 })
  .withMessage("Comment must not exceed 1000 characters");

const createReviewValidation = [
  uuidBodyField("enrollmentId", "enrollment ID"),
  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .bail()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  commentField,
];

const updateReviewValidation = [
  reviewIdParam,
  body()
    .custom(
      (value) =>
        Boolean(value) &&
        typeof value === "object" &&
        ("rating" in value || "comment" in value),
    )
    .withMessage("Either rating or comment is required"),
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  commentField,
];

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

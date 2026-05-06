import { Request, Response } from "express";
import reviewService from "../services/review.service";
import asyncHandler from "../utils/async-handler";
import { AuthenticationError, BadRequestError } from "../utils/errors";

/**
 * Review Controller
 * Handles HTTP requests for review-related endpoints.
 */

const MAX_COMMENT_LENGTH = 2000;
const MAX_LIMIT = 100;

const sendSuccess = (
  res: Response,
  data?: unknown,
  message?: string,
  statusCode = 200,
) => {
  res.status(statusCode).json({
    status: "success",
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
  });
};

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AuthenticationError("Authentication required");
  }

  return req.user.id;
};

const getFirstQueryValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0].trim() : undefined;
  }

  if (typeof value === "string") {
    const parsed = value.trim();
    return parsed.length > 0 ? parsed : undefined;
  }

  return undefined;
};

const parseRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} is required`);
  }

  const parsed = value.trim();

  if (parsed.length === 0) {
    throw new BadRequestError(`${fieldName} cannot be empty`);
  }

  return parsed;
};

const parseOptionalComment = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new BadRequestError("comment must be a string");
  }

  const parsed = value.trim();

  if (parsed.length === 0) {
    return undefined;
  }

  if (parsed.length > MAX_COMMENT_LENGTH) {
    throw new BadRequestError(
      `comment must not exceed ${MAX_COMMENT_LENGTH} characters`,
    );
  }

  return parsed;
};

const parseRating = (value: unknown, required = true): number | undefined => {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new BadRequestError("rating is required");
    }

    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    throw new BadRequestError("rating must be an integer between 1 and 5");
  }

  return parsed;
};

const parsePositiveInteger = (
  value: unknown,
  fieldName: string,
  max = MAX_LIMIT,
): number | undefined => {
  const rawValue = getFirstQueryValue(value);

  if (!rawValue) {
    return undefined;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestError(`${fieldName} must be a positive integer`);
  }

  return Math.min(parsed, max);
};

class ReviewController {
  /**
   * Create a review.
   * POST /api/reviews
   */
  createReview = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const enrollmentId = parseRequiredString(
      req.body?.enrollmentId,
      "enrollmentId",
    );
    const rating = parseRating(req.body?.rating, true) as number;
    const comment = parseOptionalComment(req.body?.comment);

    const review = await reviewService.createReview(
      userId,
      enrollmentId,
      rating,
      comment,
    );

    sendSuccess(res, review, "Review created successfully", 201);
  });

  /**
   * Update a review.
   * PUT /api/reviews/:id
   */
  updateReview = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const reviewId = parseRequiredString(req.params.id, "Review ID");

    const rating = parseRating(req.body?.rating, false);
    const comment = parseOptionalComment(req.body?.comment);

    if (rating === undefined && comment === undefined) {
      throw new BadRequestError(
        "At least one of rating or comment is required",
      );
    }

    const review = await reviewService.updateReview(
      userId,
      reviewId,
      rating,
      comment,
    );

    sendSuccess(res, review, "Review updated successfully");
  });

  /**
   * Delete a review.
   * DELETE /api/reviews/:id
   */
  deleteReview = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const reviewId = parseRequiredString(req.params.id, "Review ID");

    const result = await reviewService.deleteReview(userId, reviewId);

    sendSuccess(
      res,
      undefined,
      result.message || "Review deleted successfully",
    );
  });

  /**
   * Get teacher reviews.
   * GET /api/reviews/teacher/:teacherId
   */
  getTeacherReviews = asyncHandler(async (req: Request, res: Response) => {
    const teacherId = parseRequiredString(req.params.teacherId, "Teacher ID");
    const page = parsePositiveInteger(req.query.page, "page");
    const limit = parsePositiveInteger(req.query.limit, "limit");

    const result = await reviewService.getTeacherReviews(
      teacherId,
      page,
      limit,
    );

    sendSuccess(res, result);
  });

  /**
   * Get course reviews.
   * GET /api/reviews/course/:courseId
   */
  getCourseReviews = asyncHandler(async (req: Request, res: Response) => {
    const courseId = parseRequiredString(req.params.courseId, "Course ID");
    const page = parsePositiveInteger(req.query.page, "page");
    const limit = parsePositiveInteger(req.query.limit, "limit");

    const result = await reviewService.getCourseReviews(courseId, page, limit);

    sendSuccess(res, result);
  });

  /**
   * Get current user's reviews.
   * GET /api/reviews/my-reviews
   */
  getMyReviews = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const reviews = await reviewService.getUserReviews(userId);

    sendSuccess(res, reviews);
  });
}

export default new ReviewController();

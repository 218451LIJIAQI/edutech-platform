import { Request, Response } from "express";
import reviewService from "../services/review.service";
import asyncHandler from "../utils/async-handler";
import { BadRequestError } from "../utils/errors";
import {
  parseNumber,
  parseOptionalString,
  parseQueryPositiveInt,
  parseRequiredParam,
  parseRequiredString,
  requireAuthUserId,
  sendCreated,
  sendSuccess,
} from "../utils/http";

const MAX_COMMENT_LENGTH = 2000;
const MAX_LIMIT = 100;

const parseRating = (value: unknown, required: boolean): number | undefined =>
  parseNumber(value, "rating", {
    required,
    min: 1,
    max: 5,
    integer: true,
  });

class ReviewController {
  createReview = asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewService.createReview(
      requireAuthUserId(req),
      parseRequiredString(req.body?.enrollmentId, "enrollmentId"),
      parseRating(req.body?.rating, true) as number,
      parseOptionalString(req.body?.comment, "comment", MAX_COMMENT_LENGTH),
    );
    sendCreated(res, review, "Review created successfully");
  });

  updateReview = asyncHandler(async (req: Request, res: Response) => {
    const rating = parseRating(req.body?.rating, false);
    const comment = parseOptionalString(
      req.body?.comment,
      "comment",
      MAX_COMMENT_LENGTH,
    );

    if (rating === undefined && comment === undefined) {
      throw new BadRequestError(
        "At least one of rating or comment is required",
      );
    }

    const review = await reviewService.updateReview(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Review ID"),
      rating,
      comment,
    );
    sendSuccess(res, review, "Review updated successfully");
  });

  deleteReview = asyncHandler(async (req: Request, res: Response) => {
    const result = await reviewService.deleteReview(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Review ID"),
    );
    sendSuccess(
      res,
      undefined,
      result.message || "Review deleted successfully",
    );
  });

  getTeacherReviews = asyncHandler(async (req: Request, res: Response) => {
    const result = await reviewService.getTeacherReviews(
      parseRequiredParam(req.params.teacherId, "Teacher ID"),
      parseQueryPositiveInt(req.query.page, "page", { max: MAX_LIMIT }),
      parseQueryPositiveInt(req.query.limit, "limit", { max: MAX_LIMIT }),
    );
    sendSuccess(res, result);
  });

  getCourseReviews = asyncHandler(async (req: Request, res: Response) => {
    const result = await reviewService.getCourseReviews(
      parseRequiredParam(req.params.courseId, "Course ID"),
      parseQueryPositiveInt(req.query.page, "page", { max: MAX_LIMIT }),
      parseQueryPositiveInt(req.query.limit, "limit", { max: MAX_LIMIT }),
    );
    sendSuccess(res, result);
  });

  getMyReviews = asyncHandler(async (req: Request, res: Response) => {
    const reviews = await reviewService.getUserReviews(requireAuthUserId(req));
    sendSuccess(res, reviews);
  });
}

export default new ReviewController();

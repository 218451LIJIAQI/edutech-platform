import { Request, Response } from 'express';
import reviewService from '../services/review.service';
import asyncHandler from '../utils/asyncHandler';
import { BadRequestError } from '../utils/errors';

/**
 * Review Controller
 * Handles HTTP requests for review-related endpoints
 */
class ReviewController {
  /**
   * Create a review
   * POST /api/reviews
   */
  createReview = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { enrollmentId, rating, comment } = (req.body || {}) as {
      enrollmentId?: string;
      rating?: number | string;
      comment?: string;
    };

    if (!enrollmentId || typeof enrollmentId !== 'string' || !enrollmentId.trim()) {
      throw new BadRequestError('Enrollment ID is required');
    }

    const normalizedEnrollmentId = enrollmentId.trim();

    if (rating === undefined || rating === null) {
      throw new BadRequestError('Rating is required');
    }

    const normalizedRating =
      typeof rating === 'number' ? rating : Number(rating);

    if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      throw new BadRequestError('Rating must be a number between 1 and 5');
    }

    const normalizedComment =
      typeof comment === 'string' ? comment.trim() : comment;

    const review = await reviewService.createReview(
      userId,
      normalizedEnrollmentId,
      normalizedRating,
      normalizedComment
    );

    res.status(201).json({
      status: 'success',
      message: 'Review created successfully',
      data: review,
    });
  });

  /**
   * Update a review
   * PUT /api/reviews/:id
   */
  updateReview = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params;
    const { rating, comment } = (req.body || {}) as {
      rating?: number | string;
      comment?: string;
    };

    const reviewId = typeof id === 'string' ? id.trim() : String(id);

    let normalizedRating: number | undefined = undefined;
    if (rating !== undefined && rating !== null) {
      normalizedRating = typeof rating === 'number' ? rating : Number(rating);
      if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
        throw new BadRequestError('Rating must be a number between 1 and 5');
      }
    }

    const normalizedComment =
      typeof comment === 'string' ? comment.trim() : comment;

    const review = await reviewService.updateReview(
      userId,
      reviewId,
      normalizedRating,
      normalizedComment
    );

    res.status(200).json({
      status: 'success',
      message: 'Review updated successfully',
      data: review,
    });
  });

  /**
   * Delete a review
   * DELETE /api/reviews/:id
   */
  deleteReview = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params;

    const reviewId = typeof id === 'string' ? id.trim() : String(id);

    const result = await reviewService.deleteReview(userId, reviewId);

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  });

  /**
   * Get teacher reviews
   * GET /api/reviews/teacher/:teacherId
   */
  getTeacherReviews = asyncHandler(async (req: Request, res: Response) => {
    const { teacherId } = req.params as { teacherId: string };
    const { page, limit } = req.query as {
      page?: string | string[];
      limit?: string | string[];
    };

    const pickFirst = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

    const normalizedTeacherId =
      typeof teacherId === 'string' ? teacherId.trim() : String(teacherId);

    const pageNumRaw = pickFirst(page);
    const limitNumRaw = pickFirst(limit);

    const parsedPage = pageNumRaw ? Number.parseInt(pageNumRaw, 10) : undefined;
    const parsedLimit = limitNumRaw ? Number.parseInt(limitNumRaw, 10) : undefined;

    const safePage = parsedPage && Number.isFinite(parsedPage) ? Math.max(parsedPage, 1) : undefined;
    const safeLimit = parsedLimit && Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : undefined;

    const result = await reviewService.getTeacherReviews(
      normalizedTeacherId,
      safePage,
      safeLimit
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Get user's reviews
   * GET /api/reviews/my-reviews
   */
  getMyReviews = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;

    const reviews = await reviewService.getUserReviews(userId);

    res.status(200).json({
      status: 'success',
      data: reviews,
    });
  });
}

export default new ReviewController();

import { Request, Response } from 'express';
import reviewService from '../services/review.service';
import asyncHandler from '../utils/asyncHandler';

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
    const userId = req.user!.id;
    const { enrollmentId, rating, comment } = req.body;

    const review = await reviewService.createReview(
      userId,
      enrollmentId,
      rating,
      comment
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
    const userId = req.user!.id;
    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await reviewService.updateReview(userId, id, rating, comment);

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
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await reviewService.deleteReview(userId, id);

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
    const { teacherId } = req.params;
    const { page, limit } = req.query;

    const result = await reviewService.getTeacherReviews(
      teacherId,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
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
    const userId = req.user!.id;

    const reviews = await reviewService.getUserReviews(userId);

    res.status(200).json({
      status: 'success',
      data: reviews,
    });
  });
}

export default new ReviewController();


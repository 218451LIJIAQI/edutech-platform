import api from './api';
import { Review, ApiResponse, PaginatedResponse } from '@/types';

/**
 * Review Service
 * Handles all review-related API calls
 */

export const reviewService = {
  /**
   * Create a review
   */
  createReview: async (
    enrollmentId: string,
    rating: number,
    comment?: string
  ): Promise<Review> => {
    const response = await api.post<ApiResponse<Review>>('/reviews', {
      enrollmentId,
      rating,
      comment,
    });
    return response.data.data!;
  },

  /**
   * Update a review
   */
  updateReview: async (
    id: string,
    rating?: number,
    comment?: string
  ): Promise<Review> => {
    const response = await api.put<ApiResponse<Review>>(`/reviews/${id}`, {
      rating,
      comment,
    });
    return response.data.data!;
  },

  /**
   * Delete a review
   */
  deleteReview: async (id: string): Promise<void> => {
    await api.delete(`/reviews/${id}`);
  },

  /**
   * Get reviews for a teacher
   */
  getTeacherReviews: async (
    teacherId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Review>['data']> => {
    const response = await api.get<PaginatedResponse<Review>>(
      `/reviews/teacher/${teacherId}`,
      {
        params: { page, limit },
      }
    );
    return response.data.data;
  },

  /**
   * Get user's reviews
   */
  getMyReviews: async (): Promise<Review[]> => {
    const response = await api.get<ApiResponse<Review[]>>('/reviews/my-reviews');
    return response.data.data!;
  },
};

export default reviewService;


import api from './api';
import { Review, ApiResponse } from '@/types';
import { extractData } from './response-utils';

/**
 * Review Service
 * Handles all review-related API calls
 */

export interface TeacherReviewListResponse {
  reviews: Review[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const reviewService = {
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
    return extractData(response);
  },

  getTeacherReviews: async (
    teacherId: string,
    params?: { page?: number; limit?: number }
  ): Promise<TeacherReviewListResponse> => {
    const response = await api.get<ApiResponse<TeacherReviewListResponse>>(
      `/reviews/teacher/${teacherId}`,
      { params }
    );
    return extractData(response);
  },

  getCourseReviews: async (
    courseId: string,
    params?: { page?: number; limit?: number }
  ): Promise<TeacherReviewListResponse> => {
    const response = await api.get<ApiResponse<TeacherReviewListResponse>>(
      `/reviews/course/${courseId}`,
      { params }
    );
    return extractData(response);
  },

  getMyReviews: async (): Promise<Review[]> => {
    const response = await api.get<ApiResponse<Review[]>>('/reviews/my-reviews');
    return extractData(response);
  },

};

export default reviewService;

import api from './api';
import { Review, ApiResponse } from '@/types';
import { extractData } from './response-utils';
import { normalizeReviewAssets } from '@/utils/asset-normalizers';

export interface TeacherReviewListResponse {
  reviews: Review[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const normalizeReviewList = (
  data: TeacherReviewListResponse
): TeacherReviewListResponse => ({
  ...data,
  reviews: (data.reviews || []).map(normalizeReviewAssets),
});

const reviewService = {
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
    return normalizeReviewAssets(extractData(response));
  },

  getCourseReviews: async (
    courseId: string,
    params?: { page?: number; limit?: number }
  ): Promise<TeacherReviewListResponse> => {
    const response = await api.get<ApiResponse<TeacherReviewListResponse>>(
      `/reviews/course/${courseId}`,
      { params }
    );
    return normalizeReviewList(extractData(response));
  },

  getTeacherReviews: async (
    teacherId: string,
    params?: { page?: number; limit?: number }
  ): Promise<TeacherReviewListResponse> => {
    const response = await api.get<ApiResponse<TeacherReviewListResponse>>(
      `/reviews/teacher/${teacherId}`,
      { params }
    );
    return normalizeReviewList(extractData(response));
  },

  getMyReviews: async (): Promise<Review[]> => {
    const response = await api.get<ApiResponse<Review[]>>('/reviews/my-reviews');
    return extractData(response).map(normalizeReviewAssets);
  },
};

export default reviewService;

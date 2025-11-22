import api from './api';
import { Enrollment, ApiResponse } from '@/types';

/**
 * Enrollment Service
 * Handles all enrollment-related API calls
 */

export const enrollmentService = {
  /**
   * Get user's enrolled courses
   */
  getMyCourses: async (): Promise<Enrollment[]> => {
    const response = await api.get<ApiResponse<Enrollment[]>>('/enrollments/my-courses');
    return response.data.data!;
  },

  /**
   * Get enrollment by ID
   */
  getEnrollmentById: async (id: string): Promise<Enrollment> => {
    const response = await api.get<ApiResponse<Enrollment>>(`/enrollments/${id}`);
    return response.data.data!;
  },

  /**
   * Update enrollment progress
   */
  updateProgress: async (
    id: string,
    completedLessons: number,
    progress: number
  ): Promise<Enrollment> => {
    const response = await api.put<ApiResponse<Enrollment>>(
      `/enrollments/${id}/progress`,
      {
        completedLessons,
        progress,
      }
    );
    return response.data.data!;
  },

  /**
   * Check if user has access to a course
   */
  checkAccess: async (courseId: string): Promise<boolean> => {
    const response = await api.get<ApiResponse<{ hasAccess: boolean }>>(
      `/enrollments/check-access/${courseId}`
    );
    return response.data.data?.hasAccess || false;
  },

  /**
   * Get course students (Teacher only)
   */
  getCourseStudents: async (courseId: string): Promise<Enrollment[]> => {
    const response = await api.get<ApiResponse<Enrollment[]>>(
      `/enrollments/course/${courseId}/students`
    );
    return response.data.data!;
  },

  /**
   * Get course statistics (Teacher only)
   */
  getCourseStats: async (
    courseId: string
  ): Promise<{
    totalStudents: number;
    averageProgress: number;
    completionRate: number;
  }> => {
    const response = await api.get<
      ApiResponse<{
        totalStudents: number;
        averageProgress: number;
        completionRate: number;
      }>
    >(`/enrollments/course/${courseId}/stats`);
    return response.data.data!;
  },
};

export default enrollmentService;


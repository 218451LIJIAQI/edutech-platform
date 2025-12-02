import api from './api';
import { Enrollment, ApiResponse } from '@/types';

/**
 * Enrollment Service
 * Handles all enrollment-related API calls
 */

/**
 * Helper function to extract data from API response with error handling
 */
function extractData<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.data) {
    throw new Error(response.data.message || 'No data received from server');
  }
  return response.data.data;
}

export const enrollmentService = {
  /**
   * Get user's enrolled courses
   */
  getMyCourses: async (): Promise<Enrollment[]> => {
    try {
      const response = await api.get<ApiResponse<Enrollment[]>>('/enrollments/my-courses');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch enrolled courses:', error);
      throw error;
    }
  },

  /**
   * Get enrollment by ID
   */
  getEnrollmentById: async (id: string): Promise<Enrollment> => {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Enrollment ID is required');
      }
      const response = await api.get<ApiResponse<Enrollment>>(`/enrollments/${id}`);
      return extractData(response);
    } catch (error) {
      console.error(`Failed to fetch enrollment ${id}:`, error);
      throw error;
    }
  },

  /**
   * Update enrollment progress
   */
  updateProgress: async (
    id: string,
    completedLessons: number,
    progress: number
  ): Promise<Enrollment> => {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Enrollment ID is required');
      }
      if (completedLessons < 0) {
        throw new Error('Completed lessons cannot be negative');
      }
      if (progress < 0 || progress > 100) {
        throw new Error('Progress must be between 0 and 100');
      }
      const response = await api.put<ApiResponse<Enrollment>>(
        `/enrollments/${id}/progress`,
        {
          completedLessons,
          progress,
        }
      );
      return extractData(response);
    } catch (error) {
      console.error(`Failed to update progress for enrollment ${id}:`, error);
      throw error;
    }
  },

  /**
   * Check if user has access to a course
   */
  checkAccess: async (courseId: string): Promise<boolean> => {
    try {
      if (!courseId || courseId.trim() === '') {
        throw new Error('Course ID is required');
      }
      const response = await api.get<ApiResponse<{ hasAccess: boolean }>>(
        `/enrollments/check-access/${courseId}`
      );
      return response.data.data?.hasAccess || false;
    } catch (error) {
      console.error(`Failed to check access for course ${courseId}:`, error);
      throw error;
    }
  },

  /**
   * Get course students (Teacher only)
   */
  getCourseStudents: async (courseId: string): Promise<Enrollment[]> => {
    try {
      if (!courseId || courseId.trim() === '') {
        throw new Error('Course ID is required');
      }
      const response = await api.get<ApiResponse<Enrollment[]>>(
        `/enrollments/course/${courseId}/students`
      );
      return response.data.data || [];
    } catch (error) {
      console.error(`Failed to fetch students for course ${courseId}:`, error);
      throw error;
    }
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
    try {
      if (!courseId || courseId.trim() === '') {
        throw new Error('Course ID is required');
      }
      const response = await api.get<
        ApiResponse<{
          totalStudents: number;
          averageProgress: number;
          completionRate: number;
        }>
      >(`/enrollments/course/${courseId}/stats`);
      return extractData(response);
    } catch (error) {
      console.error(`Failed to fetch stats for course ${courseId}:`, error);
      throw error;
    }
  },
};

export default enrollmentService;

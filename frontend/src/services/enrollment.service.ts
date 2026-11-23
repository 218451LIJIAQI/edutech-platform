import api from './api';
import clientLogger from '@/utils/logger';
import { Enrollment, ApiResponse } from '@/types';
import { extractData, extractDataOrDefault } from './response-utils';
import { normalizeEnrollmentAssets } from '@/utils/asset-normalizers';

const enrollmentService = {
  getMyCourses: async (): Promise<Enrollment[]> => {
    try {
      const response = await api.get<ApiResponse<Enrollment[]>>('/enrollments/my-courses');
      return extractDataOrDefault(response, []).map(normalizeEnrollmentAssets);
    } catch (error) {
      clientLogger.error('Failed to fetch enrolled courses:', error);
      throw error;
    }
  },

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
      return normalizeEnrollmentAssets(extractData(response));
    } catch (error) {
      clientLogger.error(`Failed to update progress for enrollment ${id}:`, error);
      throw error;
    }
  },

  checkAccess: async (courseId: string): Promise<boolean> => {
    try {
      if (!courseId || courseId.trim() === '') {
        throw new Error('Course ID is required');
      }
      const response = await api.get<ApiResponse<{ hasAccess: boolean }>>(
        `/enrollments/check-access/${courseId}`
      );
      return extractDataOrDefault(response, { hasAccess: false }).hasAccess;
    } catch (error) {
      clientLogger.error(`Failed to check access for course ${courseId}:`, error);
      throw error;
    }
  },

  getCourseStudents: async (courseId: string): Promise<Enrollment[]> => {
    try {
      if (!courseId || courseId.trim() === '') {
        throw new Error('Course ID is required');
      }
      const response = await api.get<ApiResponse<Enrollment[]>>(
        `/enrollments/course/${courseId}/students`
      );
      return extractDataOrDefault(response, []).map(normalizeEnrollmentAssets);
    } catch (error) {
      clientLogger.error(`Failed to fetch students for course ${courseId}:`, error);
      throw error;
    }
  },

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
      clientLogger.error(`Failed to fetch stats for course ${courseId}:`, error);
      throw error;
    }
  },
};

export default enrollmentService;

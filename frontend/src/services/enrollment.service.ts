import api from './api';
import { Enrollment, ApiResponse } from '@/types';
import { extractData, extractDataOrDefault } from './response-utils';
import { normalizeEnrollmentAssets } from '@/utils/asset-normalizers';

const requireNonEmptyId = (value: string, label: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  return trimmed;
};

const enrollmentService = {
  getMyCourses: async (): Promise<Enrollment[]> => {
    const response = await api.get<ApiResponse<Enrollment[]>>('/enrollments/my-courses');
    return extractDataOrDefault(response, []).map(normalizeEnrollmentAssets);
  },

  updateProgress: async (
    id: string,
    completedLessons: number,
    progress: number
  ): Promise<Enrollment> => {
    const enrollmentId = requireNonEmptyId(id, 'Enrollment ID');
    if (completedLessons < 0) {
      throw new Error('Completed lessons cannot be negative');
    }
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    const response = await api.put<ApiResponse<Enrollment>>(
      `/enrollments/${enrollmentId}/progress`,
      { completedLessons, progress }
    );
    return normalizeEnrollmentAssets(extractData(response));
  },

  checkAccess: async (courseId: string): Promise<boolean> => {
    const validCourseId = requireNonEmptyId(courseId, 'Course ID');
    const response = await api.get<ApiResponse<{ hasAccess: boolean }>>(
      `/enrollments/check-access/${validCourseId}`
    );
    return extractDataOrDefault(response, { hasAccess: false }).hasAccess;
  },

  getCourseStudents: async (courseId: string): Promise<Enrollment[]> => {
    const validCourseId = requireNonEmptyId(courseId, 'Course ID');
    const response = await api.get<ApiResponse<Enrollment[]>>(
      `/enrollments/course/${validCourseId}/students`
    );
    return extractDataOrDefault(response, []).map(normalizeEnrollmentAssets);
  },

  getCourseStats: async (
    courseId: string
  ): Promise<{
    totalStudents: number;
    averageProgress: number;
    completionRate: number;
  }> => {
    const validCourseId = requireNonEmptyId(courseId, 'Course ID');
    const response = await api.get<
      ApiResponse<{
        totalStudents: number;
        averageProgress: number;
        completionRate: number;
      }>
    >(`/enrollments/course/${validCourseId}/stats`);
    return extractData(response);
  },
};

export default enrollmentService;

import api from './api';
import { Course, Lesson, LessonPackage, Material, ApiResponse, PaginatedResponse } from '@/types';

/**
 * Course Service
 * Handles all course-related API calls
 */

export const courseService = {
  /**
   * Get all published courses
   */
  getAllCourses: async (params?: {
    category?: string;
    teacherId?: string;
    search?: string;
    minRating?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Course>['data']> => {
    const response = await api.get<PaginatedResponse<Course>>('/courses', { params });
    return response.data.data;
  },

  /**
   * Get course by ID
   */
  getCourseById: async (id: string): Promise<Course> => {
    const response = await api.get<ApiResponse<Course>>(`/courses/${id}`);
    return response.data.data!;
  },

  /**
   * Get course categories
   */
  getCategories: async (): Promise<string[]> => {
    const response = await api.get<ApiResponse<string[]>>('/courses/categories/all');
    return response.data.data!;
  },

  /**
   * Get teacher's own courses (Teacher only)
   */
  getMyCourses: async (): Promise<Course[]> => {
    const response = await api.get<ApiResponse<Course[]>>('/courses/my-courses');
    return response.data.data!;
  },

  /**
   * Create a new course (Teacher only)
   */
  createCourse: async (data: Partial<Course>): Promise<Course> => {
    const response = await api.post<ApiResponse<Course>>('/courses', data);
    return response.data.data!;
  },

  /**
   * Update course (Teacher only)
   */
  updateCourse: async (id: string, data: Partial<Course>): Promise<Course> => {
    const response = await api.put<ApiResponse<Course>>(`/courses/${id}`, data);
    return response.data.data!;
  },

  /**
   * Delete course (Teacher only)
   */
  deleteCourse: async (id: string): Promise<void> => {
    await api.delete(`/courses/${id}`);
  },

  /**
   * Create lesson (Teacher only)
   */
  createLesson: async (courseId: string, data: Partial<Lesson>): Promise<Lesson> => {
    const response = await api.post<ApiResponse<Lesson>>(
      `/courses/${courseId}/lessons`,
      data
    );
    return response.data.data!;
  },

  /**
   * Update lesson (Teacher only)
   */
  updateLesson: async (lessonId: string, data: Partial<Lesson>): Promise<Lesson> => {
    const response = await api.put<ApiResponse<Lesson>>(
      `/courses/lessons/${lessonId}`,
      data
    );
    return response.data.data!;
  },

  /**
   * Delete lesson (Teacher only)
   */
  deleteLesson: async (lessonId: string): Promise<void> => {
    await api.delete(`/courses/lessons/${lessonId}`);
  },

  /**
   * Create lesson package (Teacher only)
   */
  createPackage: async (courseId: string, data: Partial<LessonPackage>): Promise<LessonPackage> => {
    const response = await api.post<ApiResponse<LessonPackage>>(
      `/courses/${courseId}/packages`,
      data
    );
    return response.data.data!;
  },

  /**
   * Update lesson package (Teacher only)
   */
  updatePackage: async (packageId: string, data: Partial<LessonPackage>): Promise<LessonPackage> => {
    const response = await api.put<ApiResponse<LessonPackage>>(
      `/courses/packages/${packageId}`,
      data
    );
    return response.data.data!;
  },

  /**
   * Delete lesson package (Teacher only)
   */
  deletePackage: async (packageId: string): Promise<void> => {
    await api.delete(`/courses/packages/${packageId}`);
  },

  /**
   * Upload material (Teacher only)
   */
  uploadMaterial: async (courseId: string, data: Partial<Material>): Promise<Material> => {
    const response = await api.post<ApiResponse<Material>>(
      `/courses/${courseId}/materials`,
      data
    );
    return response.data.data!;
  },

  /**
   * Update material (Teacher only)
   */
  updateMaterial: async (materialId: string, data: Partial<Material>): Promise<Material> => {
    const response = await api.put<ApiResponse<Material>>(
      `/courses/materials/${materialId}`,
      data
    );
    return response.data.data!;
  },

  /**
   * Delete material (Teacher only)
   */
  deleteMaterial: async (materialId: string): Promise<void> => {
    await api.delete(`/courses/materials/${materialId}`);
  },
};

export default courseService;


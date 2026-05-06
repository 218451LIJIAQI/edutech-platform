import api from './api';
import { Course, Lesson, LessonPackage, Material, ApiResponse, PaginatedResponse, QuizAttempt, QuizSubmissionResult } from '@/types';
import { extractData, extractPaginatedData } from './response-utils';
import {
  normalizeCourseAssets,
  normalizeLessonAssets,
  normalizeMaterialAssets,
} from '@/utils/asset-normalizers';

/**
 * Course Service
 * Handles all course-related API calls
 */

const courseService = {
  /**
   * Get all published courses
   */
  getAllCourses: async (params?: {
    category?: string;
    teacherId?: string;
    search?: string;
    courseType?: 'LIVE' | 'RECORDED' | 'HYBRID';
    minRating?: number;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'NEWEST' | 'RATING' | 'POPULARITY' | 'PRICE_ASC' | 'PRICE_DESC';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Course>['data']> => {
    const response = await api.get<PaginatedResponse<Course>>('/courses', { params });
    const data = extractPaginatedData(response);
    const normalizedCourses = ((data.items || data.courses || []) as Course[]).map((course) =>
      normalizeCourseAssets(course)
    );
    return {
      ...data,
      courses: normalizedCourses,
      items: normalizedCourses,
    };
  },

  /**
   * Get course by ID
   */
  getCourseById: async (id: string): Promise<Course> => {
    const response = await api.get<ApiResponse<Course>>(`/courses/${id}`);
    return normalizeCourseAssets(extractData(response));
  },

  /**
   * Get course categories
   */
  getCategories: async (): Promise<string[]> => {
    const response = await api.get<ApiResponse<string[]>>('/courses/categories/all');
    return extractData(response);
  },

  /**
   * Get teacher's own courses (Teacher only)
   */
  getMyCourses: async (): Promise<Course[]> => {
    const response = await api.get<ApiResponse<Course[]>>('/courses/my-courses');
    return extractData(response).map((course) => normalizeCourseAssets(course));
  },

  /**
   * Create a new course (Teacher only)
   */
  createCourse: async (data: Partial<Course>): Promise<Course> => {
    const response = await api.post<ApiResponse<Course>>('/courses', data);
    return normalizeCourseAssets(extractData(response));
  },

  /**
   * Update course (Teacher only)
   */
  updateCourse: async (id: string, data: Partial<Course>): Promise<Course> => {
    const response = await api.put<ApiResponse<Course>>(`/courses/${id}`, data);
    return normalizeCourseAssets(extractData(response));
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
    return normalizeLessonAssets(extractData(response));
  },

  /**
   * Update lesson (Teacher only)
   */
  updateLesson: async (lessonId: string, data: Partial<Lesson>): Promise<Lesson> => {
    const response = await api.put<ApiResponse<Lesson>>(
      `/courses/lessons/${lessonId}`,
      data
    );
    return normalizeLessonAssets(extractData(response));
  },

  /**
   * Delete lesson (Teacher only)
   */
  deleteLesson: async (lessonId: string): Promise<void> => {
    await api.delete(`/courses/lessons/${lessonId}`);
  },

  /**
   * Submit quiz answers for a lesson (Student only)
   */
  submitLessonQuiz: async (lessonId: string, answers: number[]): Promise<QuizSubmissionResult> => {
    const response = await api.post<ApiResponse<QuizSubmissionResult>>(
      `/courses/lessons/${lessonId}/quiz/submit`,
      { answers }
    );
    return extractData(response);
  },

  /**
   * Get quiz attempts for a teacher-owned course
   */
  getCourseQuizAttempts: async (courseId: string): Promise<QuizAttempt[]> => {
    const response = await api.get<ApiResponse<QuizAttempt[]>>(`/courses/${courseId}/quiz-attempts`);
    return extractData(response);
  },

  /**
   * Get the authenticated student's quiz attempts for a course
   */
  getMyCourseQuizAttempts: async (courseId: string): Promise<QuizAttempt[]> => {
    const response = await api.get<ApiResponse<QuizAttempt[]>>(`/courses/${courseId}/my-quiz-attempts`);
    return extractData(response);
  },

  /**
   * Create lesson package (Teacher only)
   */
  createPackage: async (courseId: string, data: Partial<LessonPackage>): Promise<LessonPackage> => {
    const response = await api.post<ApiResponse<LessonPackage>>(
      `/courses/${courseId}/packages`,
      data
    );
    return extractData(response);
  },

  /**
   * Update lesson package (Teacher only)
   */
  updatePackage: async (packageId: string, data: Partial<LessonPackage>): Promise<LessonPackage> => {
    const response = await api.put<ApiResponse<LessonPackage>>(
      `/courses/packages/${packageId}`,
      data
    );
    return extractData(response);
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
    return normalizeMaterialAssets(extractData(response));
  },

  /**
   * Update material (Teacher only)
   */
  updateMaterial: async (materialId: string, data: Partial<Material>): Promise<Material> => {
    const response = await api.put<ApiResponse<Material>>(
      `/courses/materials/${materialId}`,
      data
    );
    return normalizeMaterialAssets(extractData(response));
  },

  /**
   * Delete material (Teacher only)
   */
  deleteMaterial: async (materialId: string): Promise<void> => {
    await api.delete(`/courses/materials/${materialId}`);
  },
};

export default courseService;

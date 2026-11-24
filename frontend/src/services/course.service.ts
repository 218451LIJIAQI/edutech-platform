import api from './api';
import {
  Course,
  Lesson,
  LessonPackage,
  LessonQuiz,
  LiveSession,
  LiveSessionStatus,
  Material,
  ApiResponse,
  PaginatedResponse,
  QuizAttempt,
  QuizSubmissionResult,
} from '@/types';
import { extractData, extractPaginatedData } from './response-utils';
import {
  normalizeCourseAssets,
  normalizeLessonAssets,
  normalizeLessonPackage,
  normalizeLiveSessionAssets,
  normalizeMaterialAssets,
} from '@/utils/asset-normalizers';

export type CourseUpdatePayload = Omit<
  Partial<Course>,
  'thumbnail' | 'previewVideoUrl'
> & {
  thumbnail?: string | null;
  previewVideoUrl?: string | null;
};

export type LessonUpdatePayload = Omit<
  Partial<Lesson>,
  'description' | 'duration' | 'videoUrl' | 'quiz'
> & {
  description?: string | null;
  duration?: number | null;
  videoUrl?: string | null;
  quiz?: LessonQuiz | null;
};

export type PackageUpdatePayload = Omit<
  Partial<LessonPackage>,
  'description' | 'duration' | 'maxStudents'
> & {
  description?: string | null;
  duration?: number | null;
  maxStudents?: number | null;
};

export type MaterialUpdatePayload = Omit<Partial<Material>, 'description'> & {
  description?: string | null;
};

export interface CreateLiveSessionPayload {
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  maxParticipants?: number;
}

const courseService = {
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

  getCourseById: async (id: string): Promise<Course> => {
    const response = await api.get<ApiResponse<Course>>(`/courses/${id}`);
    return normalizeCourseAssets(extractData(response));
  },

  getCategories: async (): Promise<string[]> => {
    const response = await api.get<ApiResponse<string[]>>('/courses/categories/all');
    return extractData(response);
  },

  getMyCourses: async (): Promise<Course[]> => {
    const response = await api.get<ApiResponse<Course[]>>('/courses/my-courses');
    return extractData(response).map((course) => normalizeCourseAssets(course));
  },

  createCourse: async (data: Partial<Course>): Promise<Course> => {
    const response = await api.post<ApiResponse<Course>>('/courses', data);
    return normalizeCourseAssets(extractData(response));
  },

  updateCourse: async (id: string, data: CourseUpdatePayload): Promise<Course> => {
    const response = await api.put<ApiResponse<Course>>(`/courses/${id}`, data);
    return normalizeCourseAssets(extractData(response));
  },

  deleteCourse: async (id: string): Promise<void> => {
    await api.delete(`/courses/${id}`);
  },

  createLesson: async (
    courseId: string,
    data: LessonUpdatePayload
  ): Promise<Lesson> => {
    const response = await api.post<ApiResponse<Lesson>>(
      `/courses/${courseId}/lessons`,
      data
    );
    return normalizeLessonAssets(extractData(response));
  },

  updateLesson: async (
    lessonId: string,
    data: LessonUpdatePayload
  ): Promise<Lesson> => {
    const response = await api.put<ApiResponse<Lesson>>(
      `/courses/lessons/${lessonId}`,
      data
    );
    return normalizeLessonAssets(extractData(response));
  },

  deleteLesson: async (lessonId: string): Promise<void> => {
    await api.delete(`/courses/lessons/${lessonId}`);
  },

  submitLessonQuiz: async (
    lessonId: string,
    answers: number[]
  ): Promise<QuizSubmissionResult> => {
    const response = await api.post<ApiResponse<QuizSubmissionResult>>(
      `/courses/lessons/${lessonId}/quiz/submit`,
      { answers }
    );
    return extractData(response);
  },

  getCourseQuizAttempts: async (courseId: string): Promise<QuizAttempt[]> => {
    const response = await api.get<ApiResponse<QuizAttempt[]>>(
      `/courses/${courseId}/quiz-attempts`
    );
    return extractData(response);
  },

  getMyCourseQuizAttempts: async (courseId: string): Promise<QuizAttempt[]> => {
    const response = await api.get<ApiResponse<QuizAttempt[]>>(
      `/courses/${courseId}/my-quiz-attempts`
    );
    return extractData(response);
  },

  getCourseLiveSessions: async (courseId: string): Promise<LiveSession[]> => {
    const response = await api.get<ApiResponse<LiveSession[]>>(
      `/courses/${courseId}/live-sessions`
    );
    return extractData(response).map(normalizeLiveSessionAssets);
  },

  createLiveSession: async (
    lessonId: string,
    data: CreateLiveSessionPayload
  ): Promise<LiveSession> => {
    const response = await api.post<ApiResponse<LiveSession>>(
      `/courses/lessons/${lessonId}/live-sessions`,
      data
    );
    return normalizeLiveSessionAssets(extractData(response));
  },

  updateLiveSessionStatus: async (
    sessionId: string,
    status: Extract<LiveSessionStatus, 'ONGOING' | 'COMPLETED' | 'CANCELLED'>,
    recordingUrl?: string | null
  ): Promise<LiveSession> => {
    const response = await api.patch<ApiResponse<LiveSession>>(
      `/courses/live-sessions/${sessionId}/status`,
      {
        status,
        ...(recordingUrl !== undefined ? { recordingUrl } : {}),
      }
    );
    return normalizeLiveSessionAssets(extractData(response));
  },

  createPackage: async (
    courseId: string,
    data: PackageUpdatePayload
  ): Promise<LessonPackage> => {
    const response = await api.post<ApiResponse<LessonPackage>>(
      `/courses/${courseId}/packages`,
      data
    );
    return normalizeLessonPackage(extractData(response));
  },

  updatePackage: async (
    packageId: string,
    data: PackageUpdatePayload
  ): Promise<LessonPackage> => {
    const response = await api.put<ApiResponse<LessonPackage>>(
      `/courses/packages/${packageId}`,
      data
    );
    return normalizeLessonPackage(extractData(response));
  },

  deletePackage: async (packageId: string): Promise<void> => {
    await api.delete(`/courses/packages/${packageId}`);
  },

  uploadMaterial: async (
    courseId: string,
    data: MaterialUpdatePayload
  ): Promise<Material> => {
    const response = await api.post<ApiResponse<Material>>(
      `/courses/${courseId}/materials`,
      data
    );
    return normalizeMaterialAssets(extractData(response));
  },

  updateMaterial: async (
    materialId: string,
    data: MaterialUpdatePayload
  ): Promise<Material> => {
    const response = await api.put<ApiResponse<Material>>(
      `/courses/materials/${materialId}`,
      data
    );
    return normalizeMaterialAssets(extractData(response));
  },

  deleteMaterial: async (materialId: string): Promise<void> => {
    await api.delete(`/courses/materials/${materialId}`);
  },
};

export default courseService;

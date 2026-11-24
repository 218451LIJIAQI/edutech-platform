import { create } from 'zustand';
import { Course } from '@/types';
import courseService from '@/services/course.service';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';

interface FetchCoursesParams {
  category?: string;
  search?: string;
  courseType?: 'LIVE' | 'RECORDED' | 'HYBRID';
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'NEWEST' | 'RATING' | 'POPULARITY' | 'PRICE_ASC' | 'PRICE_DESC';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface CourseListPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CourseState {
  courses: Course[];
  pagination: CourseListPagination | null;
  currentCourse: Course | null;
  categories: string[];
  isLoading: boolean;
  error: string | null;
  errorStatus: number | null;

  fetchCourses: (params?: FetchCoursesParams) => Promise<void>;
  fetchCourseById: (id: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  clearError: () => void;
}

let latestCoursesRequestId = 0;
let latestCourseDetailRequestId = 0;

const extractHttpStatus = (error: unknown): number | null => {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'status' in error.response &&
    typeof error.response.status === 'number'
  ) {
    return error.response.status;
  }
  return null;
};

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  pagination: null,
  currentCourse: null,
  categories: [],
  isLoading: false,
  error: null,
  errorStatus: null,

  fetchCourses: async (params?: FetchCoursesParams) => {
    const requestId = ++latestCoursesRequestId;
    try {
      set({ isLoading: true, error: null, errorStatus: null });
      const data = await courseService.getAllCourses(params);

      if (requestId !== latestCoursesRequestId) {
        return;
      }

      let courseList: Course[] = [];
      let paginationMeta: CourseListPagination | null = null;

      if ('items' in data && Array.isArray(data.items)) {
        courseList = data.items;
      } else if ('courses' in data && Array.isArray(data.courses)) {
        courseList = data.courses;
      } else if (Array.isArray(data)) {
        courseList = data;
      } else {
        throw new Error('Invalid course data format received');
      }

      if (
        !Array.isArray(data) &&
        'pagination' in data &&
        data.pagination &&
        typeof data.pagination === 'object'
      ) {
        paginationMeta = {
          total: Number(data.pagination.total) || courseList.length,
          page: Number(data.pagination.page) || params?.page || 1,
          limit: Number(data.pagination.limit) || params?.limit || 12,
          totalPages: Math.max(1, Number(data.pagination.totalPages) || 1),
        };
      }

      set({
        courses: courseList,
        pagination: paginationMeta,
        isLoading: false,
        error: null,
        errorStatus: null,
      });
    } catch (error) {
      if (requestId !== latestCoursesRequestId) {
        return;
      }
      const errorMessage = extractErrorMessage(error, 'Failed to fetch courses');
      set({
        isLoading: false,
        error: errorMessage,
        errorStatus: extractHttpStatus(error),
      });
      toast.error(errorMessage);
    }
  },

  fetchCourseById: async (id: string) => {
    const requestId = ++latestCourseDetailRequestId;
    try {
      if (!id) {
        throw new Error('Course ID is required');
      }
      set((state) => ({
        isLoading: true,
        error: null,
        errorStatus: null,
        currentCourse: state.currentCourse?.id === id ? state.currentCourse : null,
      }));
      const course = await courseService.getCourseById(id);

      if (requestId !== latestCourseDetailRequestId) {
        return;
      }

      if (!course) {
        set({
          currentCourse: null,
          isLoading: false,
          error: 'Course not found',
          errorStatus: 404,
        });
        return;
      }

      set({
        currentCourse: course,
        isLoading: false,
        error: null,
        errorStatus: null,
      });
    } catch (error) {
      if (requestId !== latestCourseDetailRequestId) {
        return;
      }
      const status = extractHttpStatus(error);
      const errorMessage = extractErrorMessage(error, 'Failed to fetch course');
      set({
        currentCourse: null,
        isLoading: false,
        error: errorMessage,
        errorStatus: status,
      });
      if (status !== 404) {
        toast.error(errorMessage);
      }
    }
  },

  fetchCategories: async () => {
    try {
      const categories = await courseService.getCategories();

      if (!Array.isArray(categories)) {
        throw new Error('Invalid categories data format received');
      }

      set({ categories });
    } catch (error) {
      const errorMessage = extractErrorMessage(error, 'Failed to fetch categories');
      toast.error(errorMessage);
    }
  },

  clearError: () => {
    set({ error: null, errorStatus: null });
  },
}));

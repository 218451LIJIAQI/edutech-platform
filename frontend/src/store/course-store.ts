import { create } from 'zustand';
import { Course } from '@/types';
import courseService from '@/services/course.service';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';

export interface FetchCoursesParams {
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

export interface CourseListPagination {
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

  fetchCourses: (params?: FetchCoursesParams) => Promise<void>;
  fetchCourseById: (id: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  setCurrentCourse: (course: Course | null) => void;
  clearCourses: () => void;
  clearError: () => void;
}

let latestCoursesRequestId = 0;
let latestCourseDetailRequestId = 0;

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  pagination: null,
  currentCourse: null,
  categories: [],
  isLoading: false,
  error: null,

  fetchCourses: async (params?: FetchCoursesParams) => {
    const requestId = ++latestCoursesRequestId;
    try {
      set({ isLoading: true, error: null });
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
      });
    } catch (error) {
      if (requestId !== latestCoursesRequestId) {
        return;
      }
      const errorMessage = extractErrorMessage(error, 'Failed to fetch courses');
      set({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
    }
  },

  fetchCourseById: async (id: string) => {
    const requestId = ++latestCourseDetailRequestId;
    try {
      if (!id) {
        throw new Error('Course ID is required');
      }
      set({ isLoading: true, error: null });
      const course = await courseService.getCourseById(id);

      if (requestId !== latestCourseDetailRequestId) {
        return;
      }

      if (!course) {
        throw new Error('Course not found');
      }

      set({ currentCourse: course, isLoading: false, error: null });
    } catch (error) {
      if (requestId !== latestCourseDetailRequestId) {
        return;
      }
      const errorMessage = extractErrorMessage(error, 'Failed to fetch course');
      set({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw new Error(errorMessage);
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

  setCurrentCourse: (course: Course | null) => {
    set({ currentCourse: course });
  },

  clearCourses: () => {
    set({ courses: [], pagination: null, currentCourse: null, error: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));

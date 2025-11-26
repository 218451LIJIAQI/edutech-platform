import { create } from 'zustand';
import { Course } from '@/types';
import courseService from '@/services/course.service';

/**
 * Course Store
 * Manages course-related state
 */

interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  categories: string[];
  isLoading: boolean;
  
  // Actions
  fetchCourses: (params?: {
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
  }) => Promise<void>;
  fetchCourseById: (id: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  setCurrentCourse: (course: Course | null) => void;
  clearCourses: () => void;
}

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  currentCourse: null,
  categories: [],
  isLoading: false,

  fetchCourses: async (params?: {
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
  }) => {
    try {
      set({ isLoading: true });
      const data = await courseService.getAllCourses(params);
      set({ courses: data.items || data.courses || [], isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchCourseById: async (id: string) => {
    try {
      set({ isLoading: true });
      const course = await courseService.getCourseById(id);
      set({ currentCourse: course, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchCategories: async () => {
    try {
      const categories = await courseService.getCategories();
      set({ categories });
    } catch (error) {
      throw error;
    }
  },

  setCurrentCourse: (course: Course | null) => {
    set({ currentCourse: course });
  },

  clearCourses: () => {
    set({ courses: [], currentCourse: null });
  },
}));

export default useCourseStore;


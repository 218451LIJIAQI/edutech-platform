import { create } from 'zustand';
import { Course } from '@/types';
import courseService from '@/services/course.service';
import toast from 'react-hot-toast';

/**
 * Course Store
 * Manages course-related state
 */

/**
 * Parameters for fetching courses
 */
interface FetchCoursesParams {
  /** Filter by category */
  category?: string;
  /** Search query */
  search?: string;
  /** Filter by course type */
  courseType?: 'LIVE' | 'RECORDED' | 'HYBRID';
  /** Minimum rating filter */
  minRating?: number;
  /** Minimum price filter */
  minPrice?: number;
  /** Maximum price filter */
  maxPrice?: number;
  /** Sort by field */
  sortBy?: 'NEWEST' | 'RATING' | 'POPULARITY' | 'PRICE_ASC' | 'PRICE_DESC';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Page number for pagination */
  page?: number;
  /** Number of items per page */
  limit?: number;
}

/**
 * Course store state interface
 */
interface CourseState {
  /** List of courses */
  courses: Course[];
  /** Currently selected course */
  currentCourse: Course | null;
  /** Available course categories */
  categories: string[];
  /** Loading state for async operations */
  isLoading: boolean;
  /** Error message if operation fails */
  error: string | null;
  
  // Actions
  /** Fetch courses with optional filters */
  fetchCourses: (params?: FetchCoursesParams) => Promise<void>;
  /** Fetch a specific course by ID */
  fetchCourseById: (id: string) => Promise<void>;
  /** Fetch available course categories */
  fetchCategories: () => Promise<void>;
  /** Set the current course */
  setCurrentCourse: (course: Course | null) => void;
  /** Clear all courses and current course */
  clearCourses: () => void;
  /** Clear error state */
  clearError: () => void;
}

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  currentCourse: null,
  categories: [],
  isLoading: false,
  error: null,

  fetchCourses: async (params?: FetchCoursesParams) => {
    try {
      set({ isLoading: true, error: null });
      const data = await courseService.getAllCourses(params);
      
      // Handle both possible response formats with type safety
      let courseList: Course[] = [];
      if ('items' in data && Array.isArray(data.items)) {
        courseList = data.items;
      } else if ('courses' in data && Array.isArray(data.courses)) {
        courseList = data.courses;
      } else if (Array.isArray(data)) {
        courseList = data;
      } else {
        throw new Error('Invalid course data format received');
      }
      
      set({ courses: courseList, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch courses';
      set({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  },

  fetchCourseById: async (id: string) => {
    try {
      if (!id) {
        throw new Error('Course ID is required');
      }
      set({ isLoading: true, error: null });
      const course = await courseService.getCourseById(id);
      
      if (!course) {
        throw new Error('Course not found');
      }
      
      set({ currentCourse: course, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch course';
      set({ isLoading: false, error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  },

  fetchCategories: async () => {
    try {
      set({ error: null });
      const categories = await courseService.getCategories();
      
      if (!Array.isArray(categories)) {
        throw new Error('Invalid categories data format received');
      }
      
      set({ categories });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch categories';
      set({ error: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  },

  setCurrentCourse: (course: Course | null) => {
    set({ currentCourse: course });
  },

  clearCourses: () => {
    set({ courses: [], currentCourse: null, error: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useCourseStore;


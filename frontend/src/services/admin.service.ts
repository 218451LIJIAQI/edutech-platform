import api from './api';
import { ApiResponse, PaginatedResponse, User, Course } from '@/types';

export interface PlatformStats {
  overview: {
    totalUsers: number;
    totalTeachers: number;
    totalStudents: number;
    totalCourses: number;
    publishedCourses: number;
    totalEnrollments: number;
    totalRevenue: number;
    pendingVerifications: number;
    openReports: number;
  };
  growth: {
    newUsersThisMonth: number;
    newCoursesThisMonth: number;
    enrollmentsThisMonth: number;
  };
  revenue: {
    total: number;
    monthly: any[];
  };
}

export interface FinancialStats {
  totals: {
    totalRevenue: number;
    platformEarnings: number;
    teacherEarnings: number;
    transactionCount: number;
  };
  recentPayments: any[];
}

/**
 * Admin Service
 * Handles all admin-related API calls
 */

export const adminService = {
  /**
   * Get platform statistics
   */
  getStats: async (): Promise<PlatformStats> => {
    const response = await api.get<ApiResponse<PlatformStats>>('/admin/stats');
    return response.data.data!;
  },

  /**
   * Get all users
   */
  getAllUsers: async (params?: {
    role?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<User>['data']> => {
    const response = await api.get<PaginatedResponse<User>>('/admin/users', { params });
    return response.data.data;
  },

  /**
   * Get user by ID
   */
  getUserById: async (id: string): Promise<User> => {
    const response = await api.get<ApiResponse<User>>(`/admin/users/${id}`);
    return response.data.data!;
  },

  /**
   * Update user status
   */
  updateUserStatus: async (id: string, isActive: boolean): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}/status`, {
      isActive,
    });
    return response.data.data!;
  },

  /**
   * Delete user
   */
  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

  /**
   * Get all courses
   */
  getAllCourses: async (params?: {
    isPublished?: boolean;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Course>['data']> => {
    const response = await api.get<PaginatedResponse<Course>>('/admin/courses', {
      params,
    });
    return response.data.data;
  },

  /**
   * Update course status
   */
  updateCourseStatus: async (id: string, isPublished: boolean): Promise<Course> => {
    const response = await api.put<ApiResponse<Course>>(`/admin/courses/${id}/publish`, {
      isPublished,
    });
    return response.data.data!;
  },

  /**
   * Delete course
   */
  deleteCourse: async (id: string): Promise<void> => {
    await api.delete(`/admin/courses/${id}`);
  },

  /**
   * Get all verifications
   */
  getAllVerifications: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<any> => {
    const response = await api.get('/admin/verifications', { params });
    return response.data.data;
  },

  /**
   * Review verification
   */
  reviewVerification: async (
    id: string,
    status: string,
    reviewNotes?: string
  ): Promise<any> => {
    const response = await api.put(`/admin/verifications/${id}`, {
      status,
      reviewNotes,
    });
    return response.data.data;
  },

  /**
   * Get all reports
   */
  getAllReports: async (params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<any> => {
    const response = await api.get('/admin/reports', { params });
    return response.data.data;
  },

  /**
   * Update report status
   */
  updateReportStatus: async (
    id: string,
    status: string,
    resolution?: string
  ): Promise<any> => {
    const response = await api.put(`/admin/reports/${id}`, {
      status,
      resolution,
    });
    return response.data.data;
  },

  /**
   * Get financial statistics
   */
  getFinancials: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<FinancialStats> => {
    const response = await api.get<ApiResponse<FinancialStats>>('/admin/financials', {
      params,
    });
    return response.data.data!;
  },

  /**
   * Get recent activities
   */
  getRecentActivities: async (limit?: number): Promise<any[]> => {
    const response = await api.get<ApiResponse<any[]>>('/admin/activities', {
      params: { limit },
    });
    return response.data.data!;
  },
};

export default adminService;


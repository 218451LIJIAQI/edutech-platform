import api from './api';
import { ApiResponse, PaginatedResponse, User, Course, PaymentWithDetails, Report, TeacherVerification } from '@/types';

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
    monthly: Array<{ month: string; revenue: number }>;
  };
}

export interface FinancialStats {
  totals: {
    totalRevenue: number;
    platformEarnings: number;
    teacherEarnings: number;
    transactionCount: number;
  };
  recentPayments: PaymentWithDetails[];
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
  }): Promise<PaginatedResponse<TeacherVerification>['data']> => {
    const response = await api.get<PaginatedResponse<TeacherVerification>>('/admin/verifications', { params });
    return response.data.data;
  },

  /**
   * Review verification
   */
  reviewVerification: async (
    id: string,
    status: string,
    reviewNotes?: string
  ): Promise<TeacherVerification> => {
    const response = await api.put<ApiResponse<TeacherVerification>>(`/admin/verifications/${id}`, {
      status,
      reviewNotes,
    });
    return response.data.data!;
  },

  /**
   * Get all reports
   */
  getAllReports: async (params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Report>['data']> => {
    const response = await api.get<PaginatedResponse<Report>>('/admin/reports', { params });
    return response.data.data;
  },

  /**
   * Update report status
   */
  updateReportStatus: async (
    id: string,
    status: string,
    resolution?: string
  ): Promise<Report> => {
    const response = await api.put<ApiResponse<Report>>(`/admin/reports/${id}`, {
      status,
      resolution,
    });
    return response.data.data!;
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
   * Get recent activities with pagination
   */
  getRecentActivities: async (params?: {
    limit?: number;
    page?: number;
  }): Promise<{
    items: Array<{
      id: string;
      type: string;
      description: string;
      createdAt: string;
      user?: { firstName: string; lastName: string };
    }>;
    pagination: { total: number; page: number; limit: number; totalPages: number; hasMore: boolean };
  }> => {
    const response = await api.get<ApiResponse<{
      items: Array<{
        id: string;
        type: string;
        description: string;
        createdAt: string;
        user?: { firstName: string; lastName: string };
      }>;
      pagination: { total: number; page: number; limit: number; totalPages: number; hasMore: boolean };
    }>>('/admin/activities', { params });
    return response.data.data!;
  },

  /**
   * Create a new user
   */
  createUser: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
    address?: string;
    department?: string;
  }): Promise<User> => {
    const response = await api.post<ApiResponse<User>>('/admin/users', data);
    return response.data.data!;
  },

  /**
   * Update user information
   */
  updateUser: async (id: string, data: any): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}`, data);
    return response.data.data!;
  },

  /**
   * Reset user password
   */
  resetUserPassword: async (id: string, newPassword: string): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}/password`, {
      newPassword,
    });
    return response.data.data!;
  },

  /**
   * Lock/Unlock user account
   */
  lockUserAccount: async (id: string, lock: boolean, reason?: string): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}/lock`, {
      lock,
      reason,
    });
    return response.data.data!;
  },

  /**
   * Batch delete users
   */
  batchDeleteUsers: async (userIds: string[]): Promise<void> => {
    await api.post('/admin/users/batch/delete', { userIds });
  },

  /**
   * Batch update user status
   */
  batchUpdateUserStatus: async (userIds: string[], isActive: boolean): Promise<void> => {
    await api.post('/admin/users/batch/status', { userIds, isActive });
  },

  /**
   * Get user audit logs
   */
  getAuditLogs: async (params?: {
    userId?: string;
    adminId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>['data']> => {
    const response = await api.get<PaginatedResponse<any>>('/admin/users/audit-logs', {
      params,
    });
    return response.data.data;
  },
  /**
   * List teacher commissions
   */
  getTeacherCommissions: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>['data']> => {
    const response = await api.get<PaginatedResponse<any>>('/admin/financials/commissions', {
      params,
    });
    return response.data.data;
  },

  /**
   * Update a teacher commission rate (percent). Pass null to reset to platform default.
   */
  updateTeacherCommission: async (userId: string, commissionRate: number | null): Promise<any> => {
    const response = await api.put<ApiResponse<any>>(`/admin/financials/commissions/${userId}`, {
      commissionRate,
    });
    return response.data.data;
  },

  /**
   * Get settlements aggregated by teacher
   */
  getSettlements: async (params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>['data']> => {
    const response = await api.get<PaginatedResponse<any>>('/admin/financials/settlements', { params });
    return response.data.data;
  },

  /**
   * Get invoices & bills (payments list)
   */
  getInvoices: async (params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<any>['data']> => {
    const response = await api.get<PaginatedResponse<any>>('/admin/financials/invoices', { params });
    return response.data.data;
  },

  /**
   * Revenue analytics
   */
  getRevenueAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/admin/financials/analytics', { params });
    return response.data.data;
  },
};

export default adminService;

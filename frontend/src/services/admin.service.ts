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
    
    if (!response.data.data) {
      throw new Error('Failed to fetch platform stats: No data returned');
    }
    
    return response.data.data;
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
    
    if (!response.data.data) {
      throw new Error('Failed to fetch user: No data returned');
    }
    
    return response.data.data;
  },

  /**
   * Update user status
   */
  updateUserStatus: async (id: string, isActive: boolean): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}/status`, {
      isActive,
    });
    
    if (!response.data.data) {
      throw new Error('Failed to update user status: No data returned');
    }
    
    return response.data.data;
  },

  /**
   * Delete user
   */
  deleteUser: async (id: string, opts?: { force?: boolean }): Promise<void> => {
    await api.delete(`/admin/users/${id}`, { params: opts?.force ? { force: true } : undefined });
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
    
    if (!response.data.data) {
      throw new Error('Failed to update course status: No data returned');
    }
    
    return response.data.data;
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
    
    if (!response.data.data) {
      throw new Error('Failed to review verification: No data returned');
    }
    
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
    
    if (!response.data.data) {
      throw new Error('Failed to update report status: No data returned');
    }
    
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
    
    if (!response.data.data) {
      throw new Error('Failed to fetch financial stats: No data returned');
    }
    
    return response.data.data;
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
    
    if (!response.data.data) {
      throw new Error('Failed to fetch recent activities: No data returned');
    }
    
    return response.data.data;
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
    
    if (!response.data.data) {
      throw new Error('Failed to create user: No data returned');
    }
    
    return response.data.data;
  },

  /**
   * Update user information
   */
  updateUser: async (id: string, data: Partial<Pick<User, 'firstName' | 'lastName' | 'avatar' | 'role'>> & { phone?: string; address?: string; department?: string }): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}`, data);
    
    if (!response.data.data) {
      throw new Error('Failed to update user: No data returned');
    }
    
    return response.data.data;
  },

  /**
   * Reset user password
   */
  resetUserPassword: async (id: string, newPassword: string): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}/password`, {
      newPassword,
    });
    
    if (!response.data.data) {
      throw new Error('Failed to reset user password: No data returned');
    }
    
    return response.data.data;
  },

  /**
   * Lock/Unlock user account
   */
  lockUserAccount: async (id: string, lock: boolean, reason?: string): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}/lock`, {
      lock,
      reason,
    });
    
    if (!response.data.data) {
      throw new Error('Failed to lock/unlock user account: No data returned');
    }
    
    return response.data.data;
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
  }): Promise<PaginatedResponse<{
    id: string;
    userId: string;
    adminId?: string;
    action: string;
    details?: Record<string, unknown>;
    createdAt: string;
  }>['data']> => {
    const response = await api.get<PaginatedResponse<{
      id: string;
      userId: string;
      adminId?: string;
      action: string;
      details?: Record<string, unknown>;
      createdAt: string;
    }>>('/admin/users/audit-logs', {
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
  }): Promise<PaginatedResponse<{
    userId: string;
    teacherName: string;
    commissionRate: number;
    totalEarnings: number;
    platformEarnings: number;
    teacherEarnings: number;
  }>['data']> => {
    const response = await api.get<PaginatedResponse<{
      userId: string;
      teacherName: string;
      commissionRate: number;
      totalEarnings: number;
      platformEarnings: number;
      teacherEarnings: number;
    }>>('/admin/financials/commissions', {
      params,
    });
    return response.data.data;
  },

  /**
   * Update a teacher commission rate (percent). Pass null to reset to platform default.
   */
  updateTeacherCommission: async (userId: string, commissionRate: number | null): Promise<{
    userId: string;
    commissionRate: number | null;
    updatedAt: string;
  }> => {
    const response = await api.put<ApiResponse<{
      userId: string;
      commissionRate: number | null;
      updatedAt: string;
    }>>(`/admin/financials/commissions/${userId}`, {
      commissionRate,
    });
    
    if (!response.data.data) {
      throw new Error('Failed to update teacher commission: No data returned');
    }
    
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
  }): Promise<PaginatedResponse<{
    teacherId: string;
    teacherName: string;
    totalAmount: number;
    settledAmount: number;
    pendingAmount: number;
    settlementDate?: string;
  }>['data']> => {
    const response = await api.get<PaginatedResponse<{
      teacherId: string;
      teacherName: string;
      totalAmount: number;
      settledAmount: number;
      pendingAmount: number;
      settlementDate?: string;
    }>>('/admin/financials/settlements', { params });
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
  }): Promise<PaginatedResponse<PaymentWithDetails>['data']> => {
    const response = await api.get<PaginatedResponse<PaymentWithDetails>>('/admin/financials/invoices', { params });
    return response.data.data;
  },

  /**
   * Revenue analytics
   */
  getRevenueAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    period: string;
    revenue: number;
    platformEarnings: number;
    teacherEarnings: number;
    transactionCount: number;
  }[]> => {
    const response = await api.get<ApiResponse<{
      period: string;
      revenue: number;
      platformEarnings: number;
      teacherEarnings: number;
      transactionCount: number;
    }[]>>('/admin/financials/analytics', { params });
    
    if (!response.data.data) {
      throw new Error('Failed to fetch revenue analytics: No data returned');
    }
    
    return response.data.data;
  },
};

export default adminService;

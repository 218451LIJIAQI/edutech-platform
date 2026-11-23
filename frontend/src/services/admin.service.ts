import api from './api';
import { ApiResponse, PaginatedResponse, User, Course, PaymentWithDetails, Report } from '@/types';
import { extractData, extractPaginatedData } from './response-utils';
import {
  normalizeCourseAssets,
  normalizePayment,
  normalizeUserAssets,
  toFiniteNumber,
  toOptionalFiniteNumber,
} from '@/utils/asset-normalizers';

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

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AdminPaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
  overview?: {
    total?: number;
    active?: number;
    teachers?: number;
    students?: number;
  };
}

type AdminUsersResponseData = AdminPaginatedData<User>;

export interface AdminUpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string | null;
  role?: User['role'];
  phone?: string | null;
  address?: string | null;
  department?: string | null;
  isActive?: boolean;
  isLocked?: boolean;
}

export interface TeacherCommissionListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  teacherProfile?: {
    id: string;
    commissionRate?: number | null;
    totalStudents: number;
    averageRating: number;
    totalEarnings: number;
  } | null;
}

export interface SettlementSummaryRow {
  teacherUserId: string;
  teacherName: string;
  teacherEmail?: string;
  totalGross: number;
  platformCommission: number;
  teacherEarning: number;
  transactions: number;
}

export interface RevenueTrendPoint {
  date: string;
  totalRevenue: number;
  platformEarnings: number;
  teacherEarnings: number;
}

export interface TopTeacherEarningsPoint {
  id: string;
  name: string;
  earnings: number;
}

export interface TopCourseRevenuePoint {
  id: string;
  title: string;
  revenue: number;
}

export interface RevenueBreakdownPoint {
  type: string;
  revenue: number;
}

export interface RevenueAnalyticsData {
  revenueTrend: RevenueTrendPoint[];
  topTeachers: TopTeacherEarningsPoint[];
  topCourses: TopCourseRevenuePoint[];
  revenueBreakdown: RevenueBreakdownPoint[];
}

export interface FinancialPeriodSummary {
  period: string;
  totalRevenue: number;
  platformEarnings: number;
  teacherEarnings: number;
  totalRefunds: number;
  netRevenue: number;
  transactionCount: number;
  refundCount: number;
}

export interface FinancialReportSummaryData {
  daily: FinancialPeriodSummary;
  weekly: FinancialPeriodSummary;
  monthly: FinancialPeriodSummary;
  allTime: FinancialPeriodSummary;
}

export interface TeacherSettlementItem {
  teacherProfileId: string;
  teacherName: string;
  teacherEmail: string;
  totalEarnings: number;
  totalRefundDeductions: number;
  pendingPayouts: number;
  netSettlement: number;
  totalStudents: number;
  courseCount: number;
  commissionRate: number | null;
}

export interface TeacherSettlementsData {
  settlements: TeacherSettlementItem[];
  totals: {
    totalEarnings: number;
    totalRefundDeductions: number;
    totalNetSettlement: number;
  };
  pagination: PaginationMeta;
}

export interface FinancialExportData {
  payments: Array<{
    id: string;
    date: string;
    userName: string;
    courseName: string;
    amount: number;
    platformCommission: number;
    teacherEarning: number;
    status: string;
  }>;
  refunds: Array<{
    id: string;
    date: string;
    userName: string;
    amount: number;
    status: string;
    method: string;
  }>;
  summary: FinancialPeriodSummary;
}

export interface BatchUserOperationResult {
  affected?: number;
  count?: number;
  succeeded?: string[];
  failed?: Array<{ id: string; reason: string }>;
}

export interface AutoVerificationStats {
  totalProcessed: number;
  autoApproved: number;
  flaggedForReview: number;
  manuallyReviewed: number;
  autoApprovalRate: number;
}

const adminService = {
  getStats: async (): Promise<PlatformStats> => {
    const response = await api.get<ApiResponse<PlatformStats>>('/admin/stats');
    const stats = extractData(response);
    return {
      ...stats,
      overview: {
        ...stats.overview,
        totalRevenue: toFiniteNumber(stats.overview.totalRevenue),
      },
      revenue: {
        ...stats.revenue,
        total: toFiniteNumber(stats.revenue.total),
        monthly: stats.revenue.monthly.map((point) => ({
          ...point,
          revenue: toFiniteNumber(point.revenue),
        })),
      },
    };
  },

  getAllUsers: async (params?: {
    role?: string;
    isActive?: boolean;
    isLocked?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    createdAfter?: string;
    createdBefore?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminUsersResponseData> => {
    const response = await api.get<ApiResponse<AdminUsersResponseData>>('/admin/users', { params });
    const data = extractData(response);
    return {
      ...data,
      items: (data.items || []).map((user) => normalizeUserAssets(user) ?? user),
    };
  },

  updateUserStatus: async (id: string, isActive: boolean): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}/status`, {
      isActive,
    });
    return normalizeUserAssets(extractData(response)) as User;
  },

  deleteUser: async (id: string, opts?: { force?: boolean }): Promise<void> => {
    await api.delete(`/admin/users/${id}`, { params: opts?.force ? { force: true } : undefined });
  },

  getAllCourses: async (params?: {
    isPublished?: boolean;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Course>['data']> => {
    const response = await api.get<PaginatedResponse<Course>>('/admin/courses', {
      params,
    });
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

  updateCourseStatus: async (id: string, isPublished: boolean): Promise<Course> => {
    const response = await api.put<ApiResponse<Course>>(`/admin/courses/${id}/publish`, {
      isPublished,
    });
    return normalizeCourseAssets(extractData(response));
  },

  getAllReports: async (params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Report>['data']> => {
    const response = await api.get<PaginatedResponse<Report>>('/admin/reports', { params });
    return extractPaginatedData(response);
  },

  updateReportStatus: async (
    id: string,
    status: string,
    resolution?: string
  ): Promise<Report> => {
    const response = await api.put<ApiResponse<Report>>(`/admin/reports/${id}`, {
      status,
      resolution,
    });
    return extractData(response);
  },

  getFinancials: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<FinancialStats> => {
    const response = await api.get<ApiResponse<FinancialStats>>('/admin/financials', {
      params,
    });
    const data = extractData(response);
    return {
      ...data,
      totals: {
        ...data.totals,
        totalRevenue: toFiniteNumber(data.totals.totalRevenue),
        platformEarnings: toFiniteNumber(data.totals.platformEarnings),
        teacherEarnings: toFiniteNumber(data.totals.teacherEarnings),
      },
      recentPayments: data.recentPayments.map(normalizePayment),
    };
  },

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
    const response = await api.get<
      ApiResponse<{
        items: Array<{
          id: string;
          type: string;
          description: string;
          createdAt: string;
          user?: { firstName: string; lastName: string };
        }>;
        pagination: { total: number; page: number; limit: number; totalPages: number; hasMore: boolean };
      }>
    >('/admin/activities', { params });
    return extractData(response);
  },

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
    return normalizeUserAssets(extractData(response)) as User;
  },

  updateUser: async (id: string, data: AdminUpdateUserPayload): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}`, data);
    return normalizeUserAssets(extractData(response)) as User;
  },

  resetUserPassword: async (id: string, newPassword: string): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}/password`, {
      newPassword,
    });
    return normalizeUserAssets(extractData(response)) as User;
  },

  lockUserAccount: async (id: string, lock: boolean, reason?: string): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}/lock`, {
      lock,
      reason,
    });
    return normalizeUserAssets(extractData(response)) as User;
  },

  batchDeleteUsers: async (userIds: string[]): Promise<BatchUserOperationResult> => {
    const response = await api.post<ApiResponse<BatchUserOperationResult>>(
      '/admin/users/batch/delete',
      { userIds }
    );
    return extractData(response);
  },

  batchUpdateUserStatus: async (
    userIds: string[],
    isActive: boolean
  ): Promise<BatchUserOperationResult> => {
    const response = await api.post<ApiResponse<BatchUserOperationResult>>(
      '/admin/users/batch/status',
      { userIds, isActive }
    );
    return extractData(response);
  },

  getTeacherCommissions: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminPaginatedData<TeacherCommissionListItem>> => {
    const response = await api.get<ApiResponse<AdminPaginatedData<TeacherCommissionListItem>>>(
      '/admin/financials/commissions',
      { params }
    );
    const data = extractData(response);
    return {
      ...data,
      items: data.items.map((teacher) => ({
        ...teacher,
        teacherProfile: teacher.teacherProfile
          ? {
              ...teacher.teacherProfile,
              commissionRate: toOptionalFiniteNumber(teacher.teacherProfile.commissionRate),
              totalStudents: toFiniteNumber(teacher.teacherProfile.totalStudents),
              averageRating: toFiniteNumber(teacher.teacherProfile.averageRating),
              totalEarnings: toFiniteNumber(teacher.teacherProfile.totalEarnings),
            }
          : teacher.teacherProfile,
      })),
    };
  },

  updateTeacherCommission: async (
    userId: string,
    commissionRate: number | null
  ): Promise<{
    userId: string;
    commissionRate: number | null;
    updatedAt: string;
  }> => {
    const response = await api.put<
      ApiResponse<{
        userId: string;
        commissionRate: number | null;
        updatedAt: string;
      }>
    >(`/admin/financials/commissions/${userId}`, {
      commissionRate,
    });
    const result = extractData(response);
    return {
      ...result,
      commissionRate: toOptionalFiniteNumber(result.commissionRate) ?? null,
    };
  },

  getSettlements: async (params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminPaginatedData<SettlementSummaryRow>> => {
    const response = await api.get<ApiResponse<AdminPaginatedData<SettlementSummaryRow>>>(
      '/admin/financials/settlements',
      { params }
    );
    const data = extractData(response);
    return {
      ...data,
      items: data.items.map((item) => ({
        ...item,
        totalGross: toFiniteNumber(item.totalGross),
        platformCommission: toFiniteNumber(item.platformCommission),
        teacherEarning: toFiniteNumber(item.teacherEarning),
      })),
    };
  },

  getRevenueAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<RevenueAnalyticsData> => {
    const response = await api.get<ApiResponse<RevenueAnalyticsData>>(
      '/admin/financials/analytics',
      { params }
    );
    const data = extractData(response);
    return {
      revenueTrend: data.revenueTrend.map((point) => ({
        ...point,
        totalRevenue: toFiniteNumber(point.totalRevenue),
        platformEarnings: toFiniteNumber(point.platformEarnings),
        teacherEarnings: toFiniteNumber(point.teacherEarnings),
      })),
      topTeachers: data.topTeachers.map((point) => ({
        ...point,
        earnings: toFiniteNumber(point.earnings),
      })),
      topCourses: data.topCourses.map((point) => ({
        ...point,
        revenue: toFiniteNumber(point.revenue),
      })),
      revenueBreakdown: data.revenueBreakdown.map((point) => ({
        ...point,
        revenue: toFiniteNumber(point.revenue),
      })),
    };
  },

  getFinancialReportSummary: async (): Promise<FinancialReportSummaryData> => {
    const response = await api.get<ApiResponse<FinancialReportSummaryData>>(
      '/admin/financial-reports/summary'
    );
    return extractData(response);
  },

  getTeacherSettlements: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<TeacherSettlementsData> => {
    const response = await api.get<ApiResponse<TeacherSettlementsData>>(
      '/admin/financial-reports/teacher-settlements',
      { params }
    );
    return extractData(response);
  },

  getFinancialExportData: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<FinancialExportData> => {
    const response = await api.get<ApiResponse<FinancialExportData>>(
      '/admin/financial-reports/export',
      { params }
    );
    return extractData(response);
  },

  getAutoVerificationStats: async (): Promise<AutoVerificationStats> => {
    const response = await api.get<ApiResponse<AutoVerificationStats>>(
      '/admin/financial-reports/auto-verification-stats'
    );
    return extractData(response);
  },
};

export default adminService;

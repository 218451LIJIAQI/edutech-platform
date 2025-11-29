import api from './api';
import { Report, ApiResponse } from '@/types';

/**
 * Report Service
 * Uses shared axios instance (with baseURL and auth headers)
 * Base URL: VITE_API_URL (e.g., http://localhost:3000/api/v1)
 */
class ReportService {
  /**
   * Submit a new report
   */
  async submitReport(data: {
    reportedId: string;
    type: string;
    description: string;
    contentType?: string;
    contentId?: string;
  }): Promise<Report> {
    const response = await api.post<ApiResponse<Report>>('/reports', data);
    if (!response.data.data) {
      throw new Error('Failed to submit report');
    }
    return response.data.data;
  }

  /**
   * Get user's submitted reports
   */
  async getMyReports(): Promise<Report[]> {
    const response = await api.get<ApiResponse<Report[]>>('/reports/my-reports');
    if (!response.data.data) {
      throw new Error('Failed to get reports');
    }
    return response.data.data;
  }

  /**
   * Get report by ID
   */
  async getReportById(id: string): Promise<Report> {
    const response = await api.get<ApiResponse<Report>>(`/reports/${id}`);
    if (!response.data.data) {
      throw new Error('Failed to get report details');
    }
    return response.data.data;
  }

  /**
   * Get all reports (Admin only)
   */
  async getAllReports(params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    reports: Report[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await api.get<ApiResponse<{
      reports: Report[];
      total: number;
      page: number;
      limit: number;
    }>>('/reports', { params });
    if (!response.data.data) {
      throw new Error('Failed to get all reports');
    }
    return response.data.data;
  }

  /**
   * Update report status (Admin only)
   */
  async updateReportStatus(
    id: string,
    data: { status: string; resolution?: string }
  ): Promise<Report> {
    const response = await api.put<ApiResponse<Report>>(`/reports/${id}/status`, data);
    if (!response.data.data) {
      throw new Error('Failed to update report status');
    }
    return response.data.data;
  }

  /**
   * Get reports against a teacher (Admin only)
   */
  async getTeacherReports(teacherId: string): Promise<Report[]> {
    const response = await api.get<ApiResponse<Report[]>>(`/reports/teacher/${teacherId}`);
    if (!response.data.data) {
      throw new Error('Failed to get teacher reports');
    }
    return response.data.data;
  }
}

export default new ReportService();

import api from './api';
import { Report } from '@/types';

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
    const response = await api.post('/reports', data);
    return (response.data as any).data;
  }

  /**
   * Get user's submitted reports
   */
  async getMyReports(): Promise<Report[]> {
    const response = await api.get('/reports/my-reports');
    return (response.data as any).data;
  }

  /**
   * Get report by ID
   */
  async getReportById(id: string): Promise<Report> {
    const response = await api.get(`/reports/${id}`);
    return (response.data as any).data;
  }

  /**
   * Get all reports (Admin only)
   */
  async getAllReports(params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const response = await api.get('/reports', { params });
    return (response.data as any).data;
  }

  /**
   * Update report status (Admin only)
   */
  async updateReportStatus(
    id: string,
    data: { status: string; resolution?: string }
  ): Promise<Report> {
    const response = await api.put(`/reports/${id}/status`, data);
    return (response.data as any).data;
  }

  /**
   * Get reports against a teacher (Admin only)
   */
  async getTeacherReports(teacherId: string): Promise<any> {
    const response = await api.get(`/reports/teacher/${teacherId}`);
    return (response.data as any).data;
  }
}

export default new ReportService();

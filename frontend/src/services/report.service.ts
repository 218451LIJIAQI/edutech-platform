import api from './api';
import { Report, ReportType, ApiResponse } from '@/types';

/**
 * Report Service
 * Handles all report-related API calls
 */

export const reportService = {
  /**
   * Submit a report
   */
  submitReport: async (
    reportedId: string,
    type: ReportType,
    description: string
  ): Promise<Report> => {
    const response = await api.post<ApiResponse<Report>>('/reports', {
      reportedId,
      type,
      description,
    });
    return response.data.data!;
  },

  /**
   * Get user's submitted reports
   */
  getMyReports: async (): Promise<Report[]> => {
    const response = await api.get<ApiResponse<Report[]>>('/reports/my-reports');
    return response.data.data!;
  },

  /**
   * Get report by ID
   */
  getReportById: async (id: string): Promise<Report> => {
    const response = await api.get<ApiResponse<Report>>(`/reports/${id}`);
    return response.data.data!;
  },
};

export default reportService;


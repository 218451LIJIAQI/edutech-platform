import api from './api';
import { Report, ApiResponse } from '@/types';
import { extractData } from './response-utils';

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
    return extractData(response);
  }

  /**
   * Get user's submitted reports
   */
  async getMyReports(): Promise<Report[]> {
    const response = await api.get<ApiResponse<Report[]>>('/reports/my-reports');
    return extractData(response);
  }

}

export default new ReportService();

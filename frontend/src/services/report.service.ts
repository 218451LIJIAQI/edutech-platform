import api from './api';
import { Report, ApiResponse } from '@/types';
import { extractData } from './response-utils';
import { normalizeReportAssets } from '@/utils/asset-normalizers';

class ReportService {
  async submitReport(data: {
    reportedId: string;
    type: string;
    description: string;
    contentType?: string;
    contentId?: string;
  }): Promise<Report> {
    const response = await api.post<ApiResponse<Report>>('/reports', data);
    return normalizeReportAssets(extractData(response));
  }

  async getMyReports(): Promise<Report[]> {
    const response = await api.get<ApiResponse<Report[]>>('/reports/my-reports');
    return extractData(response).map(normalizeReportAssets);
  }
}

export default new ReportService();

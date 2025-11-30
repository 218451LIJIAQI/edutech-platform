import { useEffect, useState, useCallback } from 'react';
import { Report } from '@/types';
import adminService from '@/services/admin.service';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ReportsManagement = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Extract error message from error object
   */
  const getErrorMessage = useCallback((e: unknown): string | undefined => {
    if (e instanceof Error && 'response' in e) {
      return (e as { response?: { data?: { message?: string } } }).response?.data?.message;
    }
    return undefined;
  }, []);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getAllReports();
      setReports(data.items || data.reports || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      const message = getErrorMessage(error);
      toast.error(message || 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  }, [getErrorMessage]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleUpdateStatus = useCallback(async (id: string, status: string) => {
    try {
      await adminService.updateReportStatus(id, status, 'Resolved by admin');
      toast.success('Report updated');
      await fetchReports();
    } catch (error) {
      console.error('Error updating report status:', error);
      const message = getErrorMessage(error);
      toast.error(message || 'Failed to update report');
    }
  }, [fetchReports, getErrorMessage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/25">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Reports <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Management</span>
            </h1>
            <p className="text-gray-500 font-medium">Review and manage user reports</p>
          </div>
        </div>
        
        <div className="card shadow-xl border border-gray-100 rounded-2xl">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center"><span className="text-2xl">📋</span></div><div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div></div><p className="text-gray-600 font-medium">Loading reports...</p>
              </div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600">All reports have been resolved</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {reports.map((report) => (
                <div key={report.id} className="p-6 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className={`badge ${
                          report.status === 'OPEN' ? 'badge-danger' :
                          report.status === 'RESOLVED' ? 'badge-success' :
                          'badge-warning'
                        }`}>
                          {report.status}
                        </span>
                        <span className="text-sm text-gray-600 font-medium">{report.type}</span>
                      </div>
                      <p className="text-gray-900 mb-3 font-medium leading-relaxed">{report.description}</p>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          <span className="font-semibold">Reported by:</span> {report.reporter?.firstName} {report.reporter?.lastName}
                        </div>
                        <div>
                          <span className="font-semibold">Against:</span> {report.reported?.firstName} {report.reported?.lastName}
                        </div>
                      </div>
                    </div>
                    {report.status === 'OPEN' && (
                      <div className="flex space-x-3 ml-6">
                        <button
                          onClick={() => handleUpdateStatus(report.id, 'RESOLVED')}
                          className="btn-sm bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(report.id, 'DISMISSED')}
                          className="btn-sm btn-secondary"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsManagement;


import { useEffect, useState } from 'react';
import { Report } from '@/types';
import adminService from '@/services/admin.service';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ReportsManagement = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getAllReports();
      setReports(data.items || data.reports || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await adminService.updateReportStatus(id, status, 'Resolved by admin');
      toast.success('Report updated');
      fetchReports();
    } catch (error) {
      toast.error('Failed to update report');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="section-title mb-8">Reports Management</h1>
        
        <div className="card shadow-xl border border-gray-100 rounded-2xl">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center space-y-4">
                <div className="spinner"></div>
                <p className="text-gray-600 font-medium">Loading reports...</p>
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


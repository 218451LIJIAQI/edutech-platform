import { useEffect, useState } from 'react';
import adminService from '@/services/admin.service';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ReportsManagement = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getAllReports();
      setReports(data.reports || []);
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Reports Management</h1>
      
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="spinner"></div></div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No reports found</p>
          </div>
        ) : (
          <div className="divide-y">
            {reports.map((report) => (
              <div key={report.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        report.status === 'OPEN' ? 'bg-red-100 text-red-800' :
                        report.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {report.status}
                      </span>
                      <span className="text-xs text-gray-500">{report.type}</span>
                    </div>
                    <p className="text-sm text-gray-900 mb-2">{report.description}</p>
                    <div className="text-xs text-gray-500">
                      Reported by: {report.reporter.firstName} {report.reporter.lastName} • 
                      Against: {report.reported.firstName} {report.reported.lastName}
                    </div>
                  </div>
                  {report.status === 'OPEN' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'RESOLVED')}
                        className="btn-sm bg-green-600 text-white hover:bg-green-700"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'DISMISSED')}
                        className="btn-sm bg-gray-600 text-white hover:bg-gray-700"
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
  );
};

export default ReportsManagement;


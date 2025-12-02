import { useEffect, useState, useCallback, useMemo } from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle, ChevronRight } from 'lucide-react';
import { Report, ReportStatus, ReportType } from '@/types';
import reportService from '@/services/report.service';
import toast from 'react-hot-toast';
import CustomerSupportWidget from '@/components/common/CustomerSupportWidget';
import CustomerSupportChat from '@/components/common/CustomerSupportChat';

/**
 * Student Report Page
 * Displays student's submitted reports and their status
 * Includes customer support chat widget for direct communication with support team
 */
const StudentReportPage = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'ALL'>('ALL');
  const [showChat, setShowChat] = useState(false);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await reportService.getMyReports();
      setReports(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load reports';
      console.error('Failed to fetch reports:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.OPEN:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case ReportStatus.UNDER_REVIEW:
        return <Clock className="w-5 h-5 text-blue-600" />;
      case ReportStatus.RESOLVED:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case ReportStatus.DISMISSED:
        return <XCircle className="w-5 h-5 text-gray-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.OPEN:
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case ReportStatus.UNDER_REVIEW:
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case ReportStatus.RESOLVED:
        return 'bg-green-50 border-green-200 text-green-900';
      case ReportStatus.DISMISSED:
        return 'bg-gray-50 border-gray-200 text-gray-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getReportTypeLabel = (type: ReportType) => {
    const labels: Record<ReportType, string> = {
      [ReportType.QUALITY_ISSUE]: 'Quality Issue',
      [ReportType.INAPPROPRIATE_CONTENT]: 'Inappropriate Content',
      [ReportType.FRAUD]: 'Fraud',
      [ReportType.TECHNICAL_ISSUE]: 'Technical Issue',
      [ReportType.OTHER]: 'Other',
    };
    return labels[type];
  };

  const filteredReports = useMemo(() => {
    return filterStatus === 'ALL'
      ? reports
      : reports.filter((r) => r.status === filterStatus);
  }, [reports, filterStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center"><span className="text-2xl">??</span></div><div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div></div><p className="text-gray-600 font-medium">Loading your reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/25">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                My <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Reports</span>
              </h1>
              <p className="text-gray-500 font-medium">Track the status of your submitted reports and complaints</p>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="card p-6 mb-8 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">??</span>
              <div>
                <h3 className="font-bold text-red-900 mb-1">Error loading reports</h3>
                <p className="text-red-700 text-sm">{error}</p>
                <button
                  onClick={fetchReports}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Reports Section */}
          <div className="lg:col-span-2">

            {/* Filter Tabs */}
            <div className="mb-6 flex flex-wrap gap-2">
          {(['ALL', ReportStatus.OPEN, ReportStatus.UNDER_REVIEW, ReportStatus.RESOLVED, ReportStatus.DISMISSED] as const).map(
            (status) => (
              <button
                type="button"
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status === 'ALL' ? 'All Reports' : status.replace(/_/g, ' ')}
                <span className="ml-2 text-sm">
                  ({reports.filter((r) => status === 'ALL' || r.status === status).length})
                </span>
              </button>
            )
          )}
        </div>

            {/* Reports List */}
            {filteredReports.length > 0 ? (
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className={`card cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-102 border-l-4 rounded-2xl shadow-lg ${
                      report.status === ReportStatus.OPEN
                        ? 'border-l-yellow-600 hover:border-l-yellow-700'
                        : report.status === ReportStatus.UNDER_REVIEW
                        ? 'border-l-blue-600 hover:border-l-blue-700'
                        : report.status === ReportStatus.RESOLVED
                        ? 'border-l-green-600 hover:border-l-green-700'
                        : 'border-l-gray-600 hover:border-l-gray-700'
                    }`}
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Status and Type */}
                        <div className="flex items-center gap-3 mb-3">
                          {getStatusIcon(report.status)}
                          <span className="text-sm font-semibold text-gray-700">
                            {report.status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">
                            {getReportTypeLabel(report.type)}
                          </span>
                        </div>

                        {/* Description Preview */}
                        <p className="text-gray-700 mb-3 line-clamp-2">
                          {report.description}
                        </p>

                        {/* Reported User */}
                        {report.reported && (
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Against:</strong> {report.reported.firstName} {report.reported.lastName}
                          </p>
                        )}

                        {/* Date */}
                        <p className="text-xs text-gray-500">
                          Submitted on {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-16 shadow-lg">
                <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No reports yet</h3>
                <p className="text-gray-600">
                  {filterStatus === 'ALL'
                    ? "You haven't submitted any reports yet."
                    : `No ${filterStatus.toLowerCase().replace(/_/g, ' ')} reports.`}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar - Customer Support Widget */}
          <div className="lg:col-span-1">
            <CustomerSupportWidget onOpenChat={() => setShowChat(true)} />
          </div>
        </div>

        {/* Report Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Report Details</h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ?
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Status Badge */}
                <div
                  className={`p-4 rounded-lg border ${getStatusColor(
                    selectedReport.status
                  )}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(selectedReport.status)}
                    <span className="font-semibold">
                      {selectedReport.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm">
                    {selectedReport.status === ReportStatus.OPEN &&
                      'Your report has been received and is awaiting review.'}
                    {selectedReport.status === ReportStatus.UNDER_REVIEW &&
                      'Our team is currently reviewing your report.'}
                    {selectedReport.status === ReportStatus.RESOLVED &&
                      'Your report has been reviewed and action has been taken.'}
                    {selectedReport.status === ReportStatus.DISMISSED &&
                      'Your report was reviewed but no action was necessary.'}
                  </p>
                </div>

                {/* Report Information */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-900">
                      Report Type
                    </label>
                    <p className="text-gray-700 mt-1">
                      {getReportTypeLabel(selectedReport.type)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-900">
                      Reported User
                    </label>
                    <p className="text-gray-700 mt-1">
                      {selectedReport.reported
                        ? `${selectedReport.reported.firstName} ${selectedReport.reported.lastName}`
                        : 'Unknown'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-900">
                      Description
                    </label>
                    <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                      {selectedReport.description}
                    </p>
                  </div>

                  {selectedReport.resolution && (
                    <div>
                      <label className="text-sm font-semibold text-gray-900">
                        Resolution
                      </label>
                      <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                        {selectedReport.resolution}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-semibold text-gray-900">
                      Submitted Date
                    </label>
                    <p className="text-gray-700 mt-1">
                      {new Date(selectedReport.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {selectedReport.resolvedAt && (
                    <div>
                      <label className="text-sm font-semibold text-gray-900">
                        Resolved Date
                      </label>
                      <p className="text-gray-700 mt-1">
                        {new Date(selectedReport.resolvedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Close Button */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="w-full px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customer Support Chat Component */}
        <CustomerSupportChat open={showChat} onClose={() => setShowChat(false)} />
      </div>
    </div>
  );
};

export default StudentReportPage;

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import clientLogger from '@/utils/logger';
import { AlertCircle, CheckCircle, Clock, XCircle, ChevronRight, X } from 'lucide-react';
import { Report, ReportStatus, ReportType } from '@/types';
import reportService from '@/services/report.service';
import toast from 'react-hot-toast';
import CustomerSupportWidget from '@/components/common/CustomerSupportWidget';
import CustomerServiceModal from '@/components/common/CustomerServiceModal';
import { extractErrorMessage } from '@/utils/error-handler';
import { useOverlayAccessibility, usePageTitle } from '@/hooks';

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  [ReportType.QUALITY_ISSUE]: 'Quality Issue',
  [ReportType.INAPPROPRIATE_CONTENT]: 'Inappropriate Content',
  [ReportType.FRAUD]: 'Fraud',
  [ReportType.TECHNICAL_ISSUE]: 'Technical Issue',
  [ReportType.OTHER]: 'Other',
};

const REPORT_STATUS_DESCRIPTIONS: Record<ReportStatus, string> = {
  [ReportStatus.OPEN]: 'Your report has been received and is awaiting review.',
  [ReportStatus.UNDER_REVIEW]: 'Our team is currently reviewing your report.',
  [ReportStatus.RESOLVED]: 'Your report has been reviewed and action has been taken.',
  [ReportStatus.DISMISSED]: 'Your report was reviewed but no action was necessary.',
};

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
    default:
      return 'bg-gray-50 border-gray-200 text-gray-900';
  }
};

const getStatusBorderClass = (status: ReportStatus) => {
  switch (status) {
    case ReportStatus.OPEN:
      return 'border-l-yellow-600 hover:border-l-yellow-700';
    case ReportStatus.UNDER_REVIEW:
      return 'border-l-blue-600 hover:border-l-blue-700';
    case ReportStatus.RESOLVED:
      return 'border-l-green-600 hover:border-l-green-700';
    case ReportStatus.DISMISSED:
    default:
      return 'border-l-gray-600 hover:border-l-gray-700';
  }
};

const StudentReportPage = () => {
  usePageTitle('My Reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'ALL'>('ALL');
  const [showSupportModal, setShowSupportModal] = useState(false);
  const reportModalRef = useRef<HTMLDivElement | null>(null);
  const reportModalCloseButtonRef = useRef<HTMLButtonElement | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await reportService.getMyReports();
      setReports(data);
    } catch (err) {
      const errorMessage = extractErrorMessage(err, 'Failed to load reports');
      clientLogger.error('Failed to fetch reports:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const closeReportModal = useCallback(() => {
    setSelectedReport(null);
  }, []);

  useOverlayAccessibility({
    isOpen: Boolean(selectedReport),
    containerRef: reportModalRef,
    initialFocusRef: reportModalCloseButtonRef,
    onClose: closeReportModal,
    trapFocus: true,
    lockBodyScroll: true,
  });

  const filteredReports = useMemo(
    () =>
      filterStatus === 'ALL'
        ? reports
        : reports.filter((report) => report.status === filterStatus),
    [reports, filterStatus]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping" />
          </div>
          <p className="text-gray-600 font-medium">Loading your reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/25">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                My <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Reports</span>
              </h1>
              <p className="text-gray-500 font-medium">Track the status of your submitted reports and complaints</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="card p-6 mb-8 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-red-900 mb-1">Error loading reports</h3>
                <p className="text-red-700 text-sm">{error}</p>
                <button
                  type="button"
                  onClick={() => void fetchReports()}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
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
                      ({reports.filter((report) => status === 'ALL' || report.status === status).length})
                    </span>
                  </button>
                )
              )}
            </div>

            {filteredReports.length > 0 ? (
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className={`card cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:scale-102 border-l-4 rounded-2xl shadow-lg ${getStatusBorderClass(
                      report.status
                    )}`}
                    onClick={() => setSelectedReport(report)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedReport(report);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          {getStatusIcon(report.status)}
                          <span className="text-sm font-semibold text-gray-700">
                            {report.status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">
                            {REPORT_TYPE_LABELS[report.type]}
                          </span>
                        </div>

                        <p className="text-gray-700 mb-3 line-clamp-2">
                          {report.description}
                        </p>

                        {report.reported && (
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Against:</strong> {report.reported.firstName} {report.reported.lastName}
                          </p>
                        )}

                        <p className="text-xs text-gray-500">
                          Submitted on {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>

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

          <div className="lg:col-span-1">
            <CustomerSupportWidget onOpenChat={() => setShowSupportModal(true)} />
          </div>
        </div>

        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              ref={reportModalRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="student-report-modal-title"
              aria-describedby="student-report-modal-description"
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 id="student-report-modal-title" className="text-2xl font-bold text-gray-900">Report Details</h2>
                <button
                  ref={reportModalCloseButtonRef}
                  type="button"
                  onClick={closeReportModal}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Close report details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <p id="student-report-modal-description" className="sr-only">
                  Review the status, details, and resolution of your submitted report.
                </p>

                <div className={`p-4 rounded-lg border ${getStatusColor(selectedReport.status)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(selectedReport.status)}
                    <span className="font-semibold">
                      {selectedReport.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm">
                    {REPORT_STATUS_DESCRIPTIONS[selectedReport.status]}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Report Type</span>
                    <p className="text-gray-700 mt-1">{REPORT_TYPE_LABELS[selectedReport.type]}</p>
                  </div>

                  <div>
                    <span className="text-sm font-semibold text-gray-900">Reported User</span>
                    <p className="text-gray-700 mt-1">
                      {selectedReport.reported
                        ? `${selectedReport.reported.firstName} ${selectedReport.reported.lastName}`
                        : 'Unknown'}
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-semibold text-gray-900">Description</span>
                    <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                      {selectedReport.description}
                    </p>
                  </div>

                  {selectedReport.resolution && (
                    <div>
                      <span className="text-sm font-semibold text-gray-900">Resolution</span>
                      <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                        {selectedReport.resolution}
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-semibold text-gray-900">Submitted Date</span>
                    <p className="text-gray-700 mt-1">
                      {new Date(selectedReport.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {selectedReport.resolvedAt && (
                    <div>
                      <span className="text-sm font-semibold text-gray-900">Resolved Date</span>
                      <p className="text-gray-700 mt-1">
                        {new Date(selectedReport.resolvedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeReportModal}
                    className="w-full px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <CustomerServiceModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />
    </div>
  );
};

export default StudentReportPage;

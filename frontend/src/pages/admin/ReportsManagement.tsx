import { useEffect, useState, useCallback, useRef } from 'react';
import clientLogger from '@/utils/logger';
import { Report, ReportStatus, ReportType } from '@/types';
import adminService from '@/services/admin.service';
import { AlertCircle, CheckCircle, RefreshCcw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import { usePageTitle } from '@/hooks';

const PAGE_LIMIT = 15;

const getReportBadgeClass = (status: string): string => {
  switch (status) {
    case 'OPEN':
      return 'badge-danger';
    case 'UNDER_REVIEW':
      return 'badge-warning';
    case 'RESOLVED':
      return 'badge-success';
    default:
      return 'badge';
  }
};

const ReportsManagement = () => {
  usePageTitle('Reports Management');
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});
  const requestIdRef = useRef(0);

  const hasActiveFilters = Boolean(statusFilter || typeFilter);

  const fetchReports = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await adminService.getAllReports({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        page,
        limit: PAGE_LIMIT,
      });
      if (requestId !== requestIdRef.current) return;
      const list = data.items || data.reports || [];
      setReports(list);
      setTotal(data.pagination?.total ?? list.length);
      setTotalPages(Math.max(1, data.pagination?.totalPages ?? 1));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      clientLogger.error('Error fetching reports:', error);
      const message = extractErrorMessage(error, 'Failed to load reports');
      setLoadError(message);
      toast.error(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const handleUpdateStatus = useCallback(
    async (id: string, status: 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED') => {
      if (submittingId) return;
      setSubmittingId(id);
      try {
        const customNote = resolutionDrafts[id]?.trim();
        const resolution =
          customNote ||
          (status === 'DISMISSED'
            ? 'Reviewed and dismissed by trust & safety admin'
            : status === 'RESOLVED'
              ? 'Investigated and resolved by trust & safety admin'
              : undefined);
        await adminService.updateReportStatus(id, status, resolution);
        toast.success(`Report marked as ${status.replace(/_/g, ' ').toLowerCase()}`);
        await fetchReports();
      } catch (error) {
        clientLogger.error('Error updating report status:', error);
        toast.error(extractErrorMessage(error, 'Failed to update report'));
      } finally {
        setSubmittingId(null);
      }
    },
    [fetchReports, resolutionDrafts, submittingId]
  );

  const resetFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/25">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">
                Reports{' '}
                <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Moderation
                </span>
              </h1>
              <p className="text-slate-600 font-medium">
                Investigate and resolve user, content, and conduct reports
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void fetchReports()}
            disabled={isLoading}
            className="btn-secondary"
          >
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="card flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="report-status-filter" className="text-sm font-semibold text-slate-700">
              Status:
            </label>
            <select
              id="report-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input py-2 w-44"
            >
              <option value="">All Statuses</option>
              {Object.values(ReportStatus).map((st) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            <label htmlFor="report-type-filter" className="text-sm font-semibold text-slate-700">
              Category:
            </label>
            <select
              id="report-type-filter"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="input py-2 w-52"
            >
              <option value="">All Categories</option>
              {Object.values(ReportType).map((tp) => (
                <option key={tp} value={tp}>
                  {tp.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button type="button" onClick={resetFilters} className="btn-secondary btn-sm">
                Reset Filters
              </button>
            )}
          </div>

          <p className="text-sm text-slate-600 tabular-nums">{total} report(s)</p>
        </div>

        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between gap-4">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => void fetchReports()}
              className="btn-outline btn-sm"
            >
              Retry
            </button>
          </div>
        )}

        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center space-y-3">
                <div className="spinner" />
                <p className="text-slate-600 font-medium text-sm">Loading reports...</p>
              </div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 px-6">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {hasActiveFilters ? 'No reports match the current filters' : 'No open reports'}
              </h3>
              <p className="text-slate-600 text-sm mb-4">
                {hasActiveFilters
                  ? 'Reset the status or category filter to inspect all historical reports.'
                  : 'All community and course reports have been reviewed.'}
              </p>
              {hasActiveFilters && (
                <button type="button" onClick={resetFilters} className="btn-secondary btn-sm">
                  Show All Reports
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {reports.map((report) => {
                const isActionable =
                  report.status === 'OPEN' || report.status === 'UNDER_REVIEW';
                const isBusy = submittingId === report.id;

                return (
                  <div
                    key={report.id}
                    className="p-6 hover:bg-slate-50/70 transition-colors space-y-4"
                  >
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5 mb-2">
                          <span className={getReportBadgeClass(report.status)}>
                            {report.status.replace(/_/g, ' ')}
                          </span>
                          <span className="badge">{report.type.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-slate-500 tabular-nums">
                            {new Date(report.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-900 mb-3 font-medium leading-relaxed">
                          {report.description}
                        </p>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
                          <div>
                            <span className="font-semibold text-slate-700">Reported by:</span>{' '}
                            {report.reporter?.firstName} {report.reporter?.lastName}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">Against:</span>{' '}
                            {report.reported?.firstName} {report.reported?.lastName}
                          </div>
                          {report.resolution && (
                            <div>
                              <span className="font-semibold text-slate-700">Resolution:</span>{' '}
                              {report.resolution}
                            </div>
                          )}
                        </div>
                      </div>

                      {isActionable && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                          <input
                            type="text"
                            aria-label={`Resolution note for report ${report.id}`}
                            value={resolutionDrafts[report.id] ?? ''}
                            onChange={(e) =>
                              setResolutionDrafts((prev) => ({
                                ...prev,
                                [report.id]: e.target.value,
                              }))
                            }
                            placeholder="Resolution note (optional)"
                            maxLength={2000}
                            className="input py-1.5 text-sm sm:w-56"
                            disabled={isBusy}
                          />
                          <div className="flex items-center gap-2">
                            {report.status === 'OPEN' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleUpdateStatus(report.id, 'UNDER_REVIEW')}
                                className="btn-outline btn-sm"
                              >
                                Under Review
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleUpdateStatus(report.id, 'RESOLVED')}
                              className="btn-primary btn-sm"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Resolve
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleUpdateStatus(report.id, 'DISMISSED')}
                              className="btn-secondary btn-sm"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm text-slate-600 tabular-nums">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn-secondary btn-sm"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="btn-primary btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsManagement;

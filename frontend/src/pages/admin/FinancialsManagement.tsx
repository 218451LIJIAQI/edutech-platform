import { useEffect, useMemo, useState } from 'react';
import clientLogger from '@/utils/logger';
import adminService, { FinancialStats, PaginationMeta, SettlementSummaryRow, TeacherCommissionListItem } from '@/services/admin.service';
import { DollarSign, TrendingUp, PieChart, Receipt, Calendar, RefreshCcw, Percent, Search, Download } from 'lucide-react';
import { RevenueAnalytics } from '@/components/admin';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import { buildCsvContent, downloadCsvFile } from '@/utils/download';
import { usePageTitle } from '@/hooks';

const pageSizes = [10, 20, 50];

type AdminPaymentRow = FinancialStats['recentPayments'][number];

const getPaymentCourseTitle = (payment: AdminPaymentRow): string => {
  const directTitle = payment.package?.course?.title?.trim();

  if (directTitle) {
    return directTitle;
  }

  const orderTitles = (payment.order?.items || [])
    .map((item) => item.package?.course?.title?.trim())
    .filter((title): title is string => Boolean(title));
  const uniqueTitles = Array.from(new Set(orderTitles));

  return uniqueTitles.length > 0 ? uniqueTitles.join(', ') : '-';
};

const FinancialsManagement = () => {
  usePageTitle('Financial Management');
  const [tab, setTab] = useState<'payments' | 'commissions' | 'settlements' | 'analytics'>('payments');

  // Financial overview & payments
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [appliedStartDate, setAppliedStartDate] = useState<string>('');
  const [appliedEndDate, setAppliedEndDate] = useState<string>('');
  const [paymentsRequestKey, setPaymentsRequestKey] = useState(0);

  // payments table pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = useMemo(() => {
    const len = stats?.recentPayments?.length || 0;
    return Math.max(1, Math.ceil(len / pageSize));
  }, [stats, pageSize]);

  const visiblePayments = useMemo(() => {
    const list = stats?.recentPayments || [];
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [stats, page, pageSize]);

  const hasPaymentDateRangeError = useMemo(
    () => Boolean(startDate && endDate && startDate > endDate),
    [startDate, endDate]
  );

  useEffect(() => {
    if (tab !== 'payments') {
      return;
    }

    let isActive = true;

    const loadPayments = async () => {
      setIsLoading(true);
      try {
        const params: { startDate?: string; endDate?: string } = {};
        if (appliedStartDate) params.startDate = appliedStartDate;
        if (appliedEndDate) params.endDate = appliedEndDate;
        const data = await adminService.getFinancials(params);
        if (isActive) {
          setStats(data);
        }
      } catch (error: unknown) {
        if (isActive) {
          clientLogger.error('Failed to load financial stats:', error);
          const errorMessage = extractErrorMessage(error, 'Failed to load financial stats');
          toast.error(errorMessage);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadPayments();

    return () => {
      isActive = false;
    };
  }, [tab, paymentsRequestKey, appliedStartDate, appliedEndDate]);

  // Commissions state
  const [commissionSearch, setCommissionSearch] = useState('');
  const [commissionPage, setCommissionPage] = useState(1);
  const [commissionLimit, setCommissionLimit] = useState(10);
  const [commissionRows, setCommissionRows] = useState<TeacherCommissionListItem[]>([]);
  const [commissionPagination, setCommissionPagination] = useState<PaginationMeta | null>(null);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [editing, setEditing] = useState<Record<string, number | null>>({});
  const [appliedCommissionSearch, setAppliedCommissionSearch] = useState('');
  const [commissionRequestKey, setCommissionRequestKey] = useState(0);

  useEffect(() => {
    if (tab !== 'commissions') {
      return;
    }

    let isActive = true;

    const loadCommissions = async () => {
      setCommissionLoading(true);
      try {
        const data = await adminService.getTeacherCommissions({
          search: appliedCommissionSearch || undefined,
          page: commissionPage,
          limit: commissionLimit,
        });
        if (isActive) {
          setCommissionRows(data.items);
          setCommissionPagination(data.pagination);
        }
      } catch (error: unknown) {
        if (isActive) {
          clientLogger.error('Failed to load commissions:', error);
          const errorMessage = extractErrorMessage(error, 'Failed to load commissions');
          toast.error(errorMessage);
        }
      } finally {
        if (isActive) {
          setCommissionLoading(false);
        }
      }
    };

    void loadCommissions();

    return () => {
      isActive = false;
    };
  }, [tab, commissionPage, commissionLimit, appliedCommissionSearch, commissionRequestKey]);

  // Settlements state
  const [settStart, setSettStart] = useState('');
  const [settEnd, setSettEnd] = useState('');
  const [appliedSettStart, setAppliedSettStart] = useState('');
  const [appliedSettEnd, setAppliedSettEnd] = useState('');
  const [settPage, setSettPage] = useState(1);
  const [settLimit] = useState(10);
  const [settRows, setSettRows] = useState<SettlementSummaryRow[]>([]);
  const [settPagination, setSettPagination] = useState<PaginationMeta | null>(null);
  const [settLoading, setSettLoading] = useState(false);
  const [settlementRequestKey, setSettlementRequestKey] = useState(0);

  const hasSettlementDateRangeError = useMemo(
    () => Boolean(settStart && settEnd && settStart > settEnd),
    [settStart, settEnd]
  );

  useEffect(() => {
    if (tab !== 'settlements') {
      return;
    }

    let isActive = true;

    const loadSettlements = async () => {
      setSettLoading(true);
      try {
        const data = await adminService.getSettlements({
          startDate: appliedSettStart || undefined,
          endDate: appliedSettEnd || undefined,
          page: settPage,
          limit: settLimit,
        });
        if (isActive) {
          setSettRows(data.items);
          setSettPagination(data.pagination);
        }
      } catch (error: unknown) {
        if (isActive) {
          clientLogger.error('Failed to load settlements:', error);
          const errorMessage = extractErrorMessage(error, 'Failed to load settlements');
          toast.error(errorMessage);
        }
      } finally {
        if (isActive) {
          setSettLoading(false);
        }
      }
    };

    void loadSettlements();

    return () => {
      isActive = false;
    };
  }, [tab, settPage, settLimit, appliedSettStart, appliedSettEnd, settlementRequestKey]);

  const formatMoney = (v: number | undefined) =>
    (v ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  const exportCSV = <T,>(rows: T[], headers: string[], mapper: (row: T) => Array<string | number | null | undefined>) => {
    if (!rows || rows.length === 0) {
      toast.error('No data to export');
      return;
    }
    try {
      const csv = buildCsvContent([headers, ...rows.map((row) => mapper(row))]);
      downloadCsvFile(csv, `export-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error: unknown) {
      clientLogger.error('Failed to export CSV:', error);
      toast.error(extractErrorMessage(error, 'Failed to export CSV'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Financials <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Management</span>
              </h1>
              <p className="text-gray-500 font-medium">Platform financials, commissions and settlements</p>
            </div>
          </div>
          {tab === 'payments' ? (
            <button
              type="button"
              onClick={() => setPaymentsRequestKey((currentKey) => currentKey + 1)}
              className="btn btn-outline flex items-center gap-2"
              title="Refresh"
            >
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
          ) : tab === 'commissions' ? (
            <button
              type="button"
              onClick={() => setCommissionRequestKey((currentKey) => currentKey + 1)}
              className="btn btn-outline flex items-center gap-2"
              title="Refresh"
            >
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
          ) : tab === 'settlements' ? (
            <button
              type="button"
              onClick={() => setSettlementRequestKey((currentKey) => currentKey + 1)}
              className="btn btn-outline flex items-center gap-2"
              title="Refresh"
            >
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
          ) : null}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            className={`px-4 py-2 rounded-lg font-semibold ${tab === 'payments' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setTab('payments')}
          >
            Payments
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-lg font-semibold ${tab === 'commissions' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setTab('commissions')}
          >
            Commissions
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-lg font-semibold ${tab === 'settlements' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setTab('settlements')}
          >
            Settlements
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-lg font-semibold ${tab === 'analytics' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setTab('analytics')}
          >
            Analytics
          </button>
        </div>

        {tab === 'payments' ? (
          <>
            {/* Filters */}
            <div className="card mb-6 shadow-xl border border-gray-100 rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <label htmlFor="payment-start-date" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                      id="payment-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input py-2"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label htmlFor="payment-end-date" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                      id="payment-end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={`input py-2 ${hasPaymentDateRangeError ? 'border-red-500 focus:ring-red-500' : ''}`}
                      aria-invalid={hasPaymentDateRangeError}
                    />
                  </div>
                  {hasPaymentDateRangeError && (
                    <p className="mt-1 text-sm text-red-600">End date must be the same as or later than start date.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={isLoading}
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setAppliedStartDate('');
                      setAppliedEndDate('');
                      setPage(1);
                      setPaymentsRequestKey((currentKey) => currentKey + 1);
                    }}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isLoading || hasPaymentDateRangeError}
                    onClick={() => {
                      if (hasPaymentDateRangeError) {
                        toast.error('Start date cannot be later than end date.');
                        return;
                      }
                      setPage(1);
                      setAppliedStartDate(startDate);
                      setAppliedEndDate(endDate);
                      setPaymentsRequestKey((currentKey) => currentKey + 1);
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            {/* Overview cards */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="spinner" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-green-100">Total Revenue</h3>
                      <DollarSign className="w-5 h-5 text-white/90" />
                    </div>
                    <p className="text-3xl font-bold mt-2">{formatMoney(stats?.totals.totalRevenue)}</p>
                  </div>
                  <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-blue-100">Platform Earnings</h3>
                      <PieChart className="w-5 h-5 text-white/90" />
                    </div>
                    <p className="text-3xl font-bold mt-2">{formatMoney(stats?.totals.platformEarnings)}</p>
                  </div>
                  <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-purple-100">Teacher Earnings</h3>
                      <TrendingUp className="w-5 h-5 text-white/90" />
                    </div>
                    <p className="text-3xl font-bold mt-2">{formatMoney(stats?.totals.teacherEarnings)}</p>
                  </div>
                  <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-orange-100">Transactions</h3>
                      <Receipt className="w-5 h-5 text-white/90" />
                    </div>
                    <p className="text-3xl font-bold mt-2">{stats?.totals.transactionCount ?? 0}</p>
                  </div>
                </div>

                {/* Recent payments table */}
                <div className="card overflow-x-auto">
                  <div className="px-6 pt-4 flex justify-end">
                    <button
                      type="button"
                      className="btn btn-outline flex items-center gap-2"
                      onClick={() => exportCSV(visiblePayments,
                        ['Paid At','User','Course','Amount','Platform','Teacher','Status'],
                        (payment) => [
                          payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '-',
                          `${payment.user?.firstName || ''} ${payment.user?.lastName || ''}`.trim(),
                          getPaymentCourseTitle(payment),
                          payment.amount,
                          payment.platformCommission,
                          payment.teacherEarning,
                          payment.status
                        ])}
                    >
                      <Download className="w-4 h-4"/> Export CSV
                    </button>
                  </div>
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left font-bold text-gray-900">Paid At</th>
                        <th className="px-6 py-4 text-left font-bold text-gray-900">User</th>
                        <th className="px-6 py-4 text-left font-bold text-gray-900">Course</th>
                        <th className="px-6 py-4 text-left font-bold text-gray-900">Amount</th>
                        <th className="px-6 py-4 text-left font-bold text-gray-900">Platform</th>
                        <th className="px-6 py-4 text-left font-bold text-gray-900">Teacher</th>
                        <th className="px-6 py-4 text-left font-bold text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {visiblePayments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No payments in selected period</td>
                        </tr>
                      ) : (
                        visiblePayments.map((p) => (
                          <tr key={p.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.paidAt ? new Date(p.paidAt).toLocaleString() : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.user?.firstName} {p.user?.lastName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{getPaymentCourseTitle(p)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">{formatMoney(p.amount)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{formatMoney(p.platformCommission)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{formatMoney(p.teacherEarning)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700">COMPLETED</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Pagination controls */}
                  {stats && stats.recentPayments && stats.recentPayments.length > 0 && (
                    <div className="px-6 py-4 border-t flex items-center justify-between">
                      <div className="text-sm text-gray-700">Page {page} of {totalPages}</div>
                      <div className="flex items-center gap-3">
                        <select
                          value={pageSize}
                          onChange={(e) => { setPage(1); setPageSize(Number.parseInt(e.target.value, 10)); }}
                          className="px-2 py-1 border rounded-lg text-sm"
                          aria-label="Items per page"
                        >
                          {pageSizes.map((s) => (
                            <option key={s} value={s}>{s}/page</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-outline btn-sm"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : tab === 'commissions' ? (
          <div className="space-y-4">
            {/* Search & Controls */}
            <div className="card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email"
                  value={commissionSearch}
                  onChange={(e) => setCommissionSearch(e.target.value)}
                  className="input py-2"
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setCommissionPage(1);
                    setAppliedCommissionSearch(commissionSearch);
                    setCommissionRequestKey((currentKey) => currentKey + 1);
                  }}
                >
                  Search
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Per page</label>
                <select
                  value={commissionLimit}
                  onChange={(e) => { setCommissionPage(1); setCommissionLimit(Number.parseInt(e.target.value, 10)); }}
                  className="px-2 py-1 border rounded-lg text-sm"
                  aria-label="Items per page"
                >
                  {pageSizes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Teacher</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Email</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Students</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Rating</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Total Earnings</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Commission Rate</th>
                    <th className="px-6 py-4 text-right font-bold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {commissionLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center">
                        <div className="spinner mx-auto" />
                      </td>
                    </tr>
                  ) : commissionRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No teachers found</td>
                    </tr>
                  ) : (
                    commissionRows.map((t) => {
                      const key = t.id;
                      const currentRate = editing[key] !== undefined ? editing[key] : (t.teacherProfile?.commissionRate ?? null);
                      return (
                        <tr key={t.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{t.firstName} {t.lastName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.teacherProfile?.totalStudents ?? 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{(t.teacherProfile?.averageRating ?? 0).toFixed(1)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatMoney(t.teacherProfile?.totalEarnings)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <Percent className="w-4 h-4 text-gray-400" />
                              <input
                                type="number"
                                step="0.1"
                                min={0}
                                max={100}
                                value={currentRate === null || currentRate === undefined ? '' : currentRate}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEditing((prev) => ({ ...prev, [key]: v === '' ? null : Number(v) }));
                                }}
                                placeholder="Default"
                                className="w-28 px-2 py-1 border rounded-lg"
                              />
                              {currentRate !== null && currentRate !== undefined && (
                                <button
                                  type="button"
                                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                                  onClick={() => setEditing((prev) => ({ ...prev, [key]: null }))}
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={async () => {
                                try {
                                  const value: number | null =
                                    editing[key] !== undefined
                                      ? editing[key]
                                      : (t.teacherProfile?.commissionRate ?? null);
                                  if (
                                    value !== null &&
                                    (!Number.isFinite(value) || value < 0 || value > 100)
                                  ) {
                                    toast.error('Commission rate must be between 0 and 100');
                                    return;
                                  }
                                  await adminService.updateTeacherCommission(t.id, value);
                                  toast.success('Commission saved');
                                  setEditing((prev) => {
                                    const next = { ...prev };
                                    delete next[key];
                                    return next;
                                  });
                                  setCommissionRequestKey((currentKey) => currentKey + 1);
                                } catch (error: unknown) {
                                  clientLogger.error('Failed to save commission:', error);
                                  const errorMessage = extractErrorMessage(error, 'Failed to save commission');
                                  toast.error(errorMessage);
                                }
                              }}
                            >
                              Save
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {commissionPagination && commissionPagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t flex items-center justify-between">
                  <div className="text-sm text-gray-700">Page {commissionPagination.page} of {commissionPagination.totalPages}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn-outline btn-sm"
                      disabled={commissionPagination.page <= 1}
                      onClick={() => setCommissionPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      disabled={commissionPagination.page >= commissionPagination.totalPages}
                      onClick={() => setCommissionPage((p) => Math.min(commissionPagination.totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : tab === 'settlements' ? (
          <div className="space-y-4">
            {/* Filters */}
            <div className="card flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <label htmlFor="settlement-start-date" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <input id="settlement-start-date" type="date" value={settStart} onChange={(e) => setSettStart(e.target.value)} className="input py-2" />
                </div>
              </div>
              <div className="flex-1">
                <label htmlFor="settlement-end-date" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <input
                    id="settlement-end-date"
                    type="date"
                    value={settEnd}
                    onChange={(e) => setSettEnd(e.target.value)}
                    className={`input py-2 ${hasSettlementDateRangeError ? 'border-red-500 focus:ring-red-500' : ''}`}
                    aria-invalid={hasSettlementDateRangeError}
                  />
                </div>
                {hasSettlementDateRangeError && (
                  <p className="mt-1 text-sm text-red-600">End date must be the same as or later than start date.</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={settLoading}
                  onClick={() => {
                    setSettStart('');
                    setSettEnd('');
                    setAppliedSettStart('');
                    setAppliedSettEnd('');
                    setSettPage(1);
                    setSettlementRequestKey((currentKey) => currentKey + 1);
                  }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={settLoading || hasSettlementDateRangeError}
                  onClick={() => {
                    if (hasSettlementDateRangeError) {
                      toast.error('Start date cannot be later than end date.');
                      return;
                    }
                    setSettPage(1);
                    setAppliedSettStart(settStart);
                    setAppliedSettEnd(settEnd);
                    setSettlementRequestKey((currentKey) => currentKey + 1);
                  }}
                >
                  Apply
                </button>
                <button
                  type="button"
                  className="btn btn-outline flex items-center gap-2"
                  onClick={() => exportCSV(settRows, ['Teacher','Email','Gross','Platform','Teacher','Transactions'],
                    (row) => [row.teacherName, row.teacherEmail || '-', row.totalGross, row.platformCommission, row.teacherEarning, row.transactions])}
                >
                  <Download className="w-4 h-4"/> Export CSV
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Teacher</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Email</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Gross</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Platform</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Teacher</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900">Transactions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {settLoading ? (
                    <tr><td colSpan={6} className="px-6 py-10 text-center"><div className="spinner mx-auto" /></td></tr>
                  ) : settRows.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No data</td></tr>
                  ) : (
                    settRows.map((r) => (
                      <tr key={r.teacherUserId} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{r.teacherName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.teacherEmail || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{formatMoney(r.totalGross)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{formatMoney(r.platformCommission)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{formatMoney(r.teacherEarning)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{r.transactions}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {settPagination && settPagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t flex items-center justify-between">
                  <div className="text-sm text-gray-700">Page {settPagination.page} of {settPagination.totalPages}</div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn-outline btn-sm" disabled={settPagination.page <= 1} onClick={() => setSettPage((p) => Math.max(1, p - 1))}>Previous</button>
                    <button type="button" className="btn-primary btn-sm" disabled={settPagination.page >= settPagination.totalPages} onClick={() => setSettPage((p) => Math.min(settPagination.totalPages, p + 1))}>Next</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <RevenueAnalytics />
        )}
      </div>
    </div>
  );
};

export default FinancialsManagement;

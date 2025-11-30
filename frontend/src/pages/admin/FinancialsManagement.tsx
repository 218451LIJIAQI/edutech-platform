import { useEffect, useMemo, useState } from 'react';
import adminService, { FinancialStats } from '@/services/admin.service';
import { DollarSign, TrendingUp, PieChart, Receipt, Calendar, RefreshCcw, Percent, Search, Download } from 'lucide-react';
import RevenueAnalytics from './RevenueAnalytics';
import toast from 'react-hot-toast';

const pageSizes = [10, 20, 50];

type TeacherCommissionRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  teacherProfile?: {
    id: string;
    commissionRate?: number | null;
    totalStudents: number;
    averageRating: number;
    totalEarnings: number;
  } | null;
};

type Pagination = { total: number; page: number; limit: number; totalPages: number };

type SettlementRow = {
  teacherUserId: string;
  teacherName: string;
  teacherEmail?: string;
  totalGross: number;
  platformCommission: number;
  teacherEarning: number;
  transactions: number;
};

const FinancialsManagement = () => {
  const [tab, setTab] = useState<'payments' | 'commissions' | 'settlements' | 'analytics'>('payments');

  // Financial overview & payments
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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

  const loadData = async () => {
    setIsLoading(true);
    try {
      const params: { startDate?: string; endDate?: string } = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await adminService.getFinancials(params);
      setStats(data);
    } catch (error: unknown) {
      console.error('Failed to load financial stats:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load financial stats';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'payments') {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Commissions state
  const [commissionSearch, setCommissionSearch] = useState('');
  const [commissionPage, setCommissionPage] = useState(1);
  const [commissionLimit, setCommissionLimit] = useState(10);
  const [commissionRows, setCommissionRows] = useState<TeacherCommissionRow[]>([]);
  const [commissionPagination, setCommissionPagination] = useState<Pagination | null>(null);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [editing, setEditing] = useState<Record<string, number | null>>({});

  const loadCommissions = async () => {
    setCommissionLoading(true);
    try {
      const data = await adminService.getTeacherCommissions({
        search: commissionSearch || undefined,
        page: commissionPage,
        limit: commissionLimit,
      });
      if (data.items && Array.isArray(data.items)) {
        setCommissionRows(data.items as unknown as TeacherCommissionRow[]);
      } else {
        setCommissionRows([]);
      }
      if (data.pagination) {
        setCommissionPagination(data.pagination as Pagination);
      } else {
        setCommissionPagination(null);
      }
    } catch (error: unknown) {
      console.error('Failed to load commissions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load commissions';
      toast.error(errorMessage);
    } finally {
      setCommissionLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'commissions') {
      loadCommissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, commissionPage, commissionLimit, commissionSearch]);

  // Settlements state
  const [settStart, setSettStart] = useState('');
  const [settEnd, setSettEnd] = useState('');
  const [settPage, setSettPage] = useState(1);
  const [settLimit] = useState(10);
  const [settRows, setSettRows] = useState<SettlementRow[]>([]);
  const [settPagination, setSettPagination] = useState<Pagination | null>(null);
  const [settLoading, setSettLoading] = useState(false);

  const loadSettlements = async () => {
    setSettLoading(true);
    try {
      const data = await adminService.getSettlements({
        startDate: settStart || undefined,
        endDate: settEnd || undefined,
        page: settPage,
        limit: settLimit,
      });
      if (data.items && Array.isArray(data.items)) {
        setSettRows(data.items as unknown as SettlementRow[]);
      } else {
        setSettRows([]);
      }
      if (data.pagination) {
        setSettPagination(data.pagination as Pagination);
      } else {
        setSettPagination(null);
      }
    } catch (error: unknown) {
      console.error('Failed to load settlements:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load settlements';
      toast.error(errorMessage);
    } finally {
      setSettLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'settlements') {
      loadSettlements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, settPage, settLimit, settStart, settEnd]);



  const formatMoney = (v: number | undefined) =>
    (v ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  const exportCSV = (rows: unknown[], headers: string[], mapper: (row: unknown) => unknown[]) => {
    if (!rows || rows.length === 0) {
      toast.error('No data to export');
      return;
    }
    try {
      const csv = [
        headers.join(','),
        ...rows.map((r) => mapper(r).map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('Failed to export CSV:', error);
      toast.error('Failed to export CSV');
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
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Financials <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Management</span>
              </h1>
              <p className="text-gray-500 font-medium">Platform financials, commissions and settlements</p>
            </div>
          </div>
          {tab === 'payments' ? (
            <button
              onClick={loadData}
              className="btn btn-outline flex items-center gap-2"
              title="Refresh"
            >
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
          ) : tab === 'commissions' ? (
            <button
              onClick={loadCommissions}
              className="btn btn-outline flex items-center gap-2"
              title="Refresh"
            >
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
          ) : tab === 'settlements' ? (
            <button
              onClick={loadSettlements}
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
            className={`px-4 py-2 rounded-lg font-semibold ${tab === 'payments' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setTab('payments')}
          >
            Payments
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-semibold ${tab === 'commissions' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setTab('commissions')}
          >
            Commissions
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-semibold ${tab === 'settlements' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setTab('settlements')}
          >
            Settlements
          </button>
          <button
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input py-2"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input py-2"
                    />
                  </div>
                </div>
                <div>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setPage(1);
                      loadData();
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
                      className="btn btn-outline flex items-center gap-2"
                      onClick={() => exportCSV(visiblePayments,
                        ['Paid At','User','Course','Amount','Platform','Teacher','Status'],
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (p: any) => [
                          p.paidAt ? new Date(p.paidAt).toLocaleString() : '-',
                          `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.trim(),
                          p.package?.course?.title || '-',
                          p.amount,
                          p.platformCommission,
                          p.teacherEarning,
                          p.status
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.package?.course?.title || '-'}</td>
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
                          onChange={(e) => { setPage(1); setPageSize(parseInt(e.target.value)); }}
                          className="px-2 py-1 border rounded-lg text-sm"
                          aria-label="Items per page"
                        >
                          {pageSizes.map((s) => (
                            <option key={s} value={s}>{s}/page</option>
                          ))}
                        </select>
                        <button
                          className="btn-outline btn-sm"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </button>
                        <button
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
                  className="btn btn-primary"
                  onClick={() => { setCommissionPage(1); loadCommissions(); }}
                >
                  Search
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Per page</label>
                <select
                  value={commissionLimit}
                  onChange={(e) => { setCommissionPage(1); setCommissionLimit(parseInt(e.target.value)); }}
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
                              className="btn btn-primary btn-sm"
                              onClick={async () => {
                                try {
                                  const value = editing[key] ?? (t.teacherProfile?.commissionRate ?? null);
                                  await adminService.updateTeacherCommission(t.id, value as number | null);
                                  toast.success('Commission saved');
                                  setEditing((prev) => {
                                    const next = { ...prev };
                                    delete next[key];
                                    return next;
                                  });
                                  loadCommissions();
                                } catch (error: unknown) {
                                  const errorMessage = error instanceof Error ? error.message : 'Failed to save commission';
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
                      className="btn-outline btn-sm"
                      disabled={commissionPagination.page <= 1}
                      onClick={() => setCommissionPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <button
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <input type="date" value={settStart} onChange={(e) => setSettStart(e.target.value)} className="input py-2" />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <input type="date" value={settEnd} onChange={(e) => setSettEnd(e.target.value)} className="input py-2" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="btn btn-primary" onClick={() => { setSettPage(1); loadSettlements(); }}>Apply</button>
                <button
                  className="btn btn-outline flex items-center gap-2"
                  onClick={() => exportCSV(settRows, ['Teacher','Email','Gross','Platform','Teacher','Transactions'],
                    ((r: unknown) => { const row = r as SettlementRow; return [row.teacherName, row.teacherEmail || '-', row.totalGross, row.platformCommission, row.teacherEarning, row.transactions]; }))}
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
                    <button className="btn-outline btn-sm" disabled={settPagination.page <= 1} onClick={() => setSettPage((p) => Math.max(1, p - 1))}>Previous</button>
                    <button className="btn-primary btn-sm" disabled={settPagination.page >= settPagination.totalPages} onClick={() => setSettPage((p) => Math.min(settPagination.totalPages, p + 1))}>Next</button>
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

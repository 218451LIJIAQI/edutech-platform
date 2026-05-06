import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import adminService, {
  type RevenueAnalyticsData,
  type RevenueBreakdownPoint,
} from '@/services/admin.service';
import { extractErrorMessage } from '@/utils/error-handler';
import clientLogger from '@/utils/logger';

type GroupBy = 'day' | 'week' | 'month';

interface RevenueFilters {
  startDate: string;
  endDate: string;
  groupBy: GroupBy;
}

const DEFAULT_FILTERS: RevenueFilters = {
  startDate: '',
  endDate: '',
  groupBy: 'day',
};

const CHART_COLORS = ['#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc'];

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const formatMoney = (value: unknown) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return moneyFormatter.format(0);
  }

  return moneyFormatter.format(numericValue);
};

const formatTooltipValue = (
  value: number | string | readonly (number | string)[] | undefined
) => {
  const resolvedValue = Array.isArray(value) ? value[0] : value;
  return formatMoney(resolvedValue);
};

const EmptyChartState = ({ message }: { message: string }) => (
  <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
    {message}
  </div>
);

/**
 * RevenueAnalytics
 *
 * Displays admin revenue analytics with filterable revenue trends,
 * top earning teachers, top selling courses, and revenue breakdown by course type.
 */
const RevenueAnalytics = () => {
  const [data, setData] = useState<RevenueAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<RevenueFilters>(DEFAULT_FILTERS);

  const revenueTrend = data?.revenueTrend ?? [];
  const topTeachers = data?.topTeachers ?? [];
  const topCourses = data?.topCourses ?? [];
  const revenueBreakdown = data?.revenueBreakdown ?? [];

  const hasDateRangeError = useMemo(() => {
    return Boolean(
      filters.startDate &&
        filters.endDate &&
        filters.startDate > filters.endDate
    );
  }, [filters.startDate, filters.endDate]);

  const updateFilter = <K extends keyof RevenueFilters>(
    key: K,
    value: RevenueFilters[K]
  ) => {
    setFilters((previousFilters) => ({
      ...previousFilters,
      [key]: value,
    }));
  };

  const loadAnalytics = useCallback(async (selectedFilters: RevenueFilters) => {
    setLoading(true);

    try {
      const analyticsData = await adminService.getRevenueAnalytics({
        startDate: selectedFilters.startDate || undefined,
        endDate: selectedFilters.endDate || undefined,
        groupBy: selectedFilters.groupBy,
      });

      setData(analyticsData);
    } catch (error: unknown) {
      clientLogger.error('Error loading revenue analytics data:', error);
      toast.error(extractErrorMessage(error, 'Failed to load analytics data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics(DEFAULT_FILTERS);
  }, [loadAnalytics]);

  const handleApplyFilters = () => {
    if (hasDateRangeError) {
      toast.error('Start date cannot be later than end date.');
      return;
    }

    void loadAnalytics(filters);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    void loadAnalytics(DEFAULT_FILTERS);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" aria-label="Loading revenue analytics" />
      </div>
    );
  }

  return (
    <div className="space-y-6" aria-busy={loading}>
      {/* Filters */}
      <div className="card flex flex-col gap-4 rounded-2xl border border-gray-100 shadow-xl md:flex-row md:items-end">
        <div className="flex-1">
          <label
            htmlFor="revenue-start-date"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Start Date
          </label>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              id="revenue-start-date"
              type="date"
              value={filters.startDate}
              onChange={(event) =>
                updateFilter('startDate', event.target.value)
              }
              className="input py-2"
            />
          </div>
        </div>

        <div className="flex-1">
          <label
            htmlFor="revenue-end-date"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            End Date
          </label>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              id="revenue-end-date"
              type="date"
              value={filters.endDate}
              onChange={(event) => updateFilter('endDate', event.target.value)}
              className={`input py-2 ${
                hasDateRangeError ? 'border-red-500 focus:ring-red-500' : ''
              }`}
              aria-invalid={hasDateRangeError}
            />
          </div>

          {hasDateRangeError && (
            <p className="mt-1 text-sm text-red-600">
              End date must be the same as or later than start date.
            </p>
          )}
        </div>

        <div className="flex-1">
          <label
            htmlFor="revenue-group-by"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Group By
          </label>

          <select
            id="revenue-group-by"
            value={filters.groupBy}
            onChange={(event) =>
              updateFilter('groupBy', event.target.value as GroupBy)
            }
            className="input py-2"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResetFilters}
            disabled={loading}
          >
            Reset
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApplyFilters}
            disabled={loading || hasDateRangeError}
          >
            {loading ? 'Loading...' : 'Apply'}
          </button>
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="card rounded-2xl border border-gray-100 shadow-xl">
        <h3 className="mb-4 text-xl font-bold">Revenue Trend</h3>

        {revenueTrend.length === 0 ? (
          <EmptyChartState message="No revenue trend data available for the selected filters." />
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={20} />
              <YAxis tickFormatter={formatMoney} />
              <Tooltip formatter={formatTooltipValue} />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalRevenue"
                stroke="#0284c7"
                strokeWidth={2}
                name="Total Revenue"
              />
              <Line
                type="monotone"
                dataKey="platformEarnings"
                stroke="#0ea5e9"
                strokeWidth={2}
                name="Platform Earnings"
              />
              <Line
                type="monotone"
                dataKey="teacherEarnings"
                stroke="#38bdf8"
                strokeWidth={2}
                name="Teacher Earnings"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Teachers */}
        <div className="card rounded-2xl border border-gray-100 shadow-xl lg:col-span-1">
          <h3 className="mb-4 text-xl font-bold">Top Earning Teachers</h3>

          {topTeachers.length === 0 ? (
            <EmptyChartState message="No teacher earnings data available." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topTeachers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={formatMoney} />
                <YAxis type="category" dataKey="name" width={110} />
                <Tooltip formatter={formatTooltipValue} />
                <Bar dataKey="earnings" fill="#0284c7" name="Earnings" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Courses */}
        <div className="card rounded-2xl border border-gray-100 shadow-xl lg:col-span-2">
          <h3 className="mb-4 text-xl font-bold">Top Selling Courses</h3>

          {topCourses.length === 0 ? (
            <EmptyChartState message="No course revenue data available." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCourses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="title"
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tickFormatter={formatMoney} />
                <Tooltip formatter={formatTooltipValue} />
                <Bar dataKey="revenue" fill="#0ea5e9" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="card rounded-2xl border border-gray-100 shadow-xl">
        <h3 className="mb-4 text-xl font-bold">
          Revenue Breakdown by Course Type
        </h3>

        {revenueBreakdown.length === 0 ? (
          <EmptyChartState message="No revenue breakdown data available." />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueBreakdown}
                dataKey="revenue"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {revenueBreakdown.map(
                  (_entry: RevenueBreakdownPoint, index: number) => (
                    <Cell
                      key={`revenue-breakdown-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  )
                )}
              </Pie>
              <Tooltip formatter={formatTooltipValue} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default RevenueAnalytics;
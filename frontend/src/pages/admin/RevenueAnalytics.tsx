import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import adminService from '@/services/admin.service';
import toast from 'react-hot-toast';
import { Calendar } from 'lucide-react';

const COLORS = ['#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc'];

const RevenueAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const analyticsData = await adminService.getRevenueAnalytics({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        groupBy,
      });
      setData(analyticsData);
    } catch (error) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy]);

  const formatMoney = (value: number) => `$${value.toLocaleString()}`;

  if (loading) {
    return <div className="flex justify-center items-center py-20"><div className="spinner" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input py-2" />
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input py-2" />
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} className="input py-2">
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
        <div>
          <button className="btn btn-primary" onClick={loadAnalytics}>Apply</button>
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data?.revenueTrend ?? []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={formatMoney} />
            <Tooltip formatter={(value: number) => formatMoney(value)} />
            <Legend />
            <Line type="monotone" dataKey="totalRevenue" stroke="#0284c7" name="Total Revenue" />
            <Line type="monotone" dataKey="platformEarnings" stroke="#0ea5e9" name="Platform Earnings" />
            <Line type="monotone" dataKey="teacherEarnings" stroke="#38bdf8" name="Teacher Earnings" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Teachers */}
        <div className="card lg:col-span-1">
          <h3 className="text-xl font-bold mb-4">Top Earning Teachers</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.topTeachers ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={formatMoney} />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip formatter={(value: number) => formatMoney(value)} />
              <Bar dataKey="earnings" fill="#0284c7" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Courses */}
        <div className="card lg:col-span-2">
          <h3 className="text-xl font-bold mb-4">Top Selling Courses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.topCourses ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" />
              <YAxis tickFormatter={formatMoney} />
              <Tooltip formatter={(value: number) => formatMoney(value)} />
              <Bar dataKey="revenue" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Revenue Breakdown by Course Type</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data?.revenueBreakdown ?? []} dataKey="revenue" nameKey="type" cx="50%" cy="50%" outerRadius={100} label>
              {(data?.revenueBreakdown ?? []).map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatMoney(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueAnalytics;


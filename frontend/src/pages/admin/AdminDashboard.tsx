import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
} from 'lucide-react';
import adminService, { PlatformStats } from '@/services/admin.service';
import { formatCurrency } from '@/utils/helpers';
import { usePageTitle } from '@/hooks';
import styles from './AdminDashboard.module.css';

/**
 * Progress Bar Component
 */
interface ProgressBarProps {
  percentage: number;
  containerClassName: string;
  barClassName: string;
}

const ProgressBar = ({ percentage, containerClassName, barClassName }: ProgressBarProps) => {
  const progressRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.setProperty('--progress-width', `${percentage}%`);
    }
  }, [percentage]);

  return (
    <div className={containerClassName}>
      <div
        ref={progressRef}
        className={`${styles.progressBar} ${barClassName}`}
      ></div>
    </div>
  );
};

/**
 * Admin Dashboard
 * Overview of platform statistics and recent activities
 */
const AdminDashboard = () => {
  usePageTitle('Admin Dashboard');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activities, setActivities] = useState<Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
    user?: { firstName: string; lastName: string };
  }>>([]);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [activitiesLimit, setActivitiesLimit] = useState(10);
  const [activitiesPagination, setActivitiesPagination] = useState<{ total: number; page: number; limit: number; totalPages: number; hasMore: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activitiesPage, activitiesLimit]);

  useEffect(() => {
    // lightweight polling for recent activities to keep the feed in sync on current page
    const interval = setInterval(async () => {
      try {
        const latest = await adminService.getRecentActivities({ limit: activitiesLimit, page: activitiesPage });
        setActivities(latest.items);
        setActivitiesPagination(latest.pagination);
      } catch (_e) {
        // silent fail for background refresh
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [activitiesPage, activitiesLimit]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsData, activitiesData] = await Promise.all([
        adminService.getStats(),
        adminService.getRecentActivities({ limit: activitiesLimit, page: activitiesPage }),
      ]);
      setStats(statsData);
      setActivities(activitiesData.items);
      setActivitiesPagination(activitiesData.pagination);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.overview.totalRevenue),
      icon: DollarSign,
      color: 'bg-green-500',
      change: `+${stats.growth.enrollmentsThisMonth} enrollments this month`,
    },
    {
      title: 'Total Users',
      value: stats.overview.totalUsers.toLocaleString(),
      icon: Users,
      color: 'bg-blue-500',
      change: `+${stats.growth.newUsersThisMonth} new this month`,
    },
    {
      title: 'Total Courses',
      value: stats.overview.totalCourses.toLocaleString(),
      icon: BookOpen,
      color: 'bg-purple-500',
      change: `+${stats.growth.newCoursesThisMonth} new this month`,
    },
    {
      title: 'Total Enrollments',
      value: stats.overview.totalEnrollments.toLocaleString(),
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: `${stats.overview.publishedCourses} published courses`,
    },
  ];

  const alertCards = [
    {
      title: 'Pending Verifications',
      count: stats.overview.pendingVerifications,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      link: '/admin/verification-teachers',
    },
    {
      title: 'Open Reports',
      count: stats.overview.openReports,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      link: '/admin/reports',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registered':
        return '👤';
      case 'course_created':
        return '📚';
      case 'enrollment_created':
        return '🎓';
      case 'report_submitted':
        return '⚠️';
      case 'payment_completed':
        return '💳';
      default:
        return '📌';
    }
  };

  const getActivityMessage = (activity: {
    type: string;
    description: string;
    user?: { firstName: string; lastName: string };
  }) => {
    return activity.description;
  };

  // Helper function to calculate percentage safely
  const calculatePercentage = (numerator: number, denominator: number): number => {
    if (denominator === 0) return 0;
    return Math.round((numerator / denominator) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      
      {/* Decorative Elements */}
      <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 left-[5%] w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/25 ring-4 ring-white">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Admin <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Dashboard</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">Platform overview and management</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {statCards.map((stat, index) => (
            <div key={index} className="group bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-100/60 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gray-100/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center justify-between mb-4 relative">
                <div className={`${stat.color} p-3 rounded-xl text-white group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-3xl font-bold mb-2 text-gray-900">{stat.value}</h3>
              <p className="text-gray-500 text-xs mb-3 font-semibold uppercase tracking-wider">{stat.title}</p>
              <p className="text-xs text-gray-600 bg-gray-50/80 px-3 py-1.5 rounded-lg inline-block font-medium">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* Alert Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {alertCards.map((alert, index) => (
            <Link
              key={index}
              to={alert.link}
              className={`${alert.bgColor} rounded-2xl p-6 border-2 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center justify-between relative">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-3 rounded-xl ${alert.bgColor} border border-current/10`}>
                      <alert.icon className={`w-6 h-6 ${alert.color}`} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{alert.title}</h3>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">{alert.count}</p>
                </div>
                <CheckCircle className={`w-16 h-16 ${alert.color} opacity-10 group-hover:opacity-25 transition-opacity`} />
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <Link
            to="/admin/users"
            className="card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="p-3 bg-blue-200 rounded-lg w-fit mb-4 group-hover:bg-blue-300 transition-colors">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-900">Manage Users</h3>
            <p className="text-sm text-gray-700">
              View and manage all platform users
            </p>
          </Link>

          <Link
            to="/admin/courses"
            className="card bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="p-3 bg-purple-200 rounded-lg w-fit mb-4 group-hover:bg-purple-300 transition-colors">
              <BookOpen className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-900">Manage Courses</h3>
            <p className="text-sm text-gray-700">
              Review and approve courses
            </p>
          </Link>

          <Link
            to="/admin/financials"
            className="card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="p-3 bg-green-200 rounded-lg w-fit mb-4 group-hover:bg-green-300 transition-colors">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-900">Financials</h3>
            <p className="text-sm text-gray-700">
              View revenue and transactions
            </p>
          </Link>

          <Link
            to="/admin/refunds"
            className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="p-3 bg-yellow-200 rounded-lg w-fit mb-4 group-hover:bg-yellow-300 transition-colors">
              <DollarSign className="w-8 h-8 text-yellow-700" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-900">Refunds</h3>
            <p className="text-sm text-gray-700">Review and process refunds</p>
          </Link>

          <Link
            to="/admin/support"
            className="card bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="p-3 bg-indigo-200 rounded-lg w-fit mb-4 group-hover:bg-indigo-300 transition-colors">
              <Activity className="w-8 h-8 text-indigo-700" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-900">Support</h3>
            <p className="text-sm text-gray-700">Manage support tickets</p>
          </Link>
        </div>

        {/* Recent Activities */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary-100 rounded-lg">
                <Activity className="w-6 h-6 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Recent Activities</h2>
            </div>
            {/* Page size selector */}
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="activities-per-page" className="text-gray-600">Per page:</label>
              <select
                id="activities-per-page"
                title="Items per page"
                value={activitiesLimit}
                onChange={(e) => {
                  setActivitiesPage(1);
                  setActivitiesLimit(parseInt(e.target.value));
                }}
                className="px-2 py-1 border border-gray-300 rounded-lg"
              >
                {[10, 20, 30, 40, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>

          {activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all duration-300 border border-gray-200"
                >
                  <span className="text-3xl flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {getActivityMessage(activity)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-lg">No recent activities</p>
            </div>
          )}

          {/* Pagination controls */}
          {activitiesPagination && activitiesPagination.totalPages > 1 && (
            <div className="mt-6 pt-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {activitiesPagination.page} of {activitiesPagination.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn-outline btn-sm"
                  disabled={activitiesPagination.page <= 1}
                  onClick={() => setActivitiesPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  className="btn-primary btn-sm"
                  disabled={activitiesPagination.page >= activitiesPagination.totalPages}
                  onClick={() => setActivitiesPage((p) => Math.min(activitiesPagination.totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      {/* User Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-primary-700 uppercase tracking-wide">Teachers</h3>
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <p className="text-4xl font-bold text-primary-600 mb-2">
            {stats.overview.totalTeachers}
          </p>
          <ProgressBar
            percentage={calculatePercentage(stats.overview.totalTeachers, stats.overview.totalUsers)}
            containerClassName="w-full bg-primary-200 rounded-full h-2 overflow-hidden"
            barClassName="bg-gradient-to-r from-primary-600 to-primary-700 h-2 rounded-full transition-all duration-500"
          />
          <p className="text-sm text-primary-700 mt-3 font-medium">
            {calculatePercentage(stats.overview.totalTeachers, stats.overview.totalUsers)}% of users
          </p>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-green-700 uppercase tracking-wide">Students</h3>
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-4xl font-bold text-green-600 mb-2">
            {stats.overview.totalStudents}
          </p>
          <ProgressBar
            percentage={calculatePercentage(stats.overview.totalStudents, stats.overview.totalUsers)}
            containerClassName="w-full bg-green-200 rounded-full h-2 overflow-hidden"
            barClassName="bg-gradient-to-r from-green-600 to-green-700 h-2 rounded-full transition-all duration-500"
          />
          <p className="text-sm text-green-700 mt-3 font-medium">
            {calculatePercentage(stats.overview.totalStudents, stats.overview.totalUsers)}% of users
          </p>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wide">Published Courses</h3>
            <BookOpen className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-4xl font-bold text-purple-600 mb-2">
            {stats.overview.publishedCourses}
          </p>
          <ProgressBar
            percentage={calculatePercentage(stats.overview.publishedCourses, stats.overview.totalCourses)}
            containerClassName="w-full bg-purple-200 rounded-full h-2 overflow-hidden"
            barClassName="bg-gradient-to-r from-purple-600 to-purple-700 h-2 rounded-full transition-all duration-500"
          />
          <p className="text-sm text-purple-700 mt-3 font-medium">
            {calculatePercentage(stats.overview.publishedCourses, stats.overview.totalCourses)}% of total
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

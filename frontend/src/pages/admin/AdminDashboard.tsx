import { useEffect, useState } from 'react';
import clientLogger from '@/utils/logger';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Megaphone,
} from 'lucide-react';
import adminService, { PlatformStats } from '@/services/admin.service';
import { extractErrorMessage } from '@/utils/error-handler';
import { formatCurrency } from '@/utils/helpers';
import { usePageTitle } from '@/hooks';

interface ProgressBarProps {
  percentage: number;
  containerClassName: string;
  barClassName: string;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

const ProgressBar = ({ percentage, containerClassName, barClassName }: ProgressBarProps) => (
  <div className={containerClassName}>
    <div
      className={barClassName}
      style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
    />
  </div>
);

/**
 * Admin Dashboard
 * Overview of platform statistics and recent activities
 */
const AdminDashboard = () => {
  usePageTitle('Admin Dashboard');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [activitiesLimit, setActivitiesLimit] = useState(10);
  const [activitiesPagination, setActivitiesPagination] = useState<{ total: number; page: number; limit: number; totalPages: number; hasMore: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dashboardRequestKey, setDashboardRequestKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    const loadDashboardData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [statsData, activitiesData] = await Promise.all([
          adminService.getStats(),
          adminService.getRecentActivities({ limit: activitiesLimit, page: activitiesPage }),
        ]);

        if (!isActive) {
          return;
        }

        setStats(statsData);
        setActivities(activitiesData.items);
        setActivitiesPagination(activitiesData.pagination);
      } catch (error) {
        if (isActive) {
          clientLogger.error('Failed to fetch dashboard data:', error);
          const errorMessage = extractErrorMessage(error, 'Failed to load dashboard data');
          setLoadError(errorMessage);
          toast.error(errorMessage);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboardData();

    return () => {
      isActive = false;
    };
  }, [activitiesPage, activitiesLimit, dashboardRequestKey]);

  useEffect(() => {
    if (!stats) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const latest = await adminService.getRecentActivities({ limit: activitiesLimit, page: activitiesPage });
        setActivities(latest.items);
        setActivitiesPagination(latest.pagination);
      } catch (error) {
        clientLogger.warn('Background activity refresh failed:', error);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [activitiesPage, activitiesLimit, stats]);

  if (isLoading) {
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

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 px-4">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-card border border-gray-100/60 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-danger-50 text-danger-600 flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to load dashboard</h2>
          <p className="text-gray-600 mb-6">{loadError ?? 'Failed to load dashboard data'}</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setDashboardRequestKey((currentKey) => currentKey + 1)}
          >
            Retry
          </button>
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
        return { Icon: Users, iconClassName: 'text-blue-600', containerClassName: 'bg-blue-100' };
      case 'course_created':
        return { Icon: BookOpen, iconClassName: 'text-purple-600', containerClassName: 'bg-purple-100' };
      case 'enrollment_created':
        return { Icon: TrendingUp, iconClassName: 'text-green-600', containerClassName: 'bg-green-100' };
      case 'report_submitted':
        return { Icon: AlertCircle, iconClassName: 'text-red-600', containerClassName: 'bg-red-100' };
      case 'payment_completed':
        return { Icon: DollarSign, iconClassName: 'text-emerald-600', containerClassName: 'bg-emerald-100' };
      default:
        return { Icon: Activity, iconClassName: 'text-gray-600', containerClassName: 'bg-gray-100' };
    }
  };

  const calculatePercentage = (numerator: number, denominator: number): number => {
    if (denominator === 0) return 0;
    return Math.round((numerator / denominator) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 left-[5%] w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/25 ring-4 ring-white">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                Admin <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Dashboard</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">Platform overview and management</p>
            </div>
          </div>
        </div>

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
              <p className="text-gray-500 text-xs mb-3 font-semibold uppercase">{stat.title}</p>
              <p className="text-xs text-gray-600 bg-gray-50/80 px-3 py-1.5 rounded-lg inline-block font-medium">{stat.change}</p>
            </div>
          ))}
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {[
            { to: '/admin/users', title: 'Manage Users', desc: 'View and manage all platform users', Icon: Users, card: 'from-blue-50 to-blue-100 border-blue-200', badge: 'bg-blue-200 group-hover:bg-blue-300', icon: 'text-blue-600' },
            { to: '/admin/courses', title: 'Manage Courses', desc: 'Review and approve courses', Icon: BookOpen, card: 'from-purple-50 to-purple-100 border-purple-200', badge: 'bg-purple-200 group-hover:bg-purple-300', icon: 'text-purple-600' },
            { to: '/admin/ads', title: 'Ads', desc: 'Manage login popup campaigns', Icon: Megaphone, card: 'from-violet-50 to-fuchsia-100 border-violet-200', badge: 'bg-violet-200 group-hover:bg-violet-300', icon: 'text-violet-700' },
            { to: '/admin/financials', title: 'Financials', desc: 'View revenue and transactions', Icon: DollarSign, card: 'from-green-50 to-green-100 border-green-200', badge: 'bg-green-200 group-hover:bg-green-300', icon: 'text-green-600' },
            { to: '/admin/refunds', title: 'Refunds', desc: 'Review and process refunds', Icon: DollarSign, card: 'from-yellow-50 to-yellow-100 border-yellow-200', badge: 'bg-yellow-200 group-hover:bg-yellow-300', icon: 'text-yellow-700' },
            { to: '/admin/support', title: 'Support', desc: 'Manage support tickets', Icon: Activity, card: 'from-indigo-50 to-indigo-100 border-indigo-200', badge: 'bg-indigo-200 group-hover:bg-indigo-300', icon: 'text-indigo-700' },
          ].map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className={`card bg-gradient-to-br ${action.card} border-2 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}
            >
              <div className={`p-3 ${action.badge} rounded-lg w-fit mb-4 transition-colors`}>
                <action.Icon className={`w-8 h-8 ${action.icon}`} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">{action.title}</h3>
              <p className="text-sm text-gray-700">{action.desc}</p>
            </Link>
          ))}
        </div>

        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary-100 rounded-lg">
                <Activity className="w-6 h-6 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Recent Activities</h2>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="activities-per-page" className="text-gray-600">Per page:</label>
              <select
                id="activities-per-page"
                title="Items per page"
                value={activitiesLimit}
                onChange={(e) => {
                  setActivitiesPage(1);
                  setActivitiesLimit(Number.parseInt(e.target.value, 10));
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
              {activities.map((activity) => {
                const { Icon, iconClassName, containerClassName } = getActivityIcon(activity.type);

                return (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all duration-300 border border-gray-200"
                  >
                    <div className={`p-3 rounded-xl flex-shrink-0 ${containerClassName}`}>
                      <Icon className={`w-5 h-5 ${iconClassName}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-lg">No recent activities</p>
            </div>
          )}

          {activitiesPagination && activitiesPagination.totalPages > 1 && (
            <div className="mt-6 pt-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {activitiesPagination.page} of {activitiesPagination.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-outline btn-sm"
                  disabled={activitiesPagination.page <= 1}
                  onClick={() => setActivitiesPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              label: 'Teachers',
              count: stats.overview.totalTeachers,
              pct: calculatePercentage(stats.overview.totalTeachers, stats.overview.totalUsers),
              suffix: 'of users',
              Icon: Users,
              card: 'from-primary-50 to-primary-100 border-primary-200',
              text: 'text-primary-700',
              value: 'text-primary-600',
              track: 'bg-primary-200',
              bar: 'from-primary-600 to-primary-700',
            },
            {
              label: 'Students',
              count: stats.overview.totalStudents,
              pct: calculatePercentage(stats.overview.totalStudents, stats.overview.totalUsers),
              suffix: 'of users',
              Icon: Users,
              card: 'from-green-50 to-green-100 border-green-200',
              text: 'text-green-700',
              value: 'text-green-600',
              track: 'bg-green-200',
              bar: 'from-green-600 to-green-700',
            },
            {
              label: 'Published Courses',
              count: stats.overview.publishedCourses,
              pct: calculatePercentage(stats.overview.publishedCourses, stats.overview.totalCourses),
              suffix: 'of total',
              Icon: BookOpen,
              card: 'from-purple-50 to-purple-100 border-purple-200',
              text: 'text-purple-700',
              value: 'text-purple-600',
              track: 'bg-purple-200',
              bar: 'from-purple-600 to-purple-700',
            },
          ].map((dist) => (
            <div key={dist.label} className={`card bg-gradient-to-br ${dist.card}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-bold ${dist.text} uppercase`}>{dist.label}</h3>
                <dist.Icon className={`w-5 h-5 ${dist.value}`} />
              </div>
              <p className={`text-4xl font-bold ${dist.value} mb-2`}>{dist.count}</p>
              <ProgressBar
                percentage={dist.pct}
                containerClassName={`w-full ${dist.track} rounded-full h-2 overflow-hidden`}
                barClassName={`bg-gradient-to-r ${dist.bar} h-2 rounded-full transition-all duration-500`}
              />
              <p className={`text-sm ${dist.text} mt-3 font-medium`}>
                {dist.pct}% {dist.suffix}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

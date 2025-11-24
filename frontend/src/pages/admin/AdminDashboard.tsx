import { useEffect, useState } from 'react';
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

/**
 * Admin Dashboard
 * Overview of platform statistics and recent activities
 */
const AdminDashboard = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activities, setActivities] = useState<Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
    timestamp?: string;
    data?: Record<string, unknown>;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // lightweight polling for recent activities to keep the feed in sync
    const interval = setInterval(async () => {
      try {
        const latest = await adminService.getRecentActivities(30);
        setActivities(latest);
      } catch (e) {
        // silent fail for background refresh
      }
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsData, activitiesData] = await Promise.all([
        adminService.getStats(),
        adminService.getRecentActivities(30),
      ]);
      setStats(statsData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
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
      link: '/admin/verifications',
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
    data?: Record<string, unknown>;
  }) => {
    if (!activity.data) return 'Activity recorded';
    
    const data = activity.data;
    switch (activity.type) {
      case 'user_registered': {
        const firstName = (data.firstName as string) || '';
        const lastName = (data.lastName as string) || '';
        const role = (data.role as string) || '';
        return `${firstName} ${lastName} registered as ${role.toLowerCase()}`;
      }
      case 'course_created': {
        const title = (data.title as string) || '';
        const teacherProfile = data.teacherProfile as { user?: { firstName?: string } } | undefined;
        const teacherName = teacherProfile?.user?.firstName || 'Unknown';
        return `New course "${title}" created by ${teacherName}`;
      }
      case 'enrollment_created': {
        const user = data.user as { firstName?: string } | undefined;
        const pkg = data.package as { course?: { title?: string } } | undefined;
        const userName = user?.firstName || 'Someone';
        const courseTitle = pkg?.course?.title || 'a course';
        return `${userName} enrolled in "${courseTitle}"`;
      }
      case 'report_submitted': {
        const type = (data.type as string) || '';
        return `New ${type.replace('_', ' ').toLowerCase()} report submitted`;
      }
      case 'payment_completed': {
        const user = data.user as { firstName?: string; lastName?: string } | undefined;
        const pkg = data.package as { course?: { title?: string } } | undefined;
        const buyer = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Someone';
        const courseTitle = pkg?.course?.title || 'a course';
        const amount = typeof data.amount === 'number' ? formatCurrency(data.amount) : '';
        return `${buyer} purchased "${courseTitle}"${amount ? ` for ${amount}` : ''}`;
      }
      default:
        return 'Activity recorded';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
        <div className="mb-12">
          <h1 className="section-title">Admin Dashboard</h1>
          <p className="section-subtitle">Platform overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
            <div key={index} className="card group hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-4 rounded-xl text-white group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
              <h3 className="text-3xl font-bold mb-2 text-gray-900">{stat.value}</h3>
              <p className="text-gray-600 text-sm mb-2 font-medium">{stat.title}</p>
              <p className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg inline-block">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {alertCards.map((alert, index) => (
          <Link
            key={index}
            to={alert.link}
            className={`card ${alert.bgColor} border-2 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-3 rounded-lg ${alert.bgColor}`}>
                  <alert.icon className={`w-6 h-6 ${alert.color}`} />
                  </div>
                  <h3 className="text-lg font-bold">{alert.title}</h3>
                </div>
                <p className="text-4xl font-bold text-gray-900">{alert.count}</p>
              </div>
              <CheckCircle className={`w-16 h-16 ${alert.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        </div>

        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start space-x-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-150 transition-all duration-300 border border-gray-200"
              >
                <span className="text-3xl flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {getActivityMessage(activity)}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(activity.timestamp || activity.createdAt).toLocaleString()}
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
          <div className="w-full bg-primary-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-primary-600 to-primary-700 h-2 rounded-full"
              style={{ width: `${Math.round((stats.overview.totalTeachers / stats.overview.totalUsers) * 100)}%` }}
            ></div>
          </div>
          <p className="text-sm text-primary-700 mt-3 font-medium">
            {Math.round((stats.overview.totalTeachers / stats.overview.totalUsers) * 100)}% of users
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
          <div className="w-full bg-green-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-600 to-green-700 h-2 rounded-full"
              style={{ width: `${Math.round((stats.overview.totalStudents / stats.overview.totalUsers) * 100)}%` }}
            ></div>
          </div>
          <p className="text-sm text-green-700 mt-3 font-medium">
            {Math.round((stats.overview.totalStudents / stats.overview.totalUsers) * 100)}% of users
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
          <div className="w-full bg-purple-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-600 to-purple-700 h-2 rounded-full"
              style={{ width: `${Math.round((stats.overview.publishedCourses / stats.overview.totalCourses) * 100)}%` }}
            ></div>
          </div>
          <p className="text-sm text-purple-700 mt-3 font-medium">
            {Math.round((stats.overview.publishedCourses / stats.overview.totalCourses) * 100)}% of total
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


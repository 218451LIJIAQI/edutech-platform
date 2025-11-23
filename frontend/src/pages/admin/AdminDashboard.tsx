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
  const [activities, setActivities] = useState<any[]>([]);
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="spinner"></div>
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

  const getActivityMessage = (activity: any) => {
    switch (activity.type) {
      case 'user_registered':
        return `${activity.data.firstName} ${activity.data.lastName} registered as ${activity.data.role.toLowerCase()}`;
      case 'course_created':
        return `New course "${activity.data.title}" created by ${activity.data.teacherProfile.user.firstName}`;
      case 'enrollment_created':
        return `${activity.data.user.firstName} enrolled in "${activity.data.package.course.title}"`;
      case 'report_submitted':
        return `New ${activity.data.type.replace('_', ' ').toLowerCase()} report submitted`;
      case 'payment_completed':
        return `${activity.data.user.firstName} purchased "${activity.data.package.course.title}" for ${formatCurrency(activity.data.amount)}`;
      default:
        return 'Activity recorded';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Platform overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-lg text-white`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
            <p className="text-gray-600 text-sm mb-2">{stat.title}</p>
            <p className="text-xs text-gray-500">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {alertCards.map((alert, index) => (
          <Link
            key={index}
            to={alert.link}
            className={`card ${alert.bgColor} border-2 hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <alert.icon className={`w-6 h-6 ${alert.color}`} />
                  <h3 className="text-lg font-semibold">{alert.title}</h3>
                </div>
                <p className="text-3xl font-bold">{alert.count}</p>
              </div>
              <CheckCircle className={`w-12 h-12 ${alert.color} opacity-20`} />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          to="/admin/users"
          className="card bg-blue-50 border-2 border-blue-200 hover:shadow-lg transition-shadow"
        >
          <Users className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="text-lg font-semibold mb-2">Manage Users</h3>
          <p className="text-sm text-gray-600">
            View and manage all platform users
          </p>
        </Link>

        <Link
          to="/admin/courses"
          className="card bg-purple-50 border-2 border-purple-200 hover:shadow-lg transition-shadow"
        >
          <BookOpen className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="text-lg font-semibold mb-2">Manage Courses</h3>
          <p className="text-sm text-gray-600">
            Review and approve courses
          </p>
        </Link>

        <Link
          to="/admin/financials"
          className="card bg-green-50 border-2 border-green-200 hover:shadow-lg transition-shadow"
        >
          <DollarSign className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="text-lg font-semibold mb-2">Financials</h3>
          <p className="text-sm text-gray-600">
            View revenue and transactions
          </p>
        </Link>
      </div>

      {/* Recent Activities */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Activity className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-bold">Recent Activities</h2>
          </div>
        </div>

        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-2xl flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {getActivityMessage(activity)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>No recent activities</p>
          </div>
        )}
      </div>

      {/* User Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Teachers</h3>
          <p className="text-3xl font-bold text-primary-600">
            {stats.overview.totalTeachers}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {Math.round((stats.overview.totalTeachers / stats.overview.totalUsers) * 100)}% of users
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Students</h3>
          <p className="text-3xl font-bold text-green-600">
            {stats.overview.totalStudents}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {Math.round((stats.overview.totalStudents / stats.overview.totalUsers) * 100)}% of users
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Published Courses</h3>
          <p className="text-3xl font-bold text-purple-600">
            {stats.overview.publishedCourses}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {Math.round((stats.overview.publishedCourses / stats.overview.totalCourses) * 100)}% of total
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


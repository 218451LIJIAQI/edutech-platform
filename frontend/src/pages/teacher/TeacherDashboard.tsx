import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Users, BookOpen, Star, TrendingUp, Award } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import paymentService from '@/services/payment.service';
import { formatCurrency } from '@/utils/helpers';
import { TeacherStats, PaymentWithDetails } from '@/types';

/**
 * Teacher Dashboard
 * Overview of teacher's performance, earnings, and courses
 */
const TeacherDashboard = () => {
  const [stats, setStats] = useState<TeacherStats>({
    totalCourses: 0,
    totalEnrollments: 0,
    totalRevenue: 0,
    averageRating: 0,
    totalStudents: 0,
    isVerified: false,
  });
  const [earnings, setEarnings] = useState<PaymentWithDetails[]>([]);
  const [courseEarnings, setCourseEarnings] = useState<Array<{
    courseId: string;
    courseTitle: string;
    totalEarnings: number;
    totalStudents: number;
    payments: PaymentWithDetails[];
  }>>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch teacher stats
      const statsData = await teacherService.getStats();
      setStats(statsData);

      // Fetch earnings grouped by course
      const earningsData = await paymentService.getTeacherEarningsByCourse();
      setTotalEarnings(earningsData.totalEarnings);
      setCourseEarnings(earningsData.courseEarnings);
      setEarnings(earningsData.recentPayments.slice(0, 5)); // Latest 5
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
        <div className="mb-12">
          <h1 className="section-title">Teacher Dashboard</h1>
          <p className="section-subtitle">Manage your courses and track your performance</p>
      </div>

      {/* Verification Alert */}
      {!stats.isVerified && (
          <div className="card bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-200 mb-8 hover:shadow-lg transition-all">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-yellow-200 rounded-lg flex-shrink-0">
                <Award className="w-6 h-6 text-yellow-700" />
              </div>
            <div className="flex-1">
                <h3 className="font-bold text-yellow-900 mb-2 text-lg">
                Verification Pending
              </h3>
                <p className="text-sm text-yellow-800 mb-4">
                Complete your verification to gain student trust and increase visibility
              </p>
                <Link to="/teacher/verification" className="btn-primary btn-sm">
                Submit Verification
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
          <div className="card bg-gradient-to-br from-green-500 via-green-600 to-green-700 text-white shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <p className="text-green-100 text-sm font-medium mb-2">Total Earnings</p>
            <span className="text-4xl font-bold">
              {formatCurrency(totalEarnings || stats.totalRevenue)}
            </span>
        </div>

        {/* Total Students */}
          <div className="card bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                <Users className="w-6 h-6" />
              </div>
          </div>
            <p className="text-blue-100 text-sm font-medium mb-2">Total Students</p>
            <span className="text-4xl font-bold">{stats.totalStudents}</span>
        </div>

        {/* Total Courses */}
          <div className="card bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                <BookOpen className="w-6 h-6" />
              </div>
          </div>
            <p className="text-purple-100 text-sm font-medium mb-2">Active Courses</p>
            <span className="text-4xl font-bold">{stats.totalCourses}</span>
        </div>

        {/* Average Rating */}
          <div className="card bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                <Star className="w-6 h-6" />
              </div>
            </div>
            <p className="text-orange-100 text-sm font-medium mb-2">Average Rating</p>
            <span className="text-4xl font-bold">
              {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Earnings by Course */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Earnings by Course</h2>
              <Link to="/teacher/earnings" className="text-primary-600 hover:text-primary-700 font-semibold text-sm">
                View All →
              </Link>
            </div>

            {courseEarnings.length > 0 ? (
              <div className="space-y-4">
                {/* Course Earnings Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Earnings</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{formatCurrency(totalEarnings)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Active Courses</p>
                    <p className="text-3xl font-bold text-purple-900 mt-2">{courseEarnings.length}</p>
                  </div>
                </div>

                {/* Course Breakdown */}
                <div className="space-y-3 border-t pt-4">
                  {courseEarnings.map((course) => (
                    <div
                      key={course.courseId}
                      className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-150 transition-all duration-300 border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{course.courseTitle}</p>
                          <p className="text-sm text-gray-600">{course.totalStudents} student{course.totalStudents !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(course.totalEarnings)}
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-2.5">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 h-2.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${(course.totalEarnings / totalEarnings) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-600">
                <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-lg">No earnings yet</p>
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          {earnings.length > 0 && (
            <div className="card mt-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Recent Transactions</h2>
              </div>
              <div className="space-y-3">
                {earnings.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-150 transition-all duration-300 border border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">
                        {payment.package?.course?.title || 'Course Purchase'}
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                        <span>{payment.user?.firstName} {payment.user?.lastName}</span>
                        <span>•</span>
                        <span>{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        +{formatCurrency(payment.teacherEarning)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        (from {formatCurrency(payment.amount)})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link to="/teacher/courses" className="btn-primary w-full justify-center">
                <BookOpen className="w-4 h-4 mr-2" />
                Manage Courses
              </Link>
              <Link to="/teacher/courses/new" className="btn-outline w-full justify-center">
                Create New Course
              </Link>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Enrollments</span>
                <span className="font-bold text-gray-900 text-lg">{stats.totalEnrollments}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Rating</span>
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-gray-900 text-lg">
                    {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Status</span>
                {stats.isVerified ? (
                  <span className="badge-success">✓ Verified</span>
                ) : (
                  <span className="badge-warning">⏳ Pending</span>
                )}
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-200 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-700" />
              </div>
              <h3 className="font-bold text-lg text-gray-900">Growth Tips</h3>
            </div>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start space-x-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Keep course content updated</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Respond to student queries</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Create preview content</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Maintain high ratings</span>
              </li>
            </ul>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;

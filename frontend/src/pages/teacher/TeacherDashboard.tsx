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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Teacher Dashboard</h1>
        <p className="text-gray-600">Manage your courses and track your performance</p>
      </div>

      {/* Verification Alert */}
      {!stats.isVerified && (
        <div className="card bg-yellow-50 border-yellow-200 mb-6">
          <div className="flex items-start space-x-3">
            <Award className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">
                Verification Pending
              </h3>
              <p className="text-sm text-yellow-800 mb-3">
                Complete your verification to gain student trust and increase visibility
              </p>
              <Link to="/teacher/verification" className="btn-sm bg-yellow-600 text-white hover:bg-yellow-700">
                Submit Verification
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8" />
            <span className="text-3xl font-bold">
              {formatCurrency(totalEarnings || stats.totalRevenue)}
            </span>
          </div>
          <p className="text-green-100">Total Earnings</p>
        </div>

        {/* Total Students */}
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8" />
            <span className="text-3xl font-bold">{stats.totalStudents}</span>
          </div>
          <p className="text-blue-100">Total Students</p>
        </div>

        {/* Total Courses */}
        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="w-8 h-8" />
            <span className="text-3xl font-bold">{stats.totalCourses}</span>
          </div>
          <p className="text-purple-100">Active Courses</p>
        </div>

        {/* Average Rating */}
        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-8 h-8" />
            <span className="text-3xl font-bold">
              {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
            </span>
          </div>
          <p className="text-orange-100">Average Rating</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Earnings by Course */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Earnings by Course</h2>
              <Link to="/teacher/earnings" className="text-primary-600 hover:underline text-sm">
                View All
              </Link>
            </div>

            {courseEarnings.length > 0 ? (
              <div className="space-y-4">
                {/* Course Earnings Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-600">Total Earnings</p>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalEarnings)}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-sm text-purple-600">Active Courses</p>
                    <p className="text-2xl font-bold text-purple-900">{courseEarnings.length}</p>
                  </div>
                </div>

                {/* Course Breakdown */}
                <div className="space-y-3 border-t pt-4">
                  {courseEarnings.map((course) => (
                    <div
                      key={course.courseId}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{course.courseTitle}</p>
                          <p className="text-sm text-gray-600">{course.totalStudents} student{course.totalStudents !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(course.totalEarnings)}
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
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
              <div className="text-center py-8 text-gray-600">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No earnings yet</p>
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          {earnings.length > 0 && (
            <div className="card mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Recent Transactions</h2>
              </div>
              <div className="space-y-3">
                {earnings.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {payment.package?.course?.title || 'Course Purchase'}
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{payment.user?.firstName} {payment.user?.lastName}</span>
                        <span>•</span>
                        <span>{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        +{formatCurrency(payment.teacherEarning)}
                      </p>
                      <p className="text-xs text-gray-600">
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
          <div className="card bg-primary-50 border-primary-200">
            <h3 className="font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/teacher/courses" className="btn-primary w-full">
                <BookOpen className="w-4 h-4 mr-2" />
                Manage Courses
              </Link>
              <Link to="/teacher/courses/new" className="btn-outline w-full">
                Create New Course
              </Link>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">Performance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Enrollments</span>
                <span className="font-semibold">{stats.totalEnrollments}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Rating</span>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">
                    {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                {stats.isVerified ? (
                  <span className="badge-success">Verified</span>
                ) : (
                  <span className="badge-warning">Pending</span>
                )}
              </div>
            </div>
          </div>

          <div className="card bg-green-50 border-green-200">
            <div className="flex items-center space-x-3 mb-3">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <h3 className="font-semibold">Growth Tips</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✓ Keep course content updated</li>
              <li>✓ Respond to student queries</li>
              <li>✓ Create preview content</li>
              <li>✓ Maintain high ratings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;

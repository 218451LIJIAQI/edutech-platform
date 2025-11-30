import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Users, BookOpen, Star, TrendingUp, Award, ArrowRight, Plus, Sparkles, CheckCircle, Clock } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import paymentService from '@/services/payment.service';
import { formatCurrency } from '@/utils/helpers';
import { TeacherStats, PaymentWithDetails } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { usePageTitle } from '@/hooks';

/**
 * Teacher Dashboard
 * Overview of teacher's performance, earnings, and courses
 */
const TeacherDashboard = () => {
  usePageTitle('Teaching Dashboard');
  const { user } = useAuthStore();
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

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch teacher stats
      const statsData = await teacherService.getStats();
      setStats(statsData);

      // Fetch earnings grouped by course
      const earningsData = await paymentService.getTeacherEarningsByCourse();
      setTotalEarnings(earningsData.totalEarnings || 0);
      setCourseEarnings(earningsData.courseEarnings || []);
      setEarnings((earningsData.recentPayments || []).slice(0, 5)); // Latest 5
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

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
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Welcome, <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">{user?.firstName || 'Teacher'}!</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">Manage your courses, students, and earnings</p>
            </div>
          </div>
        </div>


        {/* Verification Alert */}
        {!stats.isVerified && (
          <div className="bg-gradient-to-r from-warning-50 via-amber-50 to-yellow-50 rounded-2xl p-6 mb-8 border border-warning-200/60 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-warning-400/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="flex items-start gap-4 relative">
              <div className="p-3 bg-warning-100 rounded-xl flex-shrink-0">
                <Award className="w-6 h-6 text-warning-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-warning-900 mb-2 text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Verification Pending
                </h3>
                <p className="text-sm text-warning-700 mb-4">Complete verification to gain student trust and increase visibility</p>
                <Link to="/teacher/verification" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-warning-500 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-warning-500/25 hover:shadow-xl transition-all duration-300">
                  <Sparkles className="w-4 h-4" />
                  Submit Verification
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {/* Total Revenue */}
          <div className="group bg-gradient-to-br from-success-500 via-success-600 to-green-700 rounded-2xl p-6 text-white shadow-xl shadow-success-500/20 hover:shadow-2xl hover:shadow-success-500/30 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                  <DollarSign className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">Revenue</span>
              </div>
              <p className="text-white/80 text-xs font-semibold mb-2 uppercase tracking-wider">Total Earnings</p>
              <span className="text-3xl font-bold">
                {formatCurrency(totalEarnings || stats.totalRevenue)}
              </span>
            </div>
          </div>

          {/* Total Students */}
          <div className="group bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-primary-500/20 hover:shadow-2xl hover:shadow-primary-500/30 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">Students</span>
              </div>
              <p className="text-white/80 text-xs font-semibold mb-2 uppercase tracking-wider">Total Students</p>
              <span className="text-3xl font-bold">{stats.totalStudents}</span>
            </div>
          </div>

          {/* Total Courses */}
          <div className="group bg-gradient-to-br from-accent-500 via-purple-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl shadow-accent-500/20 hover:shadow-2xl hover:shadow-accent-500/30 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">Courses</span>
              </div>
              <p className="text-white/80 text-xs font-semibold mb-2 uppercase tracking-wider">Active Courses</p>
              <span className="text-3xl font-bold">{stats.totalCourses}</span>
            </div>
          </div>

          {/* Average Rating */}
          <div className="group bg-gradient-to-br from-warning-500 via-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-warning-500/20 hover:shadow-2xl hover:shadow-warning-500/30 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                  <Star className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">Rating</span>
              </div>
              <p className="text-white/80 text-xs font-semibold mb-2 uppercase tracking-wider">Average Rating</p>
              <span className="text-3xl font-bold">
                {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
              </span>
            </div>
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
                      className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all duration-300 border border-gray-200"
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
                            width: `${totalEarnings > 0 ? (course.totalEarnings / totalEarnings) * 100 : 0}%`,
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
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all duration-300 border border-gray-200"
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
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-primary-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <h3 className="font-bold text-lg mb-4 relative">Quick Actions</h3>
            <div className="space-y-3 relative">
              <Link to="/teacher/courses" className="flex items-center justify-center gap-2 w-full py-3 bg-white text-primary-600 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <BookOpen className="w-4 h-4" />
                Manage Courses
              </Link>
              <Link to="/teacher/courses/new" className="flex items-center justify-center gap-2 w-full py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-all duration-300 border border-white/30">
                <Plus className="w-4 h-4" />
                Create New Course
              </Link>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-card border border-gray-100/60">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Performance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl">
                <span className="text-sm font-medium text-gray-600">Enrollments</span>
                <span className="font-bold text-gray-900">{stats.totalEnrollments}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl">
                <span className="text-sm font-medium text-gray-600">Rating</span>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-warning-400 text-warning-400" />
                  <span className="font-bold text-gray-900">
                    {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl">
                <span className="text-sm font-medium text-gray-600">Status</span>
                {stats.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success-700 bg-success-100 px-2.5 py-1 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning-700 bg-warning-100 px-2.5 py-1 rounded-full">
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-secondary-50 to-green-50 rounded-2xl p-6 border border-secondary-200/60 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-secondary-100 rounded-xl">
                <TrendingUp className="w-5 h-5 text-secondary-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900">Growth Tips</h3>
            </div>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-secondary-500 flex-shrink-0 mt-0.5" />
                <span>Keep course content updated</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-secondary-500 flex-shrink-0 mt-0.5" />
                <span>Respond to student queries</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-secondary-500 flex-shrink-0 mt-0.5" />
                <span>Create preview content</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-secondary-500 flex-shrink-0 mt-0.5" />
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

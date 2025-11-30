import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Award, TrendingUp, ArrowRight, PlayCircle, Sparkles, Target, GraduationCap } from 'lucide-react';
import { Enrollment } from '@/types';
import enrollmentService from '@/services/enrollment.service';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { usePageTitle, useSmoothLoading } from '@/hooks';
import { StatsSkeleton } from '@/components/common';

/**
 * Student Dashboard
 * Overview of student's learning progress and enrolled courses
 */
const StudentDashboard = () => {
  usePageTitle('My Learning Dashboard');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  
  // 丝滑加载过渡
  const { showSkeleton, contentClass } = useSmoothLoading(isLoading);

  const stats = useMemo(() => {
    const total = enrollments.length;
    const avgProgress =
      total > 0
        ? enrollments.reduce((sum: number, e: Enrollment) => sum + e.progress, 0) / total
        : 0;
    const completed = enrollments.filter((e: Enrollment) => e.progress === 100).length;
    
    // Calculate estimated hours based on completed lessons
    const estimatedHours = enrollments.reduce((sum: number, e: Enrollment) => {
      // Estimate 1 hour per completed lesson
      return sum + e.completedLessons;
    }, 0);

    return {
      totalCourses: total,
      averageProgress: Math.round(avgProgress),
      completedCourses: completed,
      hoursLearned: estimatedHours,
    };
  }, [enrollments]);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const enrollmentsData = await enrollmentService.getMyCourses();
      setEnrollments(enrollmentsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      console.error('Failed to fetch dashboard data:', err);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // 骨架屏 - 柔和呼吸效果
  const renderSkeleton = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Loading Header */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gray-200/60 rounded-2xl skeleton-breathe"></div>
          <div className="space-y-3">
            <div className="h-8 w-64 bg-gray-200/60 rounded-lg skeleton-breathe"></div>
            <div className="h-4 w-40 bg-gray-200/60 rounded skeleton-breathe"></div>
          </div>
        </div>
      </div>
      
      {/* Loading Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-breathe">
            <StatsSkeleton />
          </div>
        ))}
      </div>
      
      {/* Loading Content */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200/60 rounded-2xl skeleton-breathe"></div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      
      {/* Decorative Elements */}
      <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 left-[5%] w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* 骨架屏或内容 - 丝滑过渡 */}
      {showSkeleton ? renderSkeleton() : (
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative ${contentClass}`}>
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/25 ring-4 ring-white">
              <span className="text-2xl">👋</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Welcome back, <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">{user?.firstName || 'Learner'}!</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">Continue your learning journey</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {/* Total Courses */}
          <div className="group bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-100/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary-500/10 to-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="flex items-center justify-between relative">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Courses</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">{stats.totalCourses}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100/80">
              <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                <Target className="w-3 h-3" /> Enrolled
              </span>
            </div>
          </div>

          {/* Average Progress */}
          <div className="group bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-100/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-success-500/10 to-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="flex items-center justify-between relative">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Avg Progress</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">{stats.averageProgress}%</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-success-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-success-500 to-green-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${stats.averageProgress}%` }}></div>
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="group bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-100/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-warning-500/10 to-orange-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="flex items-center justify-between relative">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Completed</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">{stats.completedCourses}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-warning-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-warning-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100/80">
              <span className="text-xs font-semibold text-warning-600 bg-warning-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Achievements
              </span>
            </div>
          </div>

          {/* Hours Learned */}
          <div className="group bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-100/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-accent-500/10 to-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="flex items-center justify-between relative">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Hours Learned</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">{stats.hoursLearned}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-accent-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100/80">
              <span className="text-xs font-semibold text-accent-600 bg-accent-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                <PlayCircle className="w-3 h-3" /> Time invested
              </span>
            </div>
          </div>
        </div>

        {/* Continue Learning */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <PlayCircle className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Continue Learning</h2>
            </div>
            <Link to="/student/courses" className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1.5 group">
              <span>View All</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {enrollments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.slice(0, 3).map((enrollment) => {
                const course = enrollment.package?.course;
                if (!course) return null;

                return (
                  <Link
                    key={enrollment.id}
                    to={`/courses/${course.id}`}
                    className="group bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-100/60 flex flex-col"
                  >
                    {/* Course Info */}
                    <div className="mb-5">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">{course.title}</h3>
                        {enrollment.progress === 100 && (
                          <span className="flex-shrink-0 ml-2 w-6 h-6 bg-success-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {course.description}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-500 font-medium">Progress</span>
                        <span className="font-bold text-primary-600">
                          {enrollment.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary-500 to-indigo-600 h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${enrollment.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Lessons Completed */}
                    <div className="text-sm text-gray-500 font-medium mb-5 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary-500" />
                      {enrollment.completedLessons} lessons completed
                    </div>

                    {/* Continue Button */}
                    <button className="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 hover:from-primary-600 hover:to-primary-700 transition-all duration-300 mt-auto flex items-center justify-center gap-2 group/btn">
                      <PlayCircle className="w-5 h-5" />
                      Continue Learning
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-12 shadow-card border border-gray-100/60 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No courses yet</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Start your learning journey by exploring our courses and enrolling in one that interests you
              </p>
              <Link to="/courses" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:from-primary-600 hover:to-indigo-700 transition-all duration-300">
                <Sparkles className="w-5 h-5" />
                Browse Courses
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl p-8 shadow-xl shadow-primary-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Explore New Courses</h3>
              <p className="text-white/80 mb-6">
                Discover courses from expert teachers in various subjects
              </p>
              <Link to="/courses" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary-600 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                Browse Courses
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-secondary-500 to-green-600 rounded-2xl p-8 shadow-xl shadow-secondary-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
            <div className="relative">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Find Teachers</h3>
              <p className="text-white/80 mb-6">
                Connect with verified teachers and learn from the best
              </p>
              <Link to="/teachers" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-secondary-600 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                View Teachers
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default StudentDashboard;

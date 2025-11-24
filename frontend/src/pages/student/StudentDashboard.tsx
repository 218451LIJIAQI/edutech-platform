import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Award, TrendingUp, ArrowRight } from 'lucide-react';
import { Enrollment } from '@/types';
import enrollmentService from '@/services/enrollment.service';
import toast from 'react-hot-toast';

/**
 * Student Dashboard
 * Overview of student's learning progress and enrolled courses
 */
const StudentDashboard = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0,
    averageProgress: 0,
    completedCourses: 0,
    hoursLearned: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const enrollmentsData = await enrollmentService.getMyCourses();
      setEnrollments(enrollmentsData);

      // Calculate stats
      const total = enrollmentsData.length;
      const avgProgress =
        total > 0
          ? enrollmentsData.reduce((sum: number, e: Enrollment) => sum + e.progress, 0) / total
          : 0;
      const completed = enrollmentsData.filter((e: Enrollment) => e.progress === 100).length;

      setStats({
        totalCourses: total,
        averageProgress: Math.round(avgProgress),
        completedCourses: completed,
        hoursLearned: total * 10, // Estimated
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
        <div className="mb-12">
          <h1 className="section-title">My Learning Dashboard</h1>
          <p className="section-subtitle">Track your progress and continue learning</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Courses */}
          <div className="card bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                <BookOpen className="w-6 h-6" />
              </div>
          </div>
            <p className="text-blue-100 text-sm font-medium mb-2">Enrolled Courses</p>
            <span className="text-4xl font-bold">{stats.totalCourses}</span>
        </div>

        {/* Average Progress */}
          <div className="card bg-gradient-to-br from-green-500 via-green-600 to-green-700 text-white shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
          </div>
            <p className="text-green-100 text-sm font-medium mb-2">Average Progress</p>
            <span className="text-4xl font-bold">{stats.averageProgress}%</span>
        </div>

        {/* Completed */}
          <div className="card bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                <Award className="w-6 h-6" />
              </div>
          </div>
            <p className="text-purple-100 text-sm font-medium mb-2">Completed</p>
            <span className="text-4xl font-bold">{stats.completedCourses}</span>
        </div>

        {/* Hours Learned */}
          <div className="card bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                <Clock className="w-6 h-6" />
              </div>
          </div>
            <p className="text-orange-100 text-sm font-medium mb-2">Hours Learned</p>
            <span className="text-4xl font-bold">{stats.hoursLearned}</span>
        </div>
      </div>

      {/* Continue Learning */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Continue Learning</h2>
            <Link to="/student/courses" className="text-primary-600 hover:text-primary-700 font-semibold flex items-center space-x-1">
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
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
                  className="card-hover"
                >
                  {/* Course Info */}
                    <div className="mb-5">
                      <h3 className="font-bold text-lg text-gray-900 mb-2">{course.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {course.description}
                    </p>
                  </div>

                  {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 font-medium">Progress</span>
                        <span className="font-bold text-primary-600">
                        {enrollment.progress}%
                      </span>
                    </div>
                      <div className="w-full bg-gray-300 rounded-full h-3">
                      <div
                          className="bg-gradient-to-r from-primary-600 to-primary-700 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${enrollment.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Lessons Completed */}
                    <div className="text-sm text-gray-600 font-medium mb-4">
                      📚 {enrollment.completedLessons} lessons completed
                  </div>

                  {/* Continue Button */}
                    <button className="btn-primary w-full">
                    Continue Learning
                  </button>
                </Link>
              );
            })}
          </div>
        ) : (
            <div className="card text-center py-16 shadow-lg">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No courses yet</h3>
              <p className="text-gray-600 mb-6">
              Start your learning journey by enrolling in a course
            </p>
            <Link to="/courses" className="btn-primary inline-block">
              Browse Courses
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Explore New Courses</h3>
            <p className="text-gray-700 mb-6">
            Discover courses from expert teachers in various subjects
          </p>
          <Link to="/courses" className="btn-primary">
            Browse Courses
          </Link>
        </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Find Teachers</h3>
            <p className="text-gray-700 mb-6">
            Connect with verified teachers and learn from the best
          </p>
            <Link to="/teachers" className="btn-primary">
            View Teachers
          </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

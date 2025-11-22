import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Award, TrendingUp, ArrowRight } from 'lucide-react';
import { Enrollment } from '@/types';
import api from '@/services/api';

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
      const response = await api.get('/enrollments/my-courses');
      const enrollmentsData = response.data.data;
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
        <h1 className="text-3xl font-bold mb-2">My Learning Dashboard</h1>
        <p className="text-gray-600">Track your progress and continue learning</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Courses */}
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="w-8 h-8" />
            <span className="text-3xl font-bold">{stats.totalCourses}</span>
          </div>
          <p className="text-blue-100">Enrolled Courses</p>
        </div>

        {/* Average Progress */}
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8" />
            <span className="text-3xl font-bold">{stats.averageProgress}%</span>
          </div>
          <p className="text-green-100">Average Progress</p>
        </div>

        {/* Completed */}
        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8" />
            <span className="text-3xl font-bold">{stats.completedCourses}</span>
          </div>
          <p className="text-purple-100">Completed</p>
        </div>

        {/* Hours Learned */}
        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8" />
            <span className="text-3xl font-bold">{stats.hoursLearned}</span>
          </div>
          <p className="text-orange-100">Hours Learned</p>
        </div>
      </div>

      {/* Continue Learning */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Continue Learning</h2>
          <Link to="/student/courses" className="text-primary-600 hover:underline flex items-center space-x-1">
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
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg mb-2">{course.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {course.description}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold text-primary-600">
                        {enrollment.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${enrollment.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Lessons Completed */}
                  <div className="text-sm text-gray-600">
                    {enrollment.completedLessons} lessons completed
                  </div>

                  {/* Continue Button */}
                  <button className="btn-primary w-full mt-4">
                    Continue Learning
                  </button>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="card text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
            <p className="text-gray-600 mb-4">
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
        <div className="card bg-primary-50 border-primary-200">
          <h3 className="text-xl font-semibold mb-2">Explore New Courses</h3>
          <p className="text-gray-600 mb-4">
            Discover courses from expert teachers in various subjects
          </p>
          <Link to="/courses" className="btn-primary">
            Browse Courses
          </Link>
        </div>

        <div className="card bg-green-50 border-green-200">
          <h3 className="text-xl font-semibold mb-2">Find Teachers</h3>
          <p className="text-gray-600 mb-4">
            Connect with verified teachers and learn from the best
          </p>
          <Link to="/teachers" className="btn bg-green-600 text-white hover:bg-green-700">
            View Teachers
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

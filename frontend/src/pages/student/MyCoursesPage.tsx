import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Calendar, CheckCircle } from 'lucide-react';
import { Enrollment } from '@/types';
import { formatDate } from '@/utils/helpers';
import enrollmentService from '@/services/enrollment.service';
import toast from 'react-hot-toast';

/**
 * My Courses Page
 * Lists all enrolled courses with progress tracking
 */
const MyCoursesPage = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    setIsLoading(true);
    try {
      const enrollments = await enrollmentService.getMyCourses();
      setEnrollments(enrollments);
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEnrollments = enrollments.filter((enrollment) => {
    if (filter === 'all') return true;
    if (filter === 'active') return enrollment.progress < 100;
    if (filter === 'completed') return enrollment.progress === 100;
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <p className="text-gray-600 font-medium">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
        <div className="mb-10">
          <h1 className="section-title mb-4">My Courses</h1>
        
        {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
              filter === 'all'
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-700'
            }`}
          >
            All Courses ({enrollments.length})
          </button>
          <button
            onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
              filter === 'active'
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-700'
            }`}
          >
            In Progress ({enrollments.filter((e) => e.progress < 100).length})
          </button>
          <button
            onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
              filter === 'completed'
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-700'
            }`}
          >
            Completed ({enrollments.filter((e) => e.progress === 100).length})
          </button>
        </div>
      </div>

      {/* Courses List */}
      {filteredEnrollments.length > 0 ? (
        <div className="space-y-6">
          {filteredEnrollments.map((enrollment) => {
            const course = enrollment.package?.course;
            if (!course) return null;

            const teacher = course.teacherProfile;
            const isCompleted = enrollment.progress === 100;
            const isExpiring = enrollment.expiresAt && 
              new Date(enrollment.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            return (
              <div key={enrollment.id} className="card shadow-lg hover:shadow-xl transition-all">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Course Info */}
                  <div className="lg:col-span-2">
                    <div className="flex items-start space-x-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                        <BookOpen className="w-10 h-10 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {course.description}
                        </p>
                        
                        {/* Teacher */}
                        {teacher && (
                          <div className="flex items-center space-x-2 text-sm">
                            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                              {teacher.user?.firstName?.[0]}{teacher.user?.lastName?.[0]}
                            </div>
                            <span className="text-gray-700 font-medium">
                              {teacher.user?.firstName} {teacher.user?.lastName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="lg:col-span-1">
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 font-medium">Progress</span>
                        <span className="font-bold text-primary-600">
                          {enrollment.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${
                            isCompleted 
                              ? 'bg-gradient-to-r from-green-500 to-green-600' 
                              : 'bg-gradient-to-r from-primary-600 to-primary-700'
                          }`}
                          style={{ width: `${enrollment.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2 text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-medium">{enrollment.completedLessons} lessons completed</span>
                      </div>
                      
                      {enrollment.enrolledAt && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Enrolled {formatDate(enrollment.enrolledAt)}</span>
                        </div>
                      )}

                      {enrollment.expiresAt && (
                        <div className={`flex items-center space-x-2 ${isExpiring ? 'text-orange-600 font-semibold' : 'text-gray-600'}`}>
                          <Clock className="w-4 h-4" />
                          <span>
                            Expires {formatDate(enrollment.expiresAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="lg:col-span-1 flex flex-col justify-center space-y-3">
                    <Link
                      to={`/courses/${course.id}`}
                      className="btn-primary text-center"
                    >
                      {isCompleted ? 'Review Course' : 'Continue Learning'}
                    </Link>
                    
                    {isCompleted && (
                      <div className="flex items-center justify-center space-x-1 text-green-600 text-sm font-bold bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="w-4 h-4" />
                        <span>Completed</span>
                      </div>
                    )}
                    
                    {isExpiring && !isCompleted && (
                      <div className="text-center text-orange-600 text-sm font-bold bg-orange-50 px-3 py-2 rounded-lg">
                        ⚠️ Expiring Soon!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {filter === 'all'
              ? 'No courses yet'
              : filter === 'active'
              ? 'No active courses'
              : 'No completed courses'}
          </h3>
          <p className="text-gray-600 mb-4">
            {filter === 'all'
              ? 'Start your learning journey by enrolling in a course'
              : 'Start learning to track your progress here'}
          </p>
          <Link to="/courses" className="btn-primary inline-block">
            Browse Courses
          </Link>
        </div>
      )}
      </div>
    </div>
  );
};

export default MyCoursesPage;

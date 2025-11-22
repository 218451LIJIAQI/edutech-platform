import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Calendar, CheckCircle } from 'lucide-react';
import { Enrollment } from '@/types';
import { formatDate } from '@/utils/helpers';
import api from '@/services/api';

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
      const response = await api.get('/enrollments/my-courses');
      setEnrollments(response.data.data);
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
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
        <h1 className="text-3xl font-bold mb-4">My Courses</h1>
        
        {/* Filter Tabs */}
        <div className="flex space-x-2 border-b">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-medium transition ${
              filter === 'all'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Courses ({enrollments.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 font-medium transition ${
              filter === 'active'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            In Progress ({enrollments.filter((e) => e.progress < 100).length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 font-medium transition ${
              filter === 'completed'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
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
              <div key={enrollment.id} className="card">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Course Info */}
                  <div className="lg:col-span-2">
                    <div className="flex items-start space-x-4">
                      <div className="w-20 h-20 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-10 h-10 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {course.description}
                        </p>
                        
                        {/* Teacher */}
                        {teacher && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-semibold">
                              {teacher.user?.firstName?.[0]}{teacher.user?.lastName?.[0]}
                            </div>
                            <span>
                              {teacher.user?.firstName} {teacher.user?.lastName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="lg:col-span-1">
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-semibold text-primary-600">
                          {enrollment.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            isCompleted ? 'bg-green-600' : 'bg-primary-600'
                          }`}
                          style={{ width: `${enrollment.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>{enrollment.completedLessons} lessons completed</span>
                      </div>
                      
                      {enrollment.enrolledAt && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>Enrolled {formatDate(enrollment.enrolledAt)}</span>
                        </div>
                      )}

                      {enrollment.expiresAt && (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span className={isExpiring ? 'text-orange-600 font-medium' : ''}>
                            Expires {formatDate(enrollment.expiresAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="lg:col-span-1 flex flex-col justify-center space-y-2">
                    <Link
                      to={`/courses/${course.id}`}
                      className="btn-primary text-center"
                    >
                      {isCompleted ? 'Review Course' : 'Continue Learning'}
                    </Link>
                    
                    {isCompleted && (
                      <div className="flex items-center justify-center space-x-1 text-green-600 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        <span>Completed</span>
                      </div>
                    )}
                    
                    {isExpiring && !isCompleted && (
                      <div className="text-center text-orange-600 text-sm font-medium">
                        Expiring Soon!
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
  );
};

export default MyCoursesPage;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center"><span className="text-2xl">📖</span></div><div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div></div><p className="text-gray-600 font-medium">Loading your courses...</p>
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
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <span className="text-2xl">📖</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                My <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Courses</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">Track your learning progress</p>
            </div>
          </div>
        
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
            const isExpiring = enrollment.expiresAt 
              ? new Date(enrollment.expiresAt).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000
              : false;

            return (
              <div key={enrollment.id} className="card shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border border-gray-100 hover:border-primary-200 rounded-2xl">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Course Info */}
                  <div className="lg:col-span-2">
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-24 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <BookOpen className="w-12 h-12 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">{course.title}</h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>
                        
                        {/* Teacher */}
                        {teacher && (
                          <div className="flex items-center space-x-2 text-sm">
                            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                              {(teacher.user?.firstName?.[0] || 'T')}{(teacher.user?.lastName?.[0] || '')}
                            </div>
                            <span className="text-gray-700 font-medium">
                              {teacher.user?.firstName || ''} {teacher.user?.lastName || ''}
                              {!teacher.user?.firstName && !teacher.user?.lastName && 'Teacher'}
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
                  <div className="lg:col-span-1 flex flex-col justify-center gap-3">
                    <Link
                      to={`/courses/${course.id}/learn`}
                      className="btn-primary text-center font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                    >
                      {isCompleted ? '📖 Review Course' : '▶️ Continue Learning'}
                    </Link>
                    
                    {isCompleted && (
                      <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-bold bg-green-50 px-4 py-3 rounded-xl border-2 border-green-200 shadow-md">
                        <CheckCircle className="w-5 h-5" />
                        <span>Completed</span>
                      </div>
                    )}
                    
                    {isExpiring && !isCompleted && (
                      <div className="text-center text-orange-600 text-sm font-bold bg-orange-50 px-4 py-3 rounded-xl border-2 border-orange-200 shadow-md">
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
        <div className="card text-center py-20 shadow-lg border border-gray-100 rounded-2xl">
          <BookOpen className="w-24 h-24 text-gray-300 mx-auto mb-6" />
          <h3 className="text-3xl font-bold mb-4 text-gray-900">
            {filter === 'all'
              ? 'No courses yet'
              : filter === 'active'
              ? 'No active courses'
              : 'No completed courses'}
          </h3>
          <p className="text-gray-600 mb-8 text-lg">
            {filter === 'all'
              ? 'Start your learning journey by enrolling in a course'
              : 'Start learning to track your progress here'}
          </p>
          <Link to="/courses" className="btn-primary btn-lg inline-block shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
            Browse Courses
          </Link>
        </div>
      )}
      </div>
    </div>
  );
};

export default MyCoursesPage;

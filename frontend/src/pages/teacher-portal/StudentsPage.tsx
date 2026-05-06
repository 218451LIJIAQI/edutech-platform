import { useState, useEffect, useCallback, useMemo } from 'react';
import clientLogger from '@/utils/logger';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Mail, Calendar, TrendingUp, Download, ArrowLeft, Search } from 'lucide-react';
import { Enrollment, Course, User } from '@/types';
import courseService from '@/services/course.service';
import enrollmentService from '@/services/enrollment.service';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import { buildCsvContent, downloadCsvFile } from '@/utils/download';
import { usePageTitle } from '@/hooks';

// Extended Enrollment type with user data (as returned by backend)
interface EnrollmentWithUser extends Enrollment {
  user?: User;
}

/**
 * Students Management Page
 * Teacher interface for viewing and managing course students
 */
const StudentsPage = () => {
  usePageTitle('Course Students');
  const { courseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<EnrollmentWithUser[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    averageProgress: 0,
    completionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTeacherCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch teacher's courses
      const coursesList = await courseService.getMyCourses();
      setCourses(coursesList);

      // Select first course or course from URL
      if (courseId) {
        const course = coursesList.find((c: Course) => c.id === courseId);
        if (course) setSelectedCourse(course);
      } else if (coursesList.length > 0) {
        setSelectedCourse(coursesList[0]);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch courses:', error);
      toast.error(extractErrorMessage(error, 'Failed to load courses'));
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  const fetchCourseStudents = useCallback(async () => {
    if (!selectedCourse) return;

    try {
      const data = await enrollmentService.getCourseStudents(selectedCourse.id);
      setStudents(data);
    } catch (error) {
      clientLogger.error('Failed to fetch students:', error);
      toast.error(extractErrorMessage(error, 'Failed to load students'));
    }
  }, [selectedCourse]);

  const fetchCourseStats = useCallback(async () => {
    if (!selectedCourse) return;

    try {
      const data = await enrollmentService.getCourseStats(selectedCourse.id);
      setStats(data);
    } catch (error) {
      clientLogger.error('Failed to fetch stats:', error);
      toast.error(extractErrorMessage(error, 'Failed to load course statistics'));
    }
  }, [selectedCourse]);

  useEffect(() => {
    fetchTeacherCourses();
  }, [fetchTeacherCourses]);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseStudents();
      fetchCourseStats();
    }
  }, [selectedCourse, fetchCourseStudents, fetchCourseStats]);

  const filteredStudents = useMemo(() => {
    return students.filter((enrollment) => {
    const student = enrollment.user;
    if (!student) return false;

    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const email = student.email.toLowerCase();
    const query = searchQuery.toLowerCase();

    return fullName.includes(query) || email.includes(query);
    });
  }, [students, searchQuery]);

  const exportToCSV = useCallback(() => {
    if (!selectedCourse) {
      toast.error('Please select a course first');
      return;
    }

    const headers = ['Name', 'Email', 'Enrolled Date', 'Progress', 'Completed Lessons'];
    const rows = filteredStudents.map((enrollment) => [
      `${enrollment.user?.firstName || ''} ${enrollment.user?.lastName || ''}`.trim(),
      enrollment.user?.email || '',
      new Date(enrollment.enrolledAt).toLocaleDateString(),
      `${enrollment.progress}%`,
      enrollment.completedLessons,
    ]);

    const csv = buildCsvContent([headers, ...rows]);
    downloadCsvFile(csv, `students-${selectedCourse.title.replace(/[^a-z0-9]/gi, '_') || 'export'}.csv`);
    toast.success('Student list exported!');
  }, [filteredStudents, selectedCourse]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <button type="button" onClick={() => navigate('/teacher')} className="btn-outline mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>

        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Student <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Management</span>
            </h1>
            <p className="text-gray-500 font-medium">View and manage your course students</p>
          </div>
        </div>

        {/* Course Selector */}
        {courses.length > 0 && (
          <div className="card mb-8 shadow-lg">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Course
            </label>
            <select
              value={selectedCourse?.id || ''}
              onChange={(e) => {
                const course = courses.find((c) => c.id === e.target.value);
                setSelectedCourse(course || null);
              }}
              className="input max-w-md"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {!selectedCourse ? (
          <div className="card text-center py-16 shadow-lg max-w-md mx-auto">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No courses found</h3>
            <p className="text-gray-600">Create a course first.</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <Users className="w-8 h-8" />
                  </div>
                  <span className="text-4xl font-bold">{stats.totalStudents}</span>
                </div>
                <p className="text-blue-100 font-semibold">Total Students</p>
              </div>

              <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                  <span className="text-4xl font-bold">{stats.averageProgress}%</span>
                </div>
                <p className="text-green-100 font-semibold">Avg. Progress</p>
              </div>

              <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <span className="text-4xl font-bold">{stats.completionRate}%</span>
                </div>
                <p className="text-purple-100 font-semibold">Completion Rate</p>
              </div>
            </div>

            {/* Students Table */}
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Student List</h2>
                <div className="flex items-center space-x-4">
                  {/* Search */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input pl-10 w-64"
                    />
                  </div>
                  {/* Export */}
                  <button type="button" onClick={exportToCSV} className="btn-outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </button>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {searchQuery ? 'No students found' : 'No students enrolled yet'}
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery
                      ? 'Try adjusting your search terms'
                      : 'Students will appear here once they enroll'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-4 px-4 font-bold text-gray-900">
                          Student
                        </th>
                        <th className="text-left py-4 px-4 font-bold text-gray-900">
                          Package
                        </th>
                        <th className="text-left py-4 px-4 font-bold text-gray-900">
                          Enrolled Date
                        </th>
                        <th className="text-left py-4 px-4 font-bold text-gray-900">
                          Progress
                        </th>
                        <th className="text-left py-4 px-4 font-bold text-gray-900">
                          Lessons
                        </th>
                        <th className="text-left py-4 px-4 font-bold text-gray-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((enrollment) => (
                        <tr key={enrollment.id} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all">
                          <td className="py-5 px-4">
                            <div className="flex items-center space-x-3">
                              {enrollment.user?.avatar ? (
                                <img
                                  src={enrollment.user.avatar}
                                  alt={`${enrollment.user?.firstName || 'Student'} ${enrollment.user?.lastName || ''}`.trim()}
                                  className="w-12 h-12 rounded-full shadow-md"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center shadow-md">
                                  <span className="text-white font-bold">
                                    {enrollment.user?.firstName?.[0]}
                                    {enrollment.user?.lastName?.[0]}
                                  </span>
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-900">
                                  {enrollment.user?.firstName} {enrollment.user?.lastName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {enrollment.user?.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-4">
                            <span className="text-sm font-medium text-gray-700">{enrollment.package?.name}</span>
                          </td>
                          <td className="py-5 px-4">
                            <span className="text-sm text-gray-600">
                              {new Date(enrollment.enrolledAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="flex-1 max-w-[120px]">
                                <div className="w-full bg-gray-300 rounded-full h-3">
                                  <div
                                    className="bg-gradient-to-r from-primary-600 to-primary-700 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${enrollment.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                              <span className="text-sm font-bold text-primary-600">
                                {enrollment.progress}%
                              </span>
                            </div>
                          </td>
                          <td className="py-5 px-4">
                            <span className="text-sm font-medium text-gray-700">
                              {enrollment.completedLessons} /{' '}
                              {selectedCourse?.lessons?.length || 0}
                            </span>
                          </td>
                          <td className="py-5 px-4">
                            {enrollment.user?.email ? (
                              <a
                                href={`mailto:${enrollment.user.email}`}
                                className="btn-sm btn-outline inline-flex items-center"
                                aria-label={`Email ${enrollment.user.firstName || 'student'} ${enrollment.user.lastName || ''}`.trim()}
                              >
                                <Mail className="w-4 h-4 mr-1" />
                                Contact
                              </a>
                            ) : (
                              <span className="btn-sm btn-outline inline-flex items-center opacity-50 cursor-not-allowed">
                                <Mail className="w-4 h-4 mr-1" />
                                Contact
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentsPage;

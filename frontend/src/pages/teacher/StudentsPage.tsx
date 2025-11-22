import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Mail, Calendar, TrendingUp, Download, ArrowLeft, Search } from 'lucide-react';
import { Enrollment, Course } from '@/types';
import courseService from '@/services/course.service';
import enrollmentService from '@/services/enrollment.service';
import toast from 'react-hot-toast';

/**
 * Students Management Page
 * Teacher interface for viewing and managing course students
 */
const StudentsPage = () => {
  const { courseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    averageProgress: 0,
    completionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTeacherCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseStudents();
      fetchCourseStats();
    }
  }, [selectedCourse]);

  const fetchTeacherCourses = async () => {
    setIsLoading(true);
    try {
      // Fetch teacher's courses
      const response = await courseService.getAllCourses();
      setCourses(response.courses || []);

      // Select first course or course from URL
      if (courseId) {
        const course = response.courses?.find((c: Course) => c.id === courseId);
        if (course) setSelectedCourse(course);
      } else if (response.courses && response.courses.length > 0) {
        setSelectedCourse(response.courses[0]);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourseStudents = async () => {
    if (!selectedCourse) return;

    try {
      const data = await enrollmentService.getCourseStudents(selectedCourse.id);
      setStudents(data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast.error('Failed to load students');
    }
  };

  const fetchCourseStats = async () => {
    if (!selectedCourse) return;

    try {
      const data = await enrollmentService.getCourseStats(selectedCourse.id);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const filteredStudents = students.filter((enrollment) => {
    const student = enrollment.user;
    if (!student) return false;

    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const email = student.email.toLowerCase();
    const query = searchQuery.toLowerCase();

    return fullName.includes(query) || email.includes(query);
  });

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Enrolled Date', 'Progress', 'Completed Lessons'];
    const rows = filteredStudents.map((enrollment) => [
      `${enrollment.user?.firstName} ${enrollment.user?.lastName}`,
      enrollment.user?.email || '',
      new Date(enrollment.enrolledAt).toLocaleDateString(),
      `${enrollment.progress}%`,
      enrollment.completedLessons,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-${selectedCourse?.title || 'export'}.csv`;
    a.click();
    toast.success('Student list exported!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <button onClick={() => navigate('/teacher')} className="btn-outline mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Users className="w-8 h-8 mr-3 text-primary-600" />
            Student Management
          </h1>
          <p className="text-gray-600">View and manage your course students</p>
        </div>

        {/* Course Selector */}
        {courses.length > 0 && (
          <div className="card mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
          <div className="card text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No courses found. Create a course first.</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8" />
                  <span className="text-3xl font-bold">{stats.totalStudents}</span>
                </div>
                <p className="text-blue-100">Total Students</p>
              </div>

              <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8" />
                  <span className="text-3xl font-bold">{stats.averageProgress}%</span>
                </div>
                <p className="text-green-100">Avg. Progress</p>
              </div>

              <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-8 h-8" />
                  <span className="text-3xl font-bold">{stats.completionRate}%</span>
                </div>
                <p className="text-purple-100">Completion Rate</p>
              </div>
            </div>

            {/* Students Table */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Student List</h2>
                <div className="flex items-center space-x-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input pl-10 w-64"
                    />
                  </div>
                  {/* Export */}
                  <button onClick={exportToCSV} className="btn-outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </button>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchQuery
                      ? 'No students found matching your search'
                      : 'No students enrolled yet'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Student
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Package
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Enrolled Date
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Progress
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Lessons
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((enrollment) => (
                        <tr key={enrollment.id} className="border-b hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              {enrollment.user?.avatar ? (
                                <img
                                  src={enrollment.user.avatar}
                                  alt=""
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                                  <span className="text-primary-600 font-medium">
                                    {enrollment.user?.firstName?.[0]}
                                    {enrollment.user?.lastName?.[0]}
                                  </span>
                                </div>
                              )}
                              <div>
                                <p className="font-medium">
                                  {enrollment.user?.firstName} {enrollment.user?.lastName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {enrollment.user?.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm">{enrollment.package?.name}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm">
                              {new Date(enrollment.enrolledAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 max-w-[100px]">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-primary-600 h-2 rounded-full"
                                    style={{ width: `${enrollment.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                              <span className="text-sm font-medium">
                                {enrollment.progress}%
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm">
                              {enrollment.completedLessons} /{' '}
                              {selectedCourse?.lessons?.length || 0}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => {
                                // Open email client
                                window.location.href = `mailto:${enrollment.user?.email}`;
                              }}
                              className="btn-sm btn-outline"
                            >
                              <Mail className="w-4 h-4 mr-1" />
                              Contact
                            </button>
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


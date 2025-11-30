import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, EyeOff, Users, Video, Radio, PlayCircle, Search, Filter, BookOpen, TrendingUp } from 'lucide-react';
import courseService from '@/services/course.service';
import { Course, CourseType } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { usePageTitle } from '@/hooks';
import toast from 'react-hot-toast';

/**
 * Manage Courses Page
 * Teacher's course management interface with improved UI
 */
const ManageCoursesPage = () => {
  usePageTitle('My Courses');
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');

  const fetchMyCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      const courses = await courseService.getMyCourses();
      setCourses(courses);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyCourses();
  }, [fetchMyCourses]);

  const handleTogglePublish = async (courseId: string, currentStatus: boolean) => {
    try {
      await courseService.updateCourse(courseId, {
        isPublished: !currentStatus,
      });
      toast.success(
        !currentStatus ? 'Course published successfully' : 'Course unpublished'
      );
      fetchMyCourses();
    } catch (_error) {
      toast.error('Failed to update course status');
    }
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await courseService.deleteCourse(courseId);
      toast.success('Course deleted successfully');
      fetchMyCourses();
    } catch (error) {
      const message = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined;
      toast.error(message || 'Failed to delete course');
    }
  };

  // Type helper for course with enrollment count
  type CourseWithCount = Course & { _count?: { enrollments?: number } };

  // Filter and search courses
  const filteredCourses = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return courses.filter((course) => {
      const matchesSearch = course.title.toLowerCase().includes(query) ||
                           course.description?.toLowerCase().includes(query);
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'published' && course.isPublished) ||
                           (filterStatus === 'draft' && !course.isPublished);
      return matchesSearch && matchesStatus;
    });
  }, [courses, searchQuery, filterStatus]);

  // Calculate statistics
  const stats = useMemo(() => ({
    total: courses.length,
    published: courses.filter(c => c.isPublished).length,
    draft: courses.filter(c => !c.isPublished).length,
    totalStudents: courses.reduce((sum, c) => {
      const courseWithCount = c as CourseWithCount;
      return sum + (courseWithCount._count?.enrollments || 0);
    }, 0),
  }), [courses]);

  // Resolve asset URL (handles absolute and relative paths like /uploads/...)
  const resolveAssetUrl = useCallback((path?: string): string => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const apiUrl = (import.meta.env?.VITE_API_URL as string) || 'http://localhost:3000/api/v1';
    // Remove trailing /api/... from API URL to get server origin
    const origin = apiUrl.replace(/\/api(\/.*)?$/i, '');
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  }, []);

  // Build a placeholder cover when no thumbnail is set
  const getCourseCover = useCallback((course: Course): string => {
    if (course.thumbnail) return resolveAssetUrl(course.thumbnail);
    const keyword = encodeURIComponent(course.category || course.title || 'education');
    // Unsplash dynamic placeholder
    return `https://source.unsplash.com/featured/800x450?${keyword}`;
  }, [resolveAssetUrl]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
                <span className="text-2xl">🎓</span>
              </div>
              <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div>
            </div>
            <p className="text-gray-600 font-medium">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <span className="text-2xl">🎓</span>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                  Manage <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Courses</span>
                </h1>
                <p className="text-gray-500 font-medium mt-1">Create and manage your course offerings</p>
              </div>
            </div>
            <Link to="/teacher/courses/new" className="btn-primary inline-flex items-center gap-2 shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all">
              <Plus className="w-5 h-5" />
              Create New Course
            </Link>
          </div>

          {/* Statistics Cards */}
          {courses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-blue-400/30 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-bold mb-2 uppercase tracking-wide">Total Courses</p>
                    <p className="text-4xl font-bold text-white">{stats.total}</p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-blue-100" />
                  </div>
                </div>
              </div>

              <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-green-400/30 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-bold mb-2 uppercase tracking-wide">Published</p>
                    <p className="text-4xl font-bold text-white">{stats.published}</p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                    <Eye className="w-8 h-8 text-green-100" />
                  </div>
                </div>
              </div>

              <div className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-yellow-400/30 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-bold mb-2 uppercase tracking-wide">Drafts</p>
                    <p className="text-4xl font-bold text-white">{stats.draft}</p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                    <Edit className="w-8 h-8 text-yellow-100" />
                  </div>
                </div>
              </div>

              <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-primary-400/30 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary-100 text-sm font-bold mb-2 uppercase tracking-wide">Total Students</p>
                    <p className="text-4xl font-bold text-white">{stats.totalStudents}</p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                    <Users className="w-8 h-8 text-primary-100" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm transition-all"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <select
                id="course-filter"
                title="Filter courses by status"
                aria-label="Filter courses by status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'published' | 'draft')}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm transition-all appearance-none cursor-pointer"
              >
                <option value="all">All Courses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          {searchQuery || filterStatus !== 'all' ? (
            <p className="text-sm text-gray-600 mt-3">
              Found <span className="font-semibold text-gray-900">{filteredCourses.length}</span> course{filteredCourses.length !== 1 ? 's' : ''}
            </p>
          ) : null}
        </div>

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="card shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] overflow-hidden group border border-gray-100 hover:border-primary-200 rounded-2xl"
              >
                {/* Course Header with Thumbnail */}
                <div className="relative h-40 overflow-hidden">
                  {/* Fallback gradient + icon (visible when no image or image fails) */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600">
                    <div className="absolute inset-0 opacity-10 bg-pattern" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-white opacity-40 group-hover:opacity-60 transition-opacity" />
                    </div>
                  </div>

                  {/* Course cover image */}
                  <img
                    src={getCourseCover(course)}
                    alt={`${course.title} cover`}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      // Hide broken image and show the gradient fallback beneath
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />

                  {/* Overlay to improve contrast over images */}
                  <div className="absolute inset-0 bg-black/10" />

                  {/* Status Badge */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    {course.isPublished ? (
                      <span className="badge-success text-xs">Published</span>
                    ) : (
                      <span className="badge-warning text-xs">Draft</span>
                    )}
                  </div>
                </div>

                {/* Course Content */}
                <div className="p-6">
                  {/* Title and Category */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {course.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge-primary text-xs">{course.category}</span>
                      
                      {/* Course Type Badge */}
                      {course.courseType === CourseType.LIVE && (
                        <span className="badge bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200 flex items-center gap-1 text-xs">
                          <Radio className="w-3 h-3" />
                          Live
                        </span>
                      )}
                      {course.courseType === CourseType.RECORDED && (
                        <span className="badge bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1 text-xs">
                          <Video className="w-3 h-3" />
                          Recorded
                        </span>
                      )}
                      {course.courseType === CourseType.HYBRID && (
                        <span className="badge bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1 text-xs">
                          <PlayCircle className="w-3 h-3" />
                          Hybrid
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                    {course.description}
                  </p>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-6 py-4 border-y border-gray-200">
                    <div className="text-center">
                      <p className="text-gray-500 text-xs font-medium mb-1">Students</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(course as CourseWithCount)._count?.enrollments || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 text-xs font-medium mb-1">Lessons</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {course.lessons?.length || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 text-xs font-medium mb-1">Materials</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {course.materials?.length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Pricing */}
                  {course.packages && course.packages.length > 0 && (
                    <div className="mb-6 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">Starting Price</p>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(course.packages[0].finalPrice)}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Link
                      to={`/teacher/courses/${course.id}/manage`}
                      className="flex-1 btn-secondary text-center py-2 text-sm font-medium"
                    >
                      Manage
                    </Link>
                    <button
                      onClick={() => navigate(`/teacher/courses/${course.id}/edit`)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Edit Course"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleTogglePublish(course.id, course.isPublished)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                      title={course.isPublished ? 'Unpublish' : 'Publish'}
                    >
                      {course.isPublished ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id, course.title)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete Course"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          // Empty State
          <div className="card text-center py-16 shadow-lg max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="w-10 h-10 text-primary-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No courses yet</h3>
            <p className="text-gray-600 mb-8 text-lg">
              Create your first course to start teaching
            </p>
            <Link to="/teacher/courses/new" className="btn-primary btn-lg inline-block">
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Course
            </Link>
          </div>
        ) : (
          // No Results State
          <div className="card text-center py-16 shadow-lg max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No courses found</h3>
            <p className="text-gray-600 mb-8 text-lg">
              Try adjusting your search or filter criteria
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
              }}
              className="btn-secondary inline-block"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Help Card */}
        {courses.length > 0 && (
          <div className="card bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 mt-8 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-3">Tips to Improve Your Courses</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2 text-green-600 font-bold">✓</span>
                    <span>Use clear, descriptive titles</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-600 font-bold">✓</span>
                    <span>Provide detailed course descriptions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-600 font-bold">✓</span>
                    <span>Add preview content to attract students</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-600 font-bold">✓</span>
                    <span>Structure lessons in a logical order</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-600 font-bold">✓</span>
                    <span>Include downloadable materials</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-green-600 font-bold">✓</span>
                    <span>Set competitive pricing</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageCoursesPage;

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import clientLogger from '@/utils/logger';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Plus, Edit, Trash2, Eye, EyeOff, Users, Video, Radio, PlayCircle, RefreshCcw, Search, Filter, BookOpen, TrendingUp, CheckCircle, Zap } from 'lucide-react';
import courseService from '@/services/course.service';
import { Course, CourseType } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { usePageTitle } from '@/hooks';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import QuickStartGuide from '@/components/teacher/QuickStartGuide';
import { resolveBackendAssetUrl } from '@/utils/runtime';
import { getCourseLessonCount, getCourseMaterialCount } from '@/utils/course-counts';

type CourseWithCount = Course & { _count?: { enrollments?: number } };

const ManageCoursesPage = () => {
  usePageTitle('My Courses');
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [togglingCourseId, setTogglingCourseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [failedThumbnailCourseIds, setFailedThumbnailCourseIds] = useState<Set<string>>(new Set());
  const [coursePendingDelete, setCoursePendingDelete] = useState<Course | null>(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);
  const requestIdRef = useRef(0);

  const fetchMyCourses = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const loadedCourses = await courseService.getMyCourses();
      if (requestId !== requestIdRef.current) {
        return;
      }
      setCourses(loadedCourses);
      setFailedThumbnailCourseIds(new Set());
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      clientLogger.error('Failed to fetch courses:', error);
      const message = extractErrorMessage(error, 'Failed to load courses');
      setLoadError(message);
      toast.error(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchMyCourses();
    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchMyCourses]);

  const handleTogglePublish = async (courseId: string, currentStatus: boolean) => {
    if (togglingCourseId) return;
    setTogglingCourseId(courseId);
    try {
      await courseService.updateCourse(courseId, {
        isPublished: !currentStatus,
      });
      toast.success(
        !currentStatus ? 'Course published' : 'Course unpublished'
      );
      await fetchMyCourses();
    } catch (error) {
      clientLogger.error('Failed to update course status:', error);
      toast.error(extractErrorMessage(error, 'Failed to update course status'));
    } finally {
      setTogglingCourseId(null);
    }
  };

  const handleDeleteCourse = async () => {
    if (!coursePendingDelete || isDeletingCourse) {
      return;
    }

    setIsDeletingCourse(true);
    try {
      await courseService.deleteCourse(coursePendingDelete.id);
      toast.success('Course deleted');
      await fetchMyCourses();
      setCoursePendingDelete(null);
    } catch (error) {
      clientLogger.error(`Failed to delete course ${coursePendingDelete.id}:`, error);
      toast.error(extractErrorMessage(error, 'Failed to delete course'));
    } finally {
      setIsDeletingCourse(false);
    }
  };

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesSearch =
        !query ||
        course.title.toLowerCase().includes(query) ||
        Boolean(course.description?.toLowerCase().includes(query));
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'published' && course.isPublished) ||
        (filterStatus === 'draft' && !course.isPublished);
      return matchesSearch && matchesStatus;
    });
  }, [courses, searchQuery, filterStatus]);

  const stats = useMemo(() => ({
    total: courses.length,
    published: courses.filter(c => c.isPublished).length,
    draft: courses.filter(c => !c.isPublished).length,
    totalStudents: courses.reduce((sum, c) => {
      const courseWithCount = c as CourseWithCount;
      return sum + (courseWithCount._count?.enrollments || 0);
    }, 0),
  }), [courses]);

  const getCourseCover = useCallback((course: Course): string | null => {
    if (!course.thumbnail || failedThumbnailCourseIds.has(course.id)) {
      return null;
    }

    return resolveBackendAssetUrl(course.thumbnail);
  }, [failedThumbnailCourseIds]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse motion-reduce:animate-none flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping motion-reduce:animate-none"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                  Manage <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Courses</span>
                </h1>
                <p className="text-gray-500 font-medium mt-1">Create and manage your course offerings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsQuickStartOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-xl transition-all"
              >
                <Zap className="w-5 h-5" />
                Quick Start
              </button>
              <Link to="/teacher/courses/new" className="btn-primary inline-flex items-center gap-2 shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all">
                <Plus className="w-5 h-5" />
                Create New Course
              </Link>
            </div>
          </div>

          {courses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl border border-blue-400/30 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-bold mb-2 uppercase">Total Courses</p>
                    <p className="text-4xl font-bold text-white tabular-nums">{stats.total}</p>
                  </div>
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-7 h-7 text-blue-100" />
                  </div>
                </div>
              </div>

              <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl border border-green-400/30 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-bold mb-2 uppercase">Published</p>
                    <p className="text-4xl font-bold text-white tabular-nums">{stats.published}</p>
                  </div>
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <Eye className="w-7 h-7 text-green-100" />
                  </div>
                </div>
              </div>

              <div className="card bg-gradient-to-br from-amber-500 to-yellow-600 text-white shadow-xl border border-yellow-400/30 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-bold mb-2 uppercase">Drafts</p>
                    <p className="text-4xl font-bold text-white tabular-nums">{stats.draft}</p>
                  </div>
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <Edit className="w-7 h-7 text-yellow-100" />
                  </div>
                </div>
              </div>

              <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-xl border border-primary-400/30 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary-100 text-sm font-bold mb-2 uppercase">Total Students</p>
                    <p className="text-4xl font-bold text-white tabular-nums">{stats.totalStudents}</p>
                  </div>
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <Users className="w-7 h-7 text-primary-100" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <label htmlFor="manage-courses-search" className="sr-only">
                Search courses by title or description
              </label>
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="manage-courses-search"
                type="text"
                placeholder="Search courses by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm transition-all"
              />
            </div>

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

          {searchQuery.trim() || filterStatus !== 'all' ? (
            <div className="mt-3 flex items-center justify-between text-sm text-gray-600 tabular-nums">
              <p>
                Found <span className="font-semibold text-gray-900">{filteredCourses.length}</span> course{filteredCourses.length !== 1 ? 's' : ''}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
                className="text-primary-700 hover:underline font-semibold"
              >
                Clear filters
              </button>
            </div>
          ) : null}
        </div>

        {loadError ? (
          <div role="alert" className="card max-w-lg mx-auto text-center space-y-4 py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Unable to load your courses</h2>
            <p className="text-sm text-slate-600">{loadError}</p>
            <button
              type="button"
              onClick={() => void fetchMyCourses()}
              className="btn-primary inline-flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Retry
            </button>
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCourses.map((course) => {
              const courseCover = getCourseCover(course);

              return (
                <div
                  key={course.id}
                  className="card card-smooth p-0 overflow-hidden group border border-slate-200/80 rounded-2xl"
                >
                  <div className="relative h-40 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-white opacity-40 group-hover:opacity-60 transition-opacity" />
                      </div>
                    </div>

                    {courseCover ? (
                      <img
                        src={courseCover}
                        alt={`${course.title} cover`}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={() => {
                          setFailedThumbnailCourseIds((currentIds) => {
                            const nextIds = new Set(currentIds);
                            nextIds.add(course.id);
                            return nextIds;
                          });
                        }}
                      />
                    ) : null}

                    <div className="absolute inset-0 bg-black/10" />

                    <div className="absolute top-4 right-4 flex gap-2">
                      {course.isPublished ? (
                        <span className="badge-success text-xs">Published</span>
                      ) : (
                        <span className="badge-warning text-xs">Draft</span>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                        {course.title}
                      </h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge-primary text-xs">{course.category}</span>

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

                    <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                      {course.description}
                    </p>

                    <div className="grid grid-cols-3 gap-3 mb-6 py-4 border-y border-gray-200 tabular-nums">
                      <div className="text-center">
                        <p className="text-gray-500 text-xs font-medium mb-1">Students</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {(course as CourseWithCount)._count?.enrollments || 0}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 text-xs font-medium mb-1">Lessons</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {getCourseLessonCount(course)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 text-xs font-medium mb-1">Materials</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {getCourseMaterialCount(course)}
                        </p>
                      </div>
                    </div>

                    {course.packages && course.packages.length > 0 && (
                      <div className="mb-6 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <p className="text-xs text-gray-600 mb-1">Starting Price</p>
                        <p className="text-lg font-bold text-green-700 tabular-nums">
                          {formatCurrency(Math.min(...course.packages.map((p) => p.finalPrice)))}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link
                        to={`/teacher/courses/${course.id}/manage`}
                        className="flex-1 btn-secondary text-center py-2 text-sm font-medium"
                      >
                        Manage
                      </Link>
                      <button
                        type="button"
                        onClick={() => navigate(`/teacher/courses/${course.id}/edit`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit course"
                        aria-label={`Edit ${course.title}`}
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        disabled={togglingCourseId === course.id}
                        onClick={() => void handleTogglePublish(course.id, course.isPublished)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50"
                        title={course.isPublished ? 'Unpublish' : 'Publish'}
                        aria-label={`${course.isPublished ? 'Unpublish' : 'Publish'} ${course.title}`}
                      >
                        {course.isPublished ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoursePendingDelete(course)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete course"
                        aria-label={`Delete ${course.title}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : courses.length === 0 ? (
          <div className="card text-center py-16 shadow-lg max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="w-10 h-10 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No courses yet</h2>
            <p className="text-gray-600 mb-8 text-lg">
              Create your first course to start teaching
            </p>
            <Link to="/teacher/courses/new" className="btn-primary btn-lg inline-block">
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Course
            </Link>
          </div>
        ) : (
          <div className="card text-center py-16 shadow-lg max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No courses found</h2>
            <p className="text-gray-600 mb-8 text-lg">
              Try adjusting your search or filter criteria
            </p>
            <button
              type="button"
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

        {courses.length > 0 && (
          <div className="card bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 mt-8 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-gray-900 mb-3">Tips to Improve Your Courses</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Use clear, descriptive titles</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Provide detailed course descriptions</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Add preview content to attract students</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Structure lessons in a logical order</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Include downloadable materials</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Set competitive pricing</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <QuickStartGuide
        isOpen={isQuickStartOpen}
        onClose={() => {
          setIsQuickStartOpen(false);
          void fetchMyCourses();
        }}
      />

      <ConfirmationModal
        isOpen={Boolean(coursePendingDelete)}
        title="Delete course"
        description={
          coursePendingDelete
            ? `Permanently delete "${coursePendingDelete.title}". This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Course"
        tone="danger"
        isLoading={isDeletingCourse}
        onClose={() => {
          if (!isDeletingCourse) {
            setCoursePendingDelete(null);
          }
        }}
        onConfirm={handleDeleteCourse}
      />
    </div>
  );
};

export default ManageCoursesPage;

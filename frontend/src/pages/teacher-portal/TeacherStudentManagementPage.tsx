import { useCallback, useEffect, useMemo, useState } from 'react';
import clientLogger from '@/utils/logger';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Users, Search, Filter, Download, RefreshCcw, TrendingUp, Calendar, BookOpen, User, MessageSquare, Copy } from 'lucide-react';
import courseService from '@/services/course.service';
import enrollmentService from '@/services/enrollment.service';
import { Course, Enrollment, User as AppUser } from '@/types';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import { copyTextToClipboard } from '@/utils/clipboard';
import { buildCsvContent, downloadCsvFile } from '@/utils/download';
import { getCourseLessonCount } from '@/utils/course-counts';
import { usePageTitle } from '@/hooks';

interface AggregatedStudent {
  user: AppUser;
  courses: Array<{
    courseId: string;
    courseTitle: string;
    enrolledAt: string;
    progress: number;
    completedLessons: number;
    totalLessons: number;
  }>;
  totalCourses: number;
  averageProgress: number; // across courses
  lastEnrolledAt?: string;
}

const TeacherStudentManagementPage = () => {
  usePageTitle('Student Management');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<AggregatedStudent[]>([]);
  const [search, setSearch] = useState('');
  const [filterCourseId, setFilterCourseId] = useState<string>('all');
  const [progressMin, setProgressMin] = useState(0);
  const [progressMax, setProgressMax] = useState(100);
  const navigate = useNavigate();

  const hasActiveFilters = Boolean(
    search.trim() || filterCourseId !== 'all' || progressMin > 0 || progressMax < 100
  );

  const loadStudentData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
        const myCourses = await courseService.getMyCourses();
        setCourses(myCourses);

        const enrollmentResults = await Promise.allSettled(
          myCourses.map(async (course) => ({
            course,
            enrollments: await enrollmentService.getCourseStudents(course.id),
          }))
        );

        const allEnrollments: Array<{ course: Course; enrollments: Enrollment[] }> = [];
        enrollmentResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            allEnrollments.push(result.value);
            return;
          }

          const failedCourse = myCourses[index];
          clientLogger.error(`Failed to fetch students for course ${failedCourse.id}:`, result.reason);
        });

        const aggregatedStudents = new Map<string, AggregatedStudent>();
        for (const entry of allEnrollments) {
          const totalLessons = getCourseLessonCount(entry.course);

          for (const enrollment of entry.enrollments as (Enrollment & { user?: AppUser })[]) {
            if (!enrollment.user) {
              continue;
            }

            const key = enrollment.user.id;
            if (!aggregatedStudents.has(key)) {
              aggregatedStudents.set(key, {
                user: enrollment.user,
                courses: [],
                totalCourses: 0,
                averageProgress: 0,
                lastEnrolledAt: undefined,
              });
            }

            const student = aggregatedStudents.get(key)!;
            student.courses.push({
              courseId: entry.course.id,
              courseTitle: entry.course.title,
              enrolledAt: enrollment.enrolledAt,
              progress: enrollment.progress,
              completedLessons: enrollment.completedLessons,
              totalLessons,
            });
            student.totalCourses = student.courses.length;
            student.averageProgress =
              student.courses.reduce((accumulator, courseItem) => accumulator + courseItem.progress, 0) / student.courses.length;
            student.lastEnrolledAt = student.courses
              .map((courseItem) => courseItem.enrolledAt)
              .sort()
              .slice(-1)[0];
          }
        }

        setStudents(Array.from(aggregatedStudents.values()));
      } catch (error) {
        clientLogger.error('Failed to load students:', error);
        const message = extractErrorMessage(error, 'Failed to load students');
        setLoadError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
  }, []);

  useEffect(() => {
    void loadStudentData();
  }, [loadStudentData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => {
        const inCourse =
          filterCourseId === 'all' || s.courses.some((c) => c.courseId === filterCourseId);
        const inProgress = s.averageProgress >= progressMin && s.averageProgress <= progressMax;
        const name = `${s.user.firstName} ${s.user.lastName}`.toLowerCase();
        const email = s.user.email.toLowerCase();
        const match = !q || name.includes(q) || email.includes(q);
        return inCourse && inProgress && match;
      })
      .sort((a, b) => (b.lastEnrolledAt || '').localeCompare(a.lastEnrolledAt || ''));
  }, [students, search, filterCourseId, progressMin, progressMax]);

  const exportCSV = () => {
    const headers = [
      'Name',
      'Email',
      'Total Courses',
      'Average Progress',
      'Last Enrolled',
      'Courses Detail (title|progress%)',
    ];
    const rows = filtered.map((s) => [
      `${s.user.firstName} ${s.user.lastName}`,
      s.user.email,
      s.totalCourses,
      `${Math.round(s.averageProgress)}%`,
      s.lastEnrolledAt ? new Date(s.lastEnrolledAt).toLocaleDateString() : '',
      s.courses.map((c) => `${c.courseTitle}|${c.progress}%`).join('; '),
    ]);
    const csv = buildCsvContent([headers, ...rows]);
    downloadCsvFile(csv, 'students-management.csv');
  };

  const copyEmail = async (email: string) => {
    try {
      const copied = await copyTextToClipboard(email);
      if (!copied) {
        toast.error('Unable to copy email. Please copy it manually.');
        return;
      }
      toast.success('Email copied');
    } catch (error) {
      clientLogger.error('Failed to copy student email:', error);
      toast.error(extractErrorMessage(error, 'Copy failed'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Student <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Directory</span>
              </h1>
              <p className="text-gray-500 font-medium">View aggregated learners and progress across all your courses</p>
            </div>
          </div>
          <Link to="/teacher/students" className="btn-outline btn-sm">
            <BookOpen className="w-4 h-4" />
            Per-Course Roster View
          </Link>
        </div>

        {/* Filters */}
        <div className="card mb-6 shadow-xl border border-gray-100 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10 w-full md:w-80"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                className="input"
                value={filterCourseId}
                onChange={(e) => setFilterCourseId(e.target.value)}
              >
                <option value="all">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-600">Progress (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={progressMin}
                onChange={(e) => {
                  const raw = e.target.value;
                  setProgressMin(raw === '' ? 0 : Math.min(100, Math.max(0, Number(raw))));
                }}
                className="input w-20 tabular-nums"
                aria-label="Minimum progress percentage"
              />
              <span>&ndash;</span>
              <input
                type="number"
                min={0}
                max={100}
                value={progressMax}
                onChange={(e) => {
                  const raw = e.target.value;
                  setProgressMax(raw === '' ? 100 : Math.min(100, Math.max(0, Number(raw))));
                }}
                className="input w-20 tabular-nums"
                aria-label="Maximum progress percentage"
              />
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setFilterCourseId('all');
                    setProgressMin(0);
                    setProgressMax(100);
                  }}
                  className="btn-secondary btn-sm"
                >
                  Clear Filters
                </button>
              )}
              <button
                type="button"
                onClick={exportCSV}
                disabled={filtered.length === 0}
                className="btn-outline ml-auto"
              >
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card shadow-xl border border-gray-100 rounded-2xl">
          {isLoading ? (
            <div className="py-12 text-center text-gray-600">Loading student directory...</div>
          ) : loadError ? (
            <div className="py-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="text-sm font-medium text-red-800">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadStudentData()}
                className="btn-primary btn-sm inline-flex items-center gap-1.5"
              >
                <RefreshCcw className="w-4 h-4" />
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-gray-700 font-semibold">
                {hasActiveFilters ? 'No students match the current filters' : 'No enrolled students yet'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setFilterCourseId('all');
                    setProgressMin(0);
                    setProgressMax(100);
                  }}
                  className="btn-secondary btn-sm"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-4 font-bold text-gray-900">Student</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">Courses</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">Avg. Progress</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">Last Enrolled</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">Overview</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-5 px-4">
                        <div className="flex items-center gap-3">
                          {s.user.avatar ? (
                            <img
                              src={s.user.avatar}
                              alt={`${s.user.firstName} ${s.user.lastName}`}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                              {s.user.firstName?.[0]}
                              {s.user.lastName?.[0]}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-gray-900">{s.user.firstName} {s.user.lastName}</div>
                            <div className="text-sm text-gray-600">{s.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <div className="text-sm text-gray-700 font-medium">{s.totalCourses}</div>
                      </td>
                      <td className="py-5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2.5">
                            <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${Math.round(s.averageProgress)}%` }} />
                          </div>
                          <span className="text-sm font-bold text-primary-700">{Math.round(s.averageProgress)}%</span>
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <span className="text-sm text-gray-700">{s.lastEnrolledAt ? new Date(s.lastEnrolledAt).toLocaleDateString() : '-'}</span>
                      </td>
                      <td className="py-5 px-4">
                        <details>
                          <summary className="cursor-pointer text-primary-600 hover:underline">View</summary>
                          <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3">
                            {s.courses.map((c) => (
                              <div key={c.courseId} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium text-gray-800">{c.courseTitle}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <TrendingUp className="w-4 h-4" /> {c.progress}%
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4" /> {new Date(c.enrolledAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      </td>
                      <td className="py-5 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/messages?contactId=${s.user.id}`)}
                            className="btn-outline btn-sm flex items-center gap-1"
                            title="Message student"
                          >
                            <MessageSquare className="w-4 h-4" /> Message
                          </button>
                          <button
                            type="button"
                            onClick={() => copyEmail(s.user.email)}
                            className="btn-outline btn-sm flex items-center gap-1"
                            title="Copy email"
                          >
                            <Copy className="w-4 h-4" /> Copy Email
                          </button>
                          <Link
                            to={`/community/user/${s.user.id}`}
                            className="btn-outline btn-sm flex items-center gap-1"
                            title="View profile"
                          >
                            <User className="w-4 h-4" /> Profile
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="card mt-6 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-5 h-5 text-blue-700" />
            <h3 className="font-bold text-blue-900">Quick Actions</h3>
          </div>
          <ul className="text-sm text-blue-800 list-disc pl-6 space-y-1">
            <li>Search students by name or email</li>
            <li>Filter by a specific course and progress range</li>
            <li>Click "View" to see per-course progress overview</li>
            <li>Export the current list as CSV for offline analysis</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TeacherStudentManagementPage;

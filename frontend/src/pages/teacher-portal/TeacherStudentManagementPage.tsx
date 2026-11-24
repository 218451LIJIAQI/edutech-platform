import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  averageProgress: number;
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
  const requestIdRef = useRef(0);
  const navigate = useNavigate();

  const hasActiveFilters = Boolean(
    search.trim() || filterCourseId !== 'all' || progressMin > 0 || progressMax < 100
  );

  const loadStudentData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const myCourses = await courseService.getMyCourses();
      if (requestId !== requestIdRef.current) {
        return;
      }
      setCourses(myCourses);

      const enrollmentResults = await Promise.allSettled(
        myCourses.map(async (course) => ({
          course,
          enrollments: await enrollmentService.getCourseStudents(course.id),
        }))
      );
      if (requestId !== requestIdRef.current) {
        return;
      }

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
      if (requestId !== requestIdRef.current) {
        return;
      }
      clientLogger.error('Failed to load students:', error);
      const message = extractErrorMessage(error, 'Failed to load students');
      setLoadError(message);
      toast.error(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadStudentData();
    return () => {
      requestIdRef.current += 1;
    };
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

        <div className="card mb-6 shadow-xl border border-gray-100 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center gap-4 flex-wrap">
            <div className="relative">
              <label htmlFor="student-dir-search" className="sr-only">
                Search students by name or email
              </label>
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="student-dir-search"
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10 w-full md:w-72"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <label htmlFor="student-dir-course" className="sr-only">
                Filter by course
              </label>
              <select
                id="student-dir-course"
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

            <div className="flex flex-wrap items-center gap-3 flex-1">
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
                aria-invalid={progressMin > progressMax}
                aria-describedby={progressMin > progressMax ? 'student-progress-range-error' : undefined}
                className={`input w-20 tabular-nums ${progressMin > progressMax ? 'input-error' : ''}`}
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
                aria-invalid={progressMin > progressMax}
                aria-describedby={progressMin > progressMax ? 'student-progress-range-error' : undefined}
                className={`input w-20 tabular-nums ${progressMin > progressMax ? 'input-error' : ''}`}
                aria-label="Maximum progress percentage"
              />
              {progressMin > progressMax && (
                <p id="student-progress-range-error" className="text-xs font-medium text-danger-600">
                  Min progress cannot exceed max progress.
                </p>
              )}
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

        <div className="card shadow-xl border border-gray-100 rounded-2xl">
          {isLoading ? (
            <div className="py-12 text-center text-gray-600">Loading student directory...</div>
          ) : loadError ? (
            <div role="alert" className="py-12 text-center space-y-3">
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
                              className="w-10 h-10 rounded-full object-cover"
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
                      <td className="py-5 px-4 tabular-nums">
                        <div className="text-sm text-gray-700 font-medium">{s.totalCourses}</div>
                      </td>
                      <td className="py-5 px-4 tabular-nums">
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2.5">
                            <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${Math.round(s.averageProgress)}%` }} />
                          </div>
                          <span className="text-sm font-bold text-primary-700">{Math.round(s.averageProgress)}%</span>
                        </div>
                      </td>
                      <td className="py-5 px-4 tabular-nums">
                        <span className="text-sm text-gray-700">{s.lastEnrolledAt ? new Date(s.lastEnrolledAt).toLocaleDateString() : '-'}</span>
                      </td>
                      <td className="py-5 px-4">
                        <details>
                          <summary className="cursor-pointer text-primary-600 hover:underline font-medium">View</summary>
                          <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3">
                            {s.courses.map((c) => (
                              <div key={c.courseId} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 min-w-0">
                                  <BookOpen className="w-4 h-4 text-gray-500 shrink-0" />
                                  <span className="font-medium text-gray-800 truncate">{c.courseTitle}</span>
                                </div>
                                <div className="flex items-center gap-4 shrink-0 tabular-nums">
                                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                    <TrendingUp className="w-4 h-4" /> {c.progress}%
                                  </div>
                                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
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
                            onClick={() => void copyEmail(s.user.email)}
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

        <div className="card mt-6 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-5 h-5 text-blue-700" />
            <h2 className="font-bold text-blue-900 text-lg">Directory Actions</h2>
          </div>
          <ul className="text-sm text-blue-800 list-disc pl-6 space-y-1">
            <li>Search students by name or email</li>
            <li>Filter by a specific course and progress range</li>
            <li>Click &ldquo;View&rdquo; to inspect per-course progress overview</li>
            <li>Export the current list as CSV for offline analysis</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TeacherStudentManagementPage;

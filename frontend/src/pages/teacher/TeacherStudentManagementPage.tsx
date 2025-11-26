import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Filter, Download, TrendingUp, Calendar, BookOpen, User } from 'lucide-react';
import courseService from '@/services/course.service';
import enrollmentService from '@/services/enrollment.service';
import { Course, Enrollment, User as AppUser } from '@/types';
import toast from 'react-hot-toast';

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
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<AggregatedStudent[]>([]);
  const [search, setSearch] = useState('');
  const [filterCourseId, setFilterCourseId] = useState<string>('all');
  const [progressMin, setProgressMin] = useState(0);
  const [progressMax, setProgressMax] = useState(100);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const myCourses = await courseService.getMyCourses();
      setCourses(myCourses);

      // Fetch students per course and aggregate
      const allEnrollments: Array<{ course: Course; enrollments: Enrollment[] }> = [];
      for (const course of myCourses) {
        try {
          const enrollments = await enrollmentService.getCourseStudents(course.id);
          allEnrollments.push({ course, enrollments });
        } catch (e) {
          console.error('Failed to fetch students for course', course.id, e);
        }
      }

      const aggMap = new Map<string, AggregatedStudent>();
      for (const entry of allEnrollments) {
        const totalLessons = entry.course.lessons?.length || 0;
        for (const enr of entry.enrollments as (Enrollment & { user?: AppUser })[]) {
          if (!enr.user) continue;
          const key = enr.user.id;
          if (!aggMap.has(key)) {
            aggMap.set(key, {
              user: enr.user,
              courses: [],
              totalCourses: 0,
              averageProgress: 0,
              lastEnrolledAt: undefined,
            });
          }
          const item = aggMap.get(key)!;
          item.courses.push({
            courseId: entry.course.id,
            courseTitle: entry.course.title,
            enrolledAt: enr.enrolledAt,
            progress: enr.progress,
            completedLessons: enr.completedLessons,
            totalLessons,
          });
          item.totalCourses = item.courses.length;
          item.averageProgress =
            item.courses.reduce((acc, c) => acc + c.progress, 0) / item.courses.length;
          item.lastEnrolledAt = item.courses
            .map((c) => c.enrolledAt)
            .sort()
            .slice(-1)[0];
        }
      }
      setStudents(Array.from(aggMap.values()));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

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
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students-management.csv';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="section-title mb-3 flex items-center">
            <div className="p-2 bg-primary-100 rounded-xl mr-3">
              <Users className="w-8 h-8 text-primary-600" />
            </div>
            Student Management
          </h1>
          <p className="section-subtitle">View all students across your courses, search and drill down into learning records.</p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
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

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Progress</span>
              <input type="number" min={0} max={100} value={progressMin} onChange={(e)=>setProgressMin(Number(e.target.value)||0)} className="input w-20" />
              <span>-</span>
              <input type="number" min={0} max={100} value={progressMax} onChange={(e)=>setProgressMax(Number(e.target.value)||100)} className="input w-20" />
              <button onClick={exportCSV} className="btn-outline ml-auto">
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {isLoading ? (
            <div className="py-12 text-center text-gray-600">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-600">No students found</div>
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
                            <img src={s.user.avatar} className="w-10 h-10 rounded-full" />
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


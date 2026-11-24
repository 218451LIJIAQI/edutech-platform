import { useEffect, useState, useCallback, useRef } from 'react';
import clientLogger from '@/utils/logger';
import { useParams, Link } from 'react-router-dom';
import { Star, Users, Award, Calendar, BookOpen, AlertCircle, Globe, Briefcase, GraduationCap, ArrowRight, FileText } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import courseService from '@/services/course.service';
import reviewService from '@/services/review.service';
import { TeacherProfile, Course, Review, UserRole } from '@/types';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { useAuthStore } from '@/store/auth-store';
import ReportSubmissionModal from '@/components/common/ReportSubmissionModal';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import { getTeacherDisplayPhoto } from '@/utils/asset-normalizers';
import { getAccessToken, hasRecoverableAuthState } from '@/utils/auth-storage';
import { isProtectedUploadAssetUrl } from '@/utils/protected-assets';
import { resolveBackendAssetUrl } from '@/utils/runtime';
import { normalizeSafeHttpUrl, normalizeSafeInternalPath } from '@/utils/safe-url';
import { usePageTitle } from '@/hooks';

const normalizePublicAssetUrl = (url?: string): string => {
  const safeUrl = normalizeSafeHttpUrl(url) || normalizeSafeInternalPath(url);
  if (!safeUrl || isProtectedUploadAssetUrl(safeUrl)) {
    return '';
  }

  return resolveBackendAssetUrl(safeUrl) || safeUrl;
};

const isPdfCertificateUrl = (url: string): boolean => {
  const pathWithoutQuery = url.trim().split(/[?#]/, 1)[0] ?? '';
  return pathWithoutQuery.toLowerCase().endsWith('.pdf');
};

/**
 * Teacher Profile Page
 * Displays complete teacher information and courses
 */
const TeacherProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const hasAccessToken = Boolean(getAccessToken());
  const hasRecoverableSession = hasRecoverableAuthState();
  const isRestoringSession = hasRecoverableSession && (!hasAccessToken || !user);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [totalCoursesCount, setTotalCoursesCount] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  usePageTitle(
    teacher
      ? `${teacher.user?.firstName ?? ''} ${teacher.user?.lastName ?? ''}`.trim() || 'Teacher Profile'
      : 'Teacher Profile'
  );

  const loadTeacherData = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [teacherData, coursesData, reviewsData] = await Promise.all([
        teacherService.getTeacherById(id),
        courseService.getAllCourses({
          teacherId: id,
        }),
        reviewService.getTeacherReviews(id, { page: 1, limit: 6 }).catch(() => ({
          reviews: [] as Review[],
          pagination: { total: 0, page: 1, limit: 6, totalPages: 1 },
        })),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      const courseItems = coursesData.items || coursesData.courses || [];
      setTeacher(teacherData);
      setCourses(courseItems);
      setTotalCoursesCount(coursesData.pagination?.total ?? courseItems.length);
      setReviews((reviewsData.reviews || []).filter((item) => item.isPublished));
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      clientLogger.error('Failed to fetch teacher data:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to load teacher profile');
      setTeacher(null);
      setCourses([]);
      setTotalCoursesCount(0);
      setLoadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    void loadTeacherData();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadTeacherData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse motion-reduce:animate-none flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping motion-reduce:animate-none"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading teacher profile...</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">{loadError ? 'Unable to load teacher profile' : 'Teacher not found'}</h2>
          <p className="text-gray-600 mb-4">{loadError ?? 'The teacher profile you requested could not be found.'}</p>
          <div className="flex items-center justify-center gap-3">
            {loadError && (
              <button type="button" className="btn-primary" onClick={() => void loadTeacherData()}>
                Retry
              </button>
            )}
            <Link to="/teachers" className="btn-outline">
              Back to Teachers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayPhoto = getTeacherDisplayPhoto(teacher);
  const teacherUser = teacher.user;
  const teacherName =
    [teacherUser?.firstName, teacherUser?.lastName].filter(Boolean).join(' ') || 'Teacher';
  const teacherInitials =
    `${teacherUser?.firstName?.[0] ?? ''}${teacherUser?.lastName?.[0] ?? ''}` || 'T';
  const canReportTeacher =
    user?.role === UserRole.STUDENT && Boolean(teacherUser) && !isRestoringSession;
  const publicCertificatePhotos = Array.isArray(teacher.certificatePhotos)
    ? teacher.certificatePhotos
        .map((photo) => normalizePublicAssetUrl(photo))
        .filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 text-white py-16 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float delay-300"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={teacherName}
                className="w-28 h-28 rounded-2xl object-cover shadow-xl"
              />
            ) : (
            <div className="w-28 h-28 bg-white text-primary-600 rounded-2xl flex items-center justify-center text-4xl font-bold shadow-xl">
              {teacherInitials}
            </div>
            )}

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-4xl font-bold flex-1 text-white">
                  {teacherName}
                </h1>
                {canReportTeacher && (
                  <button
                    type="button"
                    onClick={() => setIsReportOpen(true)}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    title="Report this teacher"
                  >
                    <AlertCircle className="w-5 h-5" />
                    <span className="hidden sm:inline">Report</span>
                  </button>
                )}
                {teacher.isVerified && (
                  <div className="flex items-center space-x-1 bg-gradient-to-r from-green-500 to-green-600 px-4 py-2 rounded-full text-sm font-bold shadow-md">
                    <Award className="w-4 h-4" />
                    <span>Verified</span>
                  </div>
                )}
              </div>

              {teacher.headline && (
                <p className="text-xl text-primary-100 mb-6 font-medium">{teacher.headline}</p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4 text-white">
                <div className="flex items-center space-x-2 bg-white/20 border border-white/25 px-4 py-2 rounded-xl tabular-nums">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-lg">
                    {teacher.averageRating ? teacher.averageRating.toFixed(1) : 'New'}
                  </span>
                </div>

                <div className="flex items-center space-x-2 bg-white/20 border border-white/25 px-4 py-2 rounded-xl tabular-nums">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">{teacher.totalStudents || 0} students</span>
                </div>

                <div className="flex items-center space-x-2 bg-white/20 border border-white/25 px-4 py-2 rounded-xl tabular-nums">
                  <BookOpen className="w-5 h-5" />
                  <span className="font-semibold">
                    {totalCoursesCount} {totalCoursesCount === 1 ? 'course' : 'courses'}
                  </span>
                </div>

                {teacher.hourlyRate != null && teacher.hourlyRate > 0 && (
                  <div className="bg-white/20 border border-white/25 px-4 py-2 rounded-xl font-bold tabular-nums">
                    {formatCurrency(teacher.hourlyRate)}/hr
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {teacher.selfIntroduction && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">About Me</h2>
                <p className="text-gray-700 whitespace-pre-line text-lg leading-relaxed">{teacher.selfIntroduction}</p>
              </div>
            )}

            {teacher.teachingStyle && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Teaching Style</h2>
                <p className="text-gray-700 whitespace-pre-line text-lg leading-relaxed">{teacher.teachingStyle}</p>
              </div>
            )}

            {teacher.educationBackground && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <div className="flex items-center space-x-3 mb-6">
                  <GraduationCap className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Education Background</h2>
                </div>
                <p className="text-gray-700 whitespace-pre-line text-lg leading-relaxed">{teacher.educationBackground}</p>
              </div>
            )}

            {teacher.teachingExperience && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <div className="flex items-center space-x-3 mb-6">
                  <Briefcase className="w-6 h-6 text-primary-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Teaching Experience</h2>
                </div>
                <p className="text-gray-700 whitespace-pre-line text-lg leading-relaxed">{teacher.teachingExperience}</p>
              </div>
            )}

            {teacher.bio && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Bio</h2>
                <p className="text-gray-700 whitespace-pre-line text-lg leading-relaxed">{teacher.bio}</p>
              </div>
            )}

            {/* Courses */}
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Courses by this Teacher</h2>
              {courses.length > 0 ? (
                <div className="space-y-4">
                  {courses.map((course) => (
                    <Link
                      key={course.id}
                      to={`/courses/${course.id}`}
                      className="block p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all border border-gray-200 hover:border-primary-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-2 text-gray-900">{course.title}</h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {course.description}
                          </p>
                          <div className="flex items-center space-x-4">
                            <span className="badge-primary">{course.category}</span>
                            {course.packages && course.packages.length > 0 && (
                              <span className="text-primary-600 font-bold tabular-nums">
                                From {formatCurrency(Math.min(...course.packages.map((p) => p.finalPrice)))}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No courses available yet.</p>
                </div>
              )}
            </div>

            {/* Verified Student Reviews */}
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Student Reviews</h2>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {[review.reviewer?.firstName, review.reviewer?.lastName]
                              .filter(Boolean)
                              .join(' ') || 'Verified Student'}
                          </p>
                          <p className="text-xs text-slate-500 tabular-nums">
                            {review.enrollment?.package?.course?.title
                              ? `${review.enrollment.package.course.title} · `
                              : ''}
                            {formatDate(review.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }, (_, idx) => (
                            <Star
                              key={idx}
                              className={`w-4 h-4 ${
                                idx < review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment?.trim() ? (
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {review.comment.trim()}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
                  No published student reviews yet.
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {teacher.yearsOfExperience != null && teacher.yearsOfExperience > 0 && (
              <div className="card shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                <div className="flex items-center space-x-3 mb-2">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Experience</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600 tabular-nums">
                  {teacher.yearsOfExperience} {teacher.yearsOfExperience === 1 ? 'year' : 'years'}
                </p>
              </div>
            )}

            {Array.isArray(teacher.specialties) && teacher.specialties.length > 0 && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Specialties</h3>
                <div className="flex flex-wrap gap-2">
                  {teacher.specialties.map((specialty: string, idx: number) => (
                    <span key={idx} className="badge-primary">
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(teacher.languages) && teacher.languages.length > 0 && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <div className="flex items-center space-x-3 mb-4">
                  <Globe className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-bold text-gray-900">Languages</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {teacher.languages.map((language: string, idx: number) => (
                    <span key={idx} className="badge-primary">
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(teacher.awards) && teacher.awards.length > 0 && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Awards & Honors</h3>
                <div className="space-y-2">
                  {teacher.awards.map((award: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-2 p-2 bg-yellow-50 rounded">
                      <Award className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{award}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {publicCertificatePhotos.length > 0 && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Certificates</h3>
                <div className="grid grid-cols-2 gap-3">
                  {publicCertificatePhotos.map((photo: string, idx: number) =>
                    isPdfCertificateUrl(photo) ? (
                      <a
                        key={idx}
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-lg border border-slate-200 bg-slate-50 hover:border-primary-400 hover:bg-primary-50/40 transition-colors p-2 text-center"
                      >
                        <FileText className="w-7 h-7 text-primary-600" />
                        <span className="text-xs font-semibold text-slate-700">
                          Certificate {idx + 1} (PDF)
                        </span>
                      </a>
                    ) : (
                      <a
                        key={idx}
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group"
                      >
                        <img
                          src={photo}
                          alt={`Certificate ${idx + 1}`}
                          className="w-full h-24 rounded-lg object-cover group-hover:opacity-75 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-lg">
                          <span className="text-white text-xs font-semibold">View</span>
                        </div>
                      </a>
                    )
                  )}
                </div>
              </div>
            )}

            {teacher.certifications && teacher.certifications.length > 0 && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h3 className="text-xl font-bold mb-6 text-gray-900">Certifications</h3>
                <div className="space-y-4">
                  {teacher.certifications.map((cert) => {
                    const credentialUrl = normalizePublicAssetUrl(cert.credentialUrl);

                    return (
                      <div key={cert.id} className="border-l-4 border-primary-600 pl-4 py-3 bg-gradient-to-r from-primary-50 to-primary-100 rounded-r-xl">
                        <h4 className="font-bold text-gray-900">{cert.title}</h4>
                        <p className="text-sm text-gray-600 font-medium">{cert.issuer}</p>
                        <div className="flex items-center space-x-1 text-sm text-gray-500 mt-2 tabular-nums">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(cert.issueDate)}</span>
                        </div>
                        {credentialUrl && (
                          <a
                            href={credentialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 hover:underline mt-2 inline-flex items-center gap-1 font-semibold"
                          >
                            <span>View Credential</span>
                            <ArrowRight className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200 shadow-lg">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Interested in learning?</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Browse {teacher.user?.firstName || teacherName}&rsquo;s courses and start your learning
                journey today!
              </p>
              <Link to="/courses" className="btn-primary w-full text-center">
                View All Courses
              </Link>
            </div>
          </div>
        </div>
      </div>
      {teacher?.user && (
        <ReportSubmissionModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          reportedId={teacher.user.id}
          reportedName={`${teacher.user.firstName} ${teacher.user.lastName}`}
          contentType="teacher"
        />
      )}
    </div>
  );
};

export default TeacherProfilePage;

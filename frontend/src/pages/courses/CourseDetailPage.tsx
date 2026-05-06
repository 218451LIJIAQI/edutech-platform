import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourseStore } from '@/store/course-store';
import { useAuthStore } from '@/store/auth-store';
import { formatCurrency, formatDuration } from '@/utils/helpers';
import { CourseType, Lesson } from '@/types';
import { BookOpen, Clock, Star, Users, CheckCircle, PlayCircle, Video, Radio, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import UniversalVideoPlayer from '@/components/common/UniversalVideoPlayer';
import ReportSubmissionModal from '@/components/common/ReportSubmissionModal';
import cartService from '@/services/cart.service';
import { extractErrorMessage } from '@/utils/error-handler';
import { useOverlayAccessibility, usePageTitle } from '@/hooks';
import { getAccessToken, hasRecoverableAuthState } from '@/utils/auth-storage';

/**
 * Course Detail Page
 * Displays complete course information with purchase option
 */
const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentCourse, isLoading, fetchCourseById } = useCourseStore();
  const { isAuthenticated, user } = useAuthStore();
  const hasAccessToken = Boolean(getAccessToken());
  const hasRecoverableSession = hasRecoverableAuthState();
  const isSessionReady = Boolean(isAuthenticated && user);
  const isRestoringSession = hasRecoverableSession && (!hasAccessToken || !user);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const previewModalRef = useRef<HTMLDivElement | null>(null);
  const closePreviewButtonRef = useRef<HTMLButtonElement | null>(null);
  usePageTitle(currentCourse ? currentCourse.title : 'Course Details');

  useEffect(() => {
    if (id) {
      fetchCourseById(id);
    }
  }, [id, fetchCourseById]);

  useOverlayAccessibility({
    isOpen: Boolean(previewLesson),
    containerRef: previewModalRef,
    initialFocusRef: closePreviewButtonRef,
    onClose: () => setPreviewLesson(null),
    trapFocus: true,
    lockBodyScroll: true,
  });

  const handleOpenLesson = (lesson: Lesson) => {
    if (currentCourse?.isEnrolled) {
      if (!id) {
        return;
      }
      navigate(`/courses/${id}/learn?lessonId=${encodeURIComponent(lesson.id)}`);
      return;
    }

    if (lesson.isFree && lesson.videoUrl) {
      setPreviewLesson(lesson);
      return;
    }

    if (lesson.isFree) {
      toast.error('Preview video is not available for this lesson yet');
      return;
    }

    if (!currentCourse?.isEnrolled) {
      toast.error('Please select a package to start learning');
      document.getElementById('packages-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
  };

  const handlePurchase = async () => {
    if (isRestoringSession) {
      toast('Restoring your session. Please try again in a moment.');
      return;
    }

    if (!isSessionReady) {
      toast.error('Please login to purchase courses');
      navigate('/login');
      return;
    }

    if (!selectedPackage) {
      toast.error('Please select a package');
      return;
    }

    if (!id) {
      toast.error('Course ID is missing');
      return;
    }

    setIsPurchasing(true);
    try {
      // Redirect to secure checkout page
      navigate(`/courses/${id}/checkout/${selectedPackage}`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to initiate purchase'));
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleAddToCart = async (packageId: string) => {
    if (isRestoringSession) {
      toast('Restoring your session. Please try again in a moment.');
      return;
    }

    if (!isSessionReady) {
      toast.error('Please login to add courses to your cart');
      navigate('/login');
      return;
    }

    try {
      await cartService.addItem(packageId);
      setSelectedPackage(packageId);
      toast.success('Added to cart');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to add to cart'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (!currentCourse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4 text-gray-900">Course not found</h2>
          <p className="text-gray-600 mb-8">The course you're looking for doesn't exist.</p>
          <button type="button" onClick={() => navigate('/courses')} className="btn-primary">
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const teacher = currentCourse.teacherProfile;
  const isEnrolled = currentCourse.isEnrolled;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 text-white py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-float delay-300"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl">
            <div className="flex items-center flex-wrap gap-3 mb-6">
              <span className="badge bg-primary-400 text-white font-semibold">{currentCourse.category}</span>

              {/* Course Type - Platform Feature */}
              {currentCourse.courseType === CourseType.LIVE && (
                <span className="badge bg-red-500 text-white flex items-center gap-1 font-semibold">
                  <Radio className="w-3 h-3" />
                  Live Sessions
                </span>
              )}
              {currentCourse.courseType === CourseType.RECORDED && (
                <span className="badge bg-blue-500 text-white flex items-center gap-1 font-semibold">
                  <Video className="w-3 h-3" />
                  Recorded Course
                </span>
              )}
              {currentCourse.courseType === CourseType.HYBRID && (
                <span className="badge bg-purple-500 text-white flex items-center gap-1 font-semibold">
                  <PlayCircle className="w-3 h-3" />
                  Hybrid (Live + Recorded)
                </span>
              )}

              {isEnrolled && (
                <span className="badge bg-green-500 text-white font-semibold inline-flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Enrolled</span>
                </span>
              )}
            </div>
            <div className="flex items-start justify-between mb-6">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight flex-1">{currentCourse.title}</h1>
              {isSessionReady && user?.role === 'STUDENT' && (
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="ml-4 p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                  title="Report this course"
                >
                  <AlertCircle className="w-5 h-5" />
                  <span className="hidden md:inline">Report</span>
                </button>
              )}
            </div>
            <p className="text-xl text-primary-100 mb-8 leading-relaxed max-w-2xl">{currentCourse.description}</p>

            {/* Teacher Info */}
            <div className="flex items-center space-x-5 pt-6 border-t border-primary-400 border-opacity-30">
              <div className="w-16 h-16 bg-gradient-to-br from-white to-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xl shadow-lg">
                {(teacher?.user?.firstName?.[0] || '')}{(teacher?.user?.lastName?.[0] || '')}
              </div>
              <div>
                <p className="font-bold text-lg">
                  {teacher?.user?.firstName} {teacher?.user?.lastName}
                </p>
                <div className="flex items-center space-x-3 text-sm text-primary-100 mt-1">
                  <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{teacher?.averageRating?.toFixed(1) || 'N/A'}</span>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-100" aria-hidden="true"></span>
                  <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{teacher?.totalStudents || 0} students</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Preview Video */}
            {currentCourse.previewVideoUrl && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h3 className="text-2xl font-bold mb-6 text-gray-900">Course Preview</h3>
                <div className="rounded-xl overflow-hidden shadow-md">
                <UniversalVideoPlayer
                  src={currentCourse.previewVideoUrl}
                  poster={currentCourse.thumbnail}
                  title={currentCourse.title}
                />
                </div>
              </div>
            )}

            {/* Course Content */}
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <h3 className="text-2xl font-bold mb-6 text-gray-900">Course Content</h3>
              {currentCourse.lessons && currentCourse.lessons.length > 0 ? (
                <div className="space-y-3">
                  {currentCourse.lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      onClick={() => handleOpenLesson(lesson)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenLesson(lesson);
                        }
                      }}
                      className={`flex items-center justify-between p-5 rounded-xl border border-gray-200 transition-all duration-300 ${
                        isEnrolled || lesson.isFree
                          ? 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 cursor-pointer hover:shadow-md'
                          : 'bg-gradient-to-r from-gray-50 to-gray-100'
                      }`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{lesson.title}</p>
                          {lesson.description && (
                            <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        {lesson.duration && (
                          <div className="flex items-center space-x-1 text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">{formatDuration(lesson.duration)}</span>
                          </div>
                        )}
                        <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">{lesson.type}</span>
                        {lesson.isFree && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Free Preview</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No lessons available yet.</p>
                </div>
              )}
            </div>

            {/* Learning Materials */}
            {currentCourse.materials && currentCourse.materials.length > 0 && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h3 className="text-2xl font-bold mb-6 text-gray-900">Learning Materials</h3>
                <div className="space-y-3">
                  {currentCourse.materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
                    >
                      <div>
                        <p className="font-bold text-gray-900">{material.title}</p>
                        {material.description && (
                          <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-600 bg-white px-3 py-1 rounded-lg">{material.fileType}</span>
                        {material.isDownloadable && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Packages */}
          <div className="lg:col-span-1">
            <div id="packages-section" className="sticky top-20 space-y-4">
              {currentCourse.packages && currentCourse.packages.length > 0 ? (
                <>
                  {currentCourse.packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`card transition-all duration-300 cursor-pointer ${
                        selectedPackage === pkg.id
                          ? 'ring-2 ring-primary-600 shadow-xl bg-gradient-to-br from-primary-50 to-primary-100'
                          : 'hover:shadow-lg hover:border-primary-200'
                      }`}
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => setSelectedPackage(pkg.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedPackage(pkg.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selectedPackage === pkg.id}
                      >
                        <div className="mb-5">
                          <h4 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h4>
                          {pkg.description && (
                            <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                          )}
                        </div>

                        <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl">
                          <div className="flex items-baseline space-x-2">
                            {pkg.discount && pkg.discount > 0 ? (
                              <>
                                <span className="text-4xl font-bold text-primary-600">
                                  {formatCurrency(pkg.finalPrice)}
                                </span>
                                <span className="text-lg text-gray-400 line-through">
                                  {formatCurrency(pkg.price)}
                                </span>
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold ml-2">-{formatCurrency(pkg.discount)}</span>
                              </>
                            ) : (
                              <span className="text-4xl font-bold text-primary-600">
                                {formatCurrency(pkg.price)}
                              </span>
                            )}
                          </div>
                        </div>

                        {pkg.features && Array.isArray(pkg.features) && (
                          <ul className="space-y-3 mb-6">
                            {pkg.features.map((feature, index) => (
                              <li key={index} className="flex items-start space-x-3 text-sm">
                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700 font-medium">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {pkg.duration && (
                          <p className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">
                            <span className="inline-flex items-center gap-2">
                              <Clock className="w-4 h-4 text-primary-600" />
                              Access for <span className="font-semibold">{pkg.duration} days</span>
                            </span>
                          </p>
                        )}
                      </div>

                      {!isEnrolled && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={() => setSelectedPackage(pkg.id)}
                            className="btn-outline flex-1 text-sm"
                          >
                            Select
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleAddToCart(pkg.id)}
                            disabled={isRestoringSession}
                            className="btn-primary flex-1 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Add to Cart
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {isEnrolled ? (
                    <button
                      type="button"
                      onClick={() => navigate('/student/courses')}
                      className="btn-primary w-full justify-center"
                    >
                      <BookOpen className="w-5 h-5 mr-2" />
                      Go to My Courses
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePurchase}
                      disabled={!selectedPackage || isPurchasing || isRestoringSession}
                      className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPurchasing ? (
                        <>
                          <div className="spinner mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>Purchase Now</>
                      )}
                    </button>
                  )}

                  {isRestoringSession ? (
                    <div className="text-sm text-center text-gray-600 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      Restoring your session. Purchase actions will unlock in a moment.
                    </div>
                  ) : !isSessionReady ? (
                    <div className="text-sm text-center text-gray-600 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      Please{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="text-primary-600 hover:underline font-semibold"
                      >
                        login
                      </button>{' '}
                      to purchase
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="card text-center py-8">
                  <p className="text-gray-600">No packages available yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {previewLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div
            ref={previewModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="free-lesson-preview-title"
            className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase text-green-600">Free Preview</p>
                <h2 id="free-lesson-preview-title" className="mt-1 text-2xl font-bold text-gray-900">
                  {previewLesson.title}
                </h2>
                {previewLesson.description && (
                  <p className="mt-2 max-w-2xl text-sm text-gray-600">{previewLesson.description}</p>
                )}
              </div>
              <button
                ref={closePreviewButtonRef}
                type="button"
                onClick={() => setPreviewLesson(null)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close free preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-6">
              {previewLesson.videoUrl ? (
                <UniversalVideoPlayer
                  src={previewLesson.videoUrl}
                  poster={currentCourse.thumbnail}
                  title={previewLesson.title}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-600">
                  Preview video is not available for this lesson yet.
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  Unlock the full course to access the remaining lessons, quizzes, and materials.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewLesson(null);
                    document.getElementById('packages-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="btn-primary"
                >
                  View Packages
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {currentCourse.teacherProfile?.user && (
        <ReportSubmissionModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          reportedId={currentCourse.teacherProfile.user.id}
          reportedName={`${currentCourse.teacherProfile.user.firstName} ${currentCourse.teacherProfile.user.lastName}`}
          contentType="course"
          contentId={currentCourse.id}
        />
      )}
    </div>
  );
};

export default CourseDetailPage;

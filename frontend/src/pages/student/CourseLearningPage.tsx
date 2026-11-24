import { useCallback, useEffect, useRef, useState } from 'react';
import clientLogger from '@/utils/logger';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Play,
  CheckCircle,
  BookOpen,
  FileText,
  Download,
  ChevronRight,
  Star,
  Clock,
  Radio,
  ExternalLink,
  AlertCircle,
  MessageSquare,
  Video,
} from 'lucide-react';
import { Course, Lesson, Enrollment, LiveSession } from '@/types';
import courseService from '@/services/course.service';
import enrollmentService from '@/services/enrollment.service';
import toast from 'react-hot-toast';
import UniversalVideoPlayer from '@/components/common/UniversalVideoPlayer';
import LessonQuizCard from '@/components/student/LessonQuizCard';
import { extractErrorMessage } from '@/utils/error-handler';
import { formatFileSize } from '@/utils/helpers';
import {
  deriveInitialCompletedLessonIds,
  selectPreferredCourseEnrollment,
  writeStoredCompletedLessonIds,
} from '@/utils/enrollment';
import { useOverlayAccessibility, usePageTitle } from '@/hooks';
import { downloadProtectedAsset } from '@/utils/protected-assets';

const CourseLearningPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [passedQuizLessons, setPassedQuizLessons] = useState<Set<string>>(new Set());
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCompletingLesson, setIsCompletingLesson] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const reviewModalRef = useRef<HTMLDivElement | null>(null);
  const leaveReviewButtonRef = useRef<HTMLButtonElement | null>(null);
  const requestIdRef = useRef(0);
  const requestedLessonId = searchParams.get('lessonId');
  usePageTitle(course ? `Learning ${course.title}` : 'Course Learning');

  useOverlayAccessibility({
    isOpen: showReviewModal,
    containerRef: reviewModalRef,
    initialFocusRef: leaveReviewButtonRef,
    onClose: () => setShowReviewModal(false),
    trapFocus: true,
    lockBodyScroll: true,
  });

  const loadCourseData = useCallback(async () => {
    if (!courseId) {
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);

    try {
      const hasAccess = await enrollmentService.checkAccess(courseId);
      if (requestId !== requestIdRef.current) return;

      if (!hasAccess) {
        toast.error('You need to enroll in this course first');
        navigate(`/courses/${courseId}`);
        return;
      }

      const [courseData, enrollments, quizAttempts, sessions] = await Promise.all([
        courseService.getCourseById(courseId),
        enrollmentService.getMyCourses(),
        courseService.getMyCourseQuizAttempts(courseId),
        courseService.getCourseLiveSessions(courseId).catch(() => [] as LiveSession[]),
      ]);
      if (requestId !== requestIdRef.current) return;

      const currentEnrollment = selectPreferredCourseEnrollment(enrollments, courseId);
      setCourse(courseData);
      setLiveSessions(sessions);

      const passedLessonIds = new Set<string>(
        quizAttempts.filter((attempt) => attempt.passed).map((attempt) => attempt.lessonId)
      );
      setPassedQuizLessons(passedLessonIds);

      const lessons = courseData.lessons || [];
      const derivedCompleted = deriveInitialCompletedLessonIds(
        lessons,
        currentEnrollment,
        passedLessonIds
      );
      setCompletedLessons(derivedCompleted);

      if (currentEnrollment) {
        writeStoredCompletedLessonIds(currentEnrollment.id, derivedCompleted);
        const completedCount = derivedCompleted.size;
        const derivedProgress =
          lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
        const serverIds = currentEnrollment.completedLessonIds ?? [];
        const needsServerIdBackfill =
          completedCount > 0 && serverIds.length !== completedCount;

        if (
          lessons.length > 0 &&
          (needsServerIdBackfill ||
            completedCount !== currentEnrollment.completedLessons ||
            derivedProgress !== currentEnrollment.progress)
        ) {
          try {
            const updatedEnrollment = await enrollmentService.updateProgress(
              currentEnrollment.id,
              Array.from(derivedCompleted),
              derivedProgress
            );
            if (requestId === requestIdRef.current) {
              setEnrollment(updatedEnrollment);
            }
          } catch (syncError) {
            clientLogger.error('Failed to sync recovered course progress:', syncError);
            if (requestId === requestIdRef.current) {
              setEnrollment({
                ...currentEnrollment,
                completedLessonIds: Array.from(derivedCompleted),
                completedLessons: completedCount,
                progress: derivedProgress,
              });
            }
          }
        } else {
          setEnrollment({
            ...currentEnrollment,
            completedLessonIds: Array.from(derivedCompleted),
            completedLessons: completedCount,
            progress: derivedProgress,
          });
        }
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      clientLogger.error('Failed to fetch course data:', error);
      const message = extractErrorMessage(error, 'Failed to load course');
      setLoadError(message);
      toast.error(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [courseId, navigate]);

  useEffect(() => {
    void loadCourseData();
  }, [loadCourseData]);

  useEffect(() => {
    if (!course?.lessons?.length) {
      return;
    }

    const requestedLesson = requestedLessonId
      ? course.lessons.find((lesson) => lesson.id === requestedLessonId)
      : null;
    const nextLesson = requestedLesson ?? course.lessons[0];

    if (!nextLesson) {
      return;
    }

    if (currentLesson?.id !== nextLesson.id) {
      setCurrentLesson(nextLesson);
    }

    if (requestedLessonId !== nextLesson.id) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('lessonId', nextLesson.id);
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [course, currentLesson?.id, requestedLessonId, searchParams, setSearchParams]);

  const handleSelectLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    if (requestedLessonId !== lesson.id) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('lessonId', lesson.id);
      setSearchParams(nextSearchParams, { replace: true });
    }
  };

  const handleLessonComplete = async (bypassQuizGate = false) => {
    if (!currentLesson || !enrollment || isCompletingLesson) return;
    if (completedLessons.has(currentLesson.id)) return;
    if (
      !bypassQuizGate &&
      currentLesson.quiz?.questions?.length &&
      !passedQuizLessons.has(currentLesson.id)
    ) {
      toast.error('Please pass the lesson quiz before marking this lesson complete.');
      return;
    }

    const previousCompleted = new Set(completedLessons);
    const newCompleted = new Set(previousCompleted);
    newCompleted.add(currentLesson.id);
    setCompletedLessons(newCompleted);
    setIsCompletingLesson(true);

    const totalLessons = course?.lessons?.length || 1;
    const progress = Math.round((newCompleted.size / totalLessons) * 100);

    try {
      const updated = await enrollmentService.updateProgress(
        enrollment.id,
        Array.from(newCompleted),
        progress
      );
      writeStoredCompletedLessonIds(enrollment.id, newCompleted);
      setEnrollment(updated);
      toast.success('Lesson completed!');

      if (updated.progress === 100) {
        setShowReviewModal(true);
      }
    } catch (error) {
      clientLogger.error('Failed to update progress:', error);
      setCompletedLessons(previousCompleted);
      toast.error(extractErrorMessage(error, 'Failed to update progress'));
    } finally {
      setIsCompletingLesson(false);
    }
  };

  const handleNextLesson = () => {
    if (!course?.lessons || !currentLesson) return;

    const currentIndex = course.lessons.findIndex((l) => l.id === currentLesson.id);
    if (currentIndex < course.lessons.length - 1) {
      handleSelectLesson(course.lessons[currentIndex + 1]);
      window.scrollTo(0, 0);
    }
  };

  const handlePreviousLesson = () => {
    if (!course?.lessons || !currentLesson) return;

    const currentIndex = course.lessons.findIndex((l) => l.id === currentLesson.id);
    if (currentIndex > 0) {
      handleSelectLesson(course.lessons[currentIndex - 1]);
      window.scrollTo(0, 0);
    }
  };

  const handleMaterialDownload = async (assetUrl: string, materialTitle: string) => {
    try {
      await downloadProtectedAsset(assetUrl, materialTitle);
    } catch (error) {
      clientLogger.error('Failed to download material:', error);
      toast.error(extractErrorMessage(error, 'Failed to download material'));
    }
  };

  const isLessonCompleted = (lessonId: string) => completedLessons.has(lessonId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="text-slate-600 font-medium">Loading course workspace...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 px-4">
        <div className="card max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Unable to load course</h2>
          <p className="text-sm text-slate-600">{loadError}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void loadCourseData()}
              className="btn-primary"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => navigate('/student/courses')}
              className="btn-outline"
            >
              My Courses
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 px-4">
        <div className="card max-w-md w-full text-center space-y-4">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">
            {course && (!course.lessons || course.lessons.length === 0)
              ? 'Curriculum Not Published Yet'
              : 'Course Not Found'}
          </h2>
          <p className="text-slate-600 text-sm">
            {course && (!course.lessons || course.lessons.length === 0)
              ? 'No lessons have been published for this course yet. Check back soon or contact your instructor.'
              : 'We could not locate this course in your active learning library.'}
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/student/courses')}
          >
            Back to My Courses
          </button>
        </div>
      </div>
    );
  }

  const currentLessonHasQuiz = Boolean(currentLesson.quiz?.questions?.length);
  const activeOrUpcomingSessions = liveSessions.filter(
    (s) => s.status === 'ONGOING' || s.status === 'SCHEDULED'
  );
  const recordedLiveSessions = liveSessions.filter(
    (s) => s.status === 'COMPLETED' && Boolean(s.recordingUrl)
  );
  const teacherUserId = course.teacherProfile?.userId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            {currentLesson.videoUrl ? (
              <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200">
                <UniversalVideoPlayer
                  key={currentLesson.id}
                  src={currentLesson.videoUrl}
                  title={currentLesson.title}
                  onComplete={currentLessonHasQuiz ? undefined : () => void handleLessonComplete()}
                  autoPlay={false}
                />
              </div>
            ) : (
              <div className="aspect-video bg-slate-900 flex items-center justify-center rounded-2xl text-white shadow-lg">
                <div className="text-center p-8">
                  <Play className="w-14 h-14 mx-auto mb-3 opacity-60" />
                  <p className="font-semibold">No recorded video attached to this lesson</p>
                  {currentLesson.type !== 'RECORDED' && (
                    <p className="text-sm text-slate-300 mt-1">
                      Check the Live Classroom Sessions panel on the right for live schedules and recordings.
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="card">
              <div className="flex items-start justify-between mb-6 gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold mb-3 text-slate-900">{currentLesson.title}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="badge-primary">{currentLesson.type}</span>
                    {currentLesson.duration && (
                      <span className="text-slate-600 font-medium inline-flex items-center gap-1.5 tabular-nums">
                        <Clock className="w-4 h-4 text-primary-600" />
                        {currentLesson.duration} min
                      </span>
                    )}
                    {isLessonCompleted(currentLesson.id) && (
                      <span className="badge-success">
                        <CheckCircle className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}
                  </div>
                </div>
                {!isLessonCompleted(currentLesson.id) && !currentLessonHasQuiz && (
                  <button
                    type="button"
                    disabled={isCompletingLesson}
                    onClick={() => void handleLessonComplete()}
                    className="btn-primary shrink-0"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isCompletingLesson ? 'Saving...' : 'Mark Complete'}
                  </button>
                )}
              </div>

              {currentLesson.description && (
                <p className="text-slate-700 leading-relaxed text-base">{currentLesson.description}</p>
              )}
              {!isLessonCompleted(currentLesson.id) && currentLessonHasQuiz && (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                  Pass the lesson quiz below to unlock completion for this lesson.
                </div>
              )}
            </div>

            <LessonQuizCard
              lesson={currentLesson}
              isLessonCompleted={isLessonCompleted(currentLesson.id)}
              hasPassedAttempt={passedQuizLessons.has(currentLesson.id)}
              onQuizPassed={async () => {
                setPassedQuizLessons((current) => {
                  const next = new Set(current);
                  next.add(currentLesson.id);
                  return next;
                });
                await handleLessonComplete(true);
              }}
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handlePreviousLesson}
                disabled={
                  !course.lessons ||
                  course.lessons.length === 0 ||
                  course.lessons[0]?.id === currentLesson.id
                }
                className="btn-outline"
              >
                Previous Lesson
              </button>
              <button
                type="button"
                onClick={handleNextLesson}
                disabled={
                  !course.lessons ||
                  course.lessons.length === 0 ||
                  course.lessons[course.lessons.length - 1]?.id === currentLesson.id
                }
                className="btn-primary"
              >
                Next Lesson
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {course.materials && course.materials.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-bold mb-5 flex items-center text-slate-900">
                  <div className="p-2 bg-primary-50 rounded-lg mr-3">
                    <FileText className="w-5 h-5 text-primary-600" />
                  </div>
                  Course Materials
                </h2>
                <div className="space-y-3">
                  {course.materials.map((material) => {
                    const materialAccessUrl = material.accessUrl ?? material.fileUrl;

                    return (
                      <div
                        key={material.id}
                        className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="p-2 bg-primary-50 rounded-lg shrink-0">
                            <FileText className="w-5 h-5 text-primary-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{material.title}</p>
                            {material.description && (
                              <p className="text-sm text-slate-600 mt-0.5">{material.description}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-1 tabular-nums">
                              {material.fileType} &middot; {formatFileSize(material.fileSize)}
                            </p>
                          </div>
                        </div>
                        {material.isDownloadable && materialAccessUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleMaterialDownload(materialAccessUrl, material.title)
                            }
                            className="btn-sm btn-outline shrink-0"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        ) : material.isDownloadable ? (
                          <span className="text-xs font-medium text-amber-700 shrink-0">
                            Download unavailable
                          </span>
                        ) : (
                          <span className="badge-warning shrink-0">
                            View Only (Protected)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="card">
              <h2 className="text-xl font-bold mb-3 text-slate-900">About This Course</h2>
              <p className="text-slate-700 leading-relaxed mb-4">{course.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="badge-primary">{course.category}</span>
                <span className="text-slate-600 font-medium inline-flex items-center gap-1.5 tabular-nums">
                  <BookOpen className="w-4 h-4 text-primary-600" />
                  {course.lessons?.length || 0} lessons
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="card sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain space-y-6">
              <div>
                <h2 className="text-lg font-bold mb-3 text-slate-900">Course Progress</h2>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600 font-medium">Overall Progress</span>
                    <span className="font-bold text-primary-700 tabular-nums">{enrollment?.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary-600 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${enrollment?.progress || 0}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-slate-600 font-medium inline-flex items-center gap-2 tabular-nums">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  {completedLessons.size} of {course.lessons?.length || 0} lessons completed
                </p>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h3 className="font-bold text-base mb-3 flex items-center text-slate-900">
                  <BookOpen className="w-4 h-4 mr-2 text-primary-600" />
                  Curriculum ({course.lessons?.length || 0})
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {course.lessons?.map((lesson, index) => {
                    const active = currentLesson.id === lesson.id;
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => handleSelectLesson(lesson)}
                        aria-current={active ? 'step' : undefined}
                        className={`w-full text-left p-3.5 rounded-xl transition-colors ${
                          active
                            ? 'bg-primary-50 border-2 border-primary-600 shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5">
                            {isLessonCompleted(lesson.id) ? (
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Play className="w-5 h-5 text-primary-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-slate-900">
                              <span className="tabular-nums">{index + 1}.</span> {lesson.title.replace(/^\d+[.)]\s+/, '')}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                              <span className="badge-primary py-0.5 px-2">{lesson.type}</span>
                              {lesson.duration && <span className="tabular-nums">{lesson.duration} min</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h3 className="font-bold text-base mb-3 flex items-center text-slate-900">
                  <Radio className="w-4 h-4 mr-2 text-red-600" />
                  Live Classroom Sessions
                </h3>

                {activeOrUpcomingSessions.length === 0 && recordedLiveSessions.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    No active or upcoming live classroom sessions are scheduled right now.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeOrUpcomingSessions.map((session) => (
                      <div
                        key={session.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={
                              session.status === 'ONGOING' ? 'badge-danger' : 'badge-info'
                            }
                          >
                            {session.status === 'ONGOING' ? 'LIVE NOW' : 'SCHEDULED'}
                          </span>
                          <span className="text-xs text-slate-600 tabular-nums">
                            {session.duration} min
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{session.title}</p>
                        <p className="text-xs text-slate-600 tabular-nums">
                          {new Date(session.scheduledAt).toLocaleString()}
                        </p>
                        <Link
                          to={`/live/${session.id}`}
                          className="btn-primary btn-sm w-full"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {session.status === 'ONGOING'
                            ? 'Join Live Classroom'
                            : 'Open Waiting Room'}
                        </Link>
                      </div>
                    ))}

                    {recordedLiveSessions.map((session) => (
                      <div
                        key={session.id}
                        className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="badge-success">RECORDING READY</span>
                          <span className="text-xs text-slate-600 tabular-nums">
                            {session.duration} min
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{session.title}</p>
                        {session.recordingUrl && (
                          <a
                            href={session.recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-outline btn-sm w-full"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Watch Session Replay
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-5 space-y-2.5">
                <h3 className="font-bold text-base flex items-center text-slate-900">
                  <MessageSquare className="w-4 h-4 mr-2 text-primary-600" />
                  Discussion &amp; Instructor Q&amp;A
                </h3>
                <p className="text-xs text-slate-600">
                  Discuss course concepts with peers in the community or message your instructor directly.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/community" className="btn-secondary btn-sm">
                    Community
                  </Link>
                  <Link
                    to={
                      teacherUserId
                        ? `/messages?contactId=${encodeURIComponent(teacherUserId)}`
                        : '/messages'
                    }
                    className="btn-outline btn-sm"
                  >
                    Message Teacher
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showReviewModal && (
        <div
          className="fixed inset-0 bg-slate-950/55 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowReviewModal(false);
            }
          }}
        >
          <div
            ref={reviewModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-review-modal-title"
            aria-describedby="course-review-modal-description"
            className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-modal"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full mb-4 shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 id="course-review-modal-title" className="text-2xl font-bold mb-2 text-slate-900">
                Course Completed!
              </h3>
              <p id="course-review-modal-description" className="text-slate-600 text-sm">
                You&apos;ve finished every lesson in {course.title}. Share a review to help fellow learners.
              </p>
            </div>
            <div className="space-y-3">
              <button
                ref={leaveReviewButtonRef}
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  navigate(`/courses/${courseId}/review`);
                }}
                className="btn-primary w-full"
              >
                <Star className="w-4 h-4" />
                Leave a Review
              </button>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="btn-secondary w-full"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseLearningPage;

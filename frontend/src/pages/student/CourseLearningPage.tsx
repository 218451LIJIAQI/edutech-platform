import { useEffect, useMemo, useRef, useState } from 'react';
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
  Video,
  ExternalLink,
} from 'lucide-react';
import { Course, Lesson, LiveSession, Enrollment, QuizAttempt } from '@/types';
import courseService from '@/services/course.service';
import enrollmentService from '@/services/enrollment.service';
import toast from 'react-hot-toast';
import UniversalVideoPlayer from '@/components/common/UniversalVideoPlayer';
import LessonQuizCard from '@/components/student/LessonQuizCard';
import { extractErrorMessage } from '@/utils/error-handler';
import { selectPreferredCourseEnrollment } from '@/utils/enrollment';
import { useOverlayAccessibility, usePageTitle } from '@/hooks';
import { downloadProtectedAsset } from '@/utils/protected-assets';

const deriveInitialCompletedLessonIds = (
  courseLessons: Lesson[],
  enrollment: Enrollment | null,
  passedQuizLessonIds: Set<string>
): Set<string> => {
  const validLessonIds = new Set(courseLessons.map((lesson) => lesson.id));
  const completedSet = new Set<string>();

  if (enrollment) {
    if (Array.isArray(enrollment.completedLessonIds)) {
      for (const lessonId of enrollment.completedLessonIds) {
        if (validLessonIds.has(lessonId)) {
          completedSet.add(lessonId);
        }
      }
    } else if (enrollment.completedLessons > 0) {
      const legacyCount = Math.min(
        enrollment.completedLessons,
        courseLessons.length
      );
      for (const lesson of courseLessons.slice(0, legacyCount)) {
        completedSet.add(lesson.id);
      }
    }
  }

  for (const lesson of courseLessons) {
    if (passedQuizLessonIds.has(lesson.id)) {
      completedSet.add(lesson.id);
    }
  }

  return completedSet;
};

const collectCourseLiveSessions = (course: Course | null): LiveSession[] => {
  if (!course) {
    return [];
  }

  if (Array.isArray(course.liveSessions) && course.liveSessions.length > 0) {
    return course.liveSessions;
  }

  const byId = new Map<string, LiveSession>();
  for (const lesson of course.lessons || []) {
    for (const session of lesson.liveSessions || []) {
      byId.set(session.id, {
        ...session,
        lesson:
          session.lesson || {
            id: lesson.id,
            title: lesson.title,
            orderIndex: lesson.orderIndex,
            isFree: lesson.isFree,
            courseId: course.id,
          },
      });
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
};

const CourseLearningPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set()
  );
  const [passedQuizLessons, setPassedQuizLessons] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const reviewModalRef = useRef<HTMLDivElement | null>(null);
  const leaveReviewButtonRef = useRef<HTMLButtonElement | null>(null);
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

  useEffect(() => {
    if (!courseId) {
      return;
    }

    let isActive = true;

    const loadCourseData = async () => {
      setIsLoading(true);
      try {
        const hasAccess = await enrollmentService.checkAccess(courseId);
        if (!hasAccess) {
          toast.error('You need to enroll in this course first');
          navigate(`/courses/${courseId}`);
          return;
        }

        const [courseData, enrollments, quizAttempts] = await Promise.all([
          courseService.getCourseById(courseId),
          enrollmentService.getMyCourses(),
          courseService.getMyCourseQuizAttempts(courseId),
        ]);
        const currentEnrollment = selectPreferredCourseEnrollment(
          enrollments,
          courseId
        );

        if (!isActive) {
          return;
        }

        setCourse(courseData);

        const passedLessonIds = new Set<string>(
          (quizAttempts as QuizAttempt[])
            .filter((attempt) => attempt.passed)
            .map((attempt) => attempt.lessonId)
        );
        setPassedQuizLessons(passedLessonIds);

        const lessonsList = courseData.lessons || [];
        const completedLessonIds = deriveInitialCompletedLessonIds(
          lessonsList,
          currentEnrollment,
          passedLessonIds
        );
        setCompletedLessons(completedLessonIds);

        if (currentEnrollment) {
          const orderedCompletedIds = lessonsList
            .filter((lesson) => completedLessonIds.has(lesson.id))
            .map((lesson) => lesson.id);
          const completedCount = orderedCompletedIds.length;
          const derivedProgress = lessonsList.length
            ? Math.round((completedCount / lessonsList.length) * 100)
            : 0;

          const persistedIds = currentEnrollment.completedLessonIds || [];
          const hasIdSetDiff =
            persistedIds.length !== orderedCompletedIds.length ||
            orderedCompletedIds.some((id) => !persistedIds.includes(id));

          const shouldPersistRecoveredProgress =
            lessonsList.length > 0 &&
            (completedCount !== currentEnrollment.completedLessons ||
              derivedProgress !== currentEnrollment.progress ||
              hasIdSetDiff);

          if (shouldPersistRecoveredProgress) {
            try {
              const updatedEnrollment = await enrollmentService.updateProgress(
                currentEnrollment.id,
                completedCount,
                derivedProgress,
                orderedCompletedIds
              );

              if (!isActive) {
                return;
              }

              setEnrollment(updatedEnrollment);
            } catch (syncError) {
              clientLogger.error(
                'Failed to sync recovered course progress:',
                syncError
              );
              setEnrollment({
                ...currentEnrollment,
                completedLessons: completedCount,
                completedLessonIds: orderedCompletedIds,
                progress: derivedProgress,
              });
            }
          } else {
            setEnrollment({
              ...currentEnrollment,
              completedLessons: completedCount,
              completedLessonIds: orderedCompletedIds,
              progress: derivedProgress,
            });
          }
        }
      } catch (error) {
        if (isActive) {
          clientLogger.error('Failed to fetch course data:', error);
          toast.error(extractErrorMessage(error, 'Failed to load course'));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadCourseData();

    return () => {
      isActive = false;
    };
  }, [courseId, navigate]);

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
    if (!currentLesson || !enrollment) return;
    if (completedLessons.has(currentLesson.id)) return;
    if (
      !bypassQuizGate &&
      currentLesson.quiz?.questions?.length &&
      !passedQuizLessons.has(currentLesson.id)
    ) {
      toast.error(
        'Please pass the lesson quiz before marking this lesson complete.'
      );
      return;
    }

    const previousCompleted = new Set(completedLessons);
    const newCompleted = new Set(previousCompleted);
    newCompleted.add(currentLesson.id);
    setCompletedLessons(newCompleted);

    const lessonsList = course?.lessons || [];
    const orderedCompletedIds = lessonsList.length
      ? lessonsList
          .filter((lesson) => newCompleted.has(lesson.id))
          .map((lesson) => lesson.id)
      : Array.from(newCompleted);
    const totalLessons = lessonsList.length || 1;
    const progress = Math.round((orderedCompletedIds.length / totalLessons) * 100);

    try {
      const updatedEnrollment = await enrollmentService.updateProgress(
        enrollment.id,
        orderedCompletedIds.length,
        progress,
        orderedCompletedIds
      );
      setEnrollment(updatedEnrollment);
      if (Array.isArray(updatedEnrollment.completedLessonIds)) {
        setCompletedLessons(new Set(updatedEnrollment.completedLessonIds));
      }
      toast.success('Lesson completed!');

      if (updatedEnrollment.progress === 100) {
        setShowReviewModal(true);
      }
    } catch (error) {
      clientLogger.error('Failed to update progress:', error);
      setCompletedLessons(previousCompleted);
      toast.error(extractErrorMessage(error, 'Failed to update progress'));
    }
  };

  const handleNextLesson = () => {
    if (!course?.lessons || !currentLesson) return;

    const currentIndex = course.lessons.findIndex(
      (l) => l.id === currentLesson.id
    );
    if (currentIndex < course.lessons.length - 1) {
      handleSelectLesson(course.lessons[currentIndex + 1]);
      window.scrollTo(0, 0);
    }
  };

  const handlePreviousLesson = () => {
    if (!course?.lessons || !currentLesson) return;

    const currentIndex = course.lessons.findIndex(
      (l) => l.id === currentLesson.id
    );
    if (currentIndex > 0) {
      handleSelectLesson(course.lessons[currentIndex - 1]);
      window.scrollTo(0, 0);
    }
  };

  const handleMaterialDownload = async (
    assetUrl: string,
    materialTitle: string
  ) => {
    try {
      await downloadProtectedAsset(assetUrl, materialTitle);
    } catch (error) {
      clientLogger.error('Failed to download material:', error);
      toast.error(extractErrorMessage(error, 'Failed to download material'));
    }
  };

  const isLessonCompleted = (lessonId: string) => {
    return completedLessons.has(lessonId);
  };

  const allLiveSessions = useMemo(
    () => collectCourseLiveSessions(course),
    [course]
  );

  const currentLessonLiveSessions = useMemo(
    () =>
      currentLesson
        ? allLiveSessions.filter(
            (session) => session.lessonId === currentLesson.id
          )
        : [],
    [allLiveSessions, currentLesson]
  );

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
          <p className="text-gray-600 font-medium">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Course not found</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/courses')}
          >
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  const currentLessonHasQuiz = !!currentLesson.quiz?.questions?.length;
  const activeLessonLiveSession = currentLessonLiveSessions.find(
    (session) =>
      session.status === 'ONGOING' || session.status === 'SCHEDULED'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative">
        <div className="max-w-5xl mx-auto">
          {currentLesson.videoUrl ? (
            <div className="rounded-xl overflow-hidden shadow-xl">
              <UniversalVideoPlayer
                key={currentLesson.id}
                src={currentLesson.videoUrl}
                title={currentLesson.title}
                onComplete={
                  currentLessonHasQuiz
                    ? undefined
                    : () => void handleLessonComplete(false)
                }
                autoPlay={false}
              />
            </div>
          ) : activeLessonLiveSession ? (
            <div className="aspect-video bg-gradient-to-br from-slate-900 via-gray-900 to-indigo-950 flex items-center justify-center rounded-xl text-white shadow-xl">
              <div className="text-center p-8 max-w-lg">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Radio className="w-8 h-8 text-white" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2">
                  {activeLessonLiveSession.status === 'ONGOING'
                    ? 'Live Classroom In Progress'
                    : 'Scheduled Live Classroom'}
                </p>
                <h2 className="text-2xl font-bold mb-2">
                  {activeLessonLiveSession.title}
                </h2>
                <p className="text-sm text-gray-300 mb-6">
                  Scheduled for{' '}
                  {new Date(
                    activeLessonLiveSession.scheduledAt
                  ).toLocaleString()}
                </p>
                <Link
                  to={`/live/${activeLessonLiveSession.id}`}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Radio className="w-4 h-4" />
                  {activeLessonLiveSession.status === 'ONGOING'
                    ? 'Join Live Classroom Now'
                    : 'Enter Live Waiting Room'}
                </Link>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-gray-900 flex items-center justify-center rounded-xl text-white">
              <div className="text-center p-8">
                <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No video available for this lesson</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-3 text-gray-900">
                    {currentLesson.title}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="badge-primary">{currentLesson.type}</span>
                    {currentLesson.duration && (
                      <span className="text-gray-600 font-medium inline-flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary-600" />
                        {currentLesson.duration} minutes
                      </span>
                    )}
                  </div>
                </div>
                {!isLessonCompleted(currentLesson.id) && !currentLessonHasQuiz && (
                  <button
                    type="button"
                    onClick={() => void handleLessonComplete(false)}
                    className="btn-primary"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </button>
                )}
              </div>

              {currentLesson.description && (
                <p className="text-gray-700 leading-relaxed text-lg">
                  {currentLesson.description}
                </p>
              )}
              {!isLessonCompleted(currentLesson.id) && currentLessonHasQuiz && (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                  Pass the quiz below to complete this lesson.
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
                className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous Lesson
              </button>
              <button
                type="button"
                onClick={handleNextLesson}
                disabled={
                  !course.lessons ||
                  course.lessons.length === 0 ||
                  course.lessons[course.lessons.length - 1]?.id ===
                    currentLesson.id
                }
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Lesson
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            </div>

            {course.materials && course.materials.length > 0 && (
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3">
                    <FileText className="w-5 h-5 text-primary-600" />
                  </div>
                  Course Materials
                </h2>
                <div className="space-y-3">
                  {course.materials.map((material) => {
                    const materialAccessUrl =
                      material.accessUrl ?? material.fileUrl;

                    return (
                      <div
                        key={material.id}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-primary-100 rounded-lg">
                            <FileText className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">
                              {material.title}
                            </p>
                            {material.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {material.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {material.fileType} |{' '}
                              {(material.fileSize / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>
                        {material.isDownloadable && materialAccessUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleMaterialDownload(
                                materialAccessUrl,
                                material.title
                              )
                            }
                            className="btn-sm btn-outline"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </button>
                        ) : material.isDownloadable ? (
                          <span className="text-xs font-medium text-amber-700">
                            Download unavailable
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">
                About This Course
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4 text-lg">
                {course.description}
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <span className="badge-primary">{course.category}</span>
                <span className="text-gray-600 font-medium inline-flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary-600" />
                  {course.lessons?.length || 0} lessons
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="card sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain shadow-lg">
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900">
                  Course Progress
                </h2>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium">
                      Overall Progress
                    </span>
                    <span className="font-bold text-primary-600">
                      {enrollment?.progress || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-primary-600 to-primary-700 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${enrollment?.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 font-medium inline-flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  {completedLessons.size} of {course.lessons?.length || 0}{' '}
                  lessons completed
                </p>
              </div>

              <hr className="my-6 border-gray-200" />

              <h3 className="font-bold text-lg mb-4 flex items-center text-gray-900">
                <BookOpen className="w-5 h-5 mr-2 text-primary-600" />
                Course Content
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {course.lessons?.map((lesson, index) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => handleSelectLesson(lesson)}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      currentLesson.id === lesson.id
                        ? 'bg-gradient-to-r from-primary-100 to-primary-50 border-2 border-primary-500 shadow-md'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {isLessonCompleted(lesson.id) ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Play className="w-5 h-5 text-primary-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-gray-900">
                          {index + 1}. {lesson.title}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                          <span className="badge-primary text-xs">
                            {lesson.type}
                          </span>
                          {lesson.duration && <span>{lesson.duration} min</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <hr className="my-6 border-gray-200" />

              <h3 className="font-bold text-lg mb-4 flex items-center text-gray-900">
                <Radio className="w-5 h-5 mr-2 text-red-600" />
                Live Classroom Sessions
              </h3>

              {allLiveSessions.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  No live classroom sessions are scheduled for this course yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {allLiveSessions.map((session) => {
                    const isCurrentLessonSession =
                      session.lessonId === currentLesson.id;
                    const canJoinRoom =
                      session.status === 'ONGOING' ||
                      session.status === 'SCHEDULED';

                    return (
                      <div
                        key={session.id}
                        className={`rounded-xl border p-3.5 transition-all ${
                          isCurrentLessonSession
                            ? 'border-primary-300 bg-primary-50/50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              session.status === 'ONGOING'
                                ? 'bg-red-100 text-red-700'
                                : session.status === 'SCHEDULED'
                                ? 'bg-blue-100 text-blue-700'
                                : session.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {session.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(session.scheduledAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {session.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(session.scheduledAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {session.duration ? ` • ${session.duration} min` : ''}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {canJoinRoom ? (
                            <Link
                              to={`/live/${session.id}`}
                              className="btn-primary btn-sm inline-flex items-center gap-1.5 text-xs"
                            >
                              <Radio className="w-3.5 h-3.5" />
                              {session.status === 'ONGOING'
                                ? 'Join Live'
                                : 'Open Room'}
                            </Link>
                          ) : session.status === 'COMPLETED' ? (
                            <Link
                              to={`/live/${session.id}`}
                              className="btn-outline btn-sm inline-flex items-center gap-1.5 text-xs"
                            >
                              <Video className="w-3.5 h-3.5" />
                              Session Details
                            </Link>
                          ) : null}

                          {session.status === 'ONGOING' &&
                          session.meetingUrl ? (
                            <a
                              href={session.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-outline btn-sm inline-flex items-center gap-1 text-xs"
                            >
                              Meeting Link
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div
            ref={reviewModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-review-modal-title"
            aria-describedby="course-review-modal-description"
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg-custom"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4 shadow-lg">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3
                id="course-review-modal-title"
                className="text-3xl font-bold mb-2 text-gray-900"
              >
                Congratulations!
              </h3>
              <p id="course-review-modal-description" className="text-gray-600">
                You've completed this course!
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
                <Star className="w-4 h-4 mr-2" />
                Leave a Review
              </button>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="btn-outline w-full"
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

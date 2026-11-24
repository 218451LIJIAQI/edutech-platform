import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import clientLogger from '@/utils/logger';
import LessonModal from '@/components/teacher/LessonModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import courseService from '@/services/course.service';
import notificationService from '@/services/notification.service';
import { extractErrorMessage } from '@/utils/error-handler';
import { LessonType } from '@/types';
import type { Course, QuizAttempt } from '@/types';
import CourseManagementHeader from '@/features/course-management/header';
import CourseManagementStatsGrid from '@/features/course-management/stats-grid';
import CourseManagementTabsNav from '@/features/course-management/tabs-nav';
import CourseManagementOverviewTab from '@/features/course-management/overview-tab';
import CourseManagementLiveTab from '@/features/course-management/live-tab';
import CourseManagementNotificationsTab from '@/features/course-management/notifications-tab';
import CourseManagementMaterialsTab from '@/features/course-management/materials-tab';
import CourseManagementRecordingsTab from '@/features/course-management/recordings-tab';
import CourseManagementQuizResultsTab from '@/features/course-management/quiz-results-tab';
import { buildQuizMetrics } from '@/features/course-management/helpers';
import { usePageTitle } from '@/hooks';
import type {
  CourseManagementTabId,
  NotificationDispatchSummary,
  NotificationDraft,
  RecordingPendingDelete,
} from '@/features/course-management/types';

/**
 * Course Management Page
 * Detailed course management with live teaching, notifications, and materials
 */
const CourseManagementPage = () => {
  usePageTitle('Course Management');
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] =
    useState<CourseManagementTabId>('overview');
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [notificationDraft, setNotificationDraft] = useState<NotificationDraft>({
    title: '',
    message: '',
  });
  const [lastNotificationDispatch, setLastNotificationDispatch] =
    useState<NotificationDispatchSummary | null>(null);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [editingRecordingId, setEditingRecordingId] = useState<
    string | undefined
  >(undefined);
  const [recordingDefaultVideoType] = useState<'upload' | 'link'>('upload');
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [recordingPendingDelete, setRecordingPendingDelete] =
    useState<RecordingPendingDelete | null>(null);

  const fetchCourse = useCallback(async () => {
    if (!courseId) {
      toast.error('Course ID is missing');
      navigate('/teacher/courses');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [data, attempts, teacherCourses] = await Promise.all([
        courseService.getCourseById(courseId),
        courseService.getCourseQuizAttempts(courseId),
        courseService.getMyCourses(),
      ]);
      const teacherCourseStats = teacherCourses.find(
        (teacherCourse) => teacherCourse.id === data.id
      );
      setCourse({
        ...data,
        _count: {
          ...data._count,
          ...teacherCourseStats?._count,
        },
      });
      setQuizAttempts(attempts);
    } catch (err) {
      const errorMessage = extractErrorMessage(err, 'Failed to load course');
      clientLogger.error('Failed to fetch course:', err);
      setCourse(null);
      setQuizAttempts([]);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, navigate]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const handleSendNotification = async () => {
    if (!courseId) {
      toast.error('Course ID is missing');
      return;
    }

    if (
      !notificationDraft.title.trim() ||
      !notificationDraft.message.trim()
    ) {
      toast.error('Please fill in all notification fields');
      return;
    }

    setIsSendingNotification(true);

    try {
      const title = notificationDraft.title.trim();
      const message = notificationDraft.message.trim();
      const result = await notificationService.sendCourseNotification(courseId, {
        title,
        message,
        type: 'COURSE_ANNOUNCEMENT',
      });

      setLastNotificationDispatch({
        title,
        message,
        recipients: result.recipients,
        sentAt: new Date().toISOString(),
      });

      if (result.recipients === 0) {
        toast.success(
          'No active enrolled students were eligible to receive this notification.'
        );
        return;
      }

      toast.success(
        `Notification sent to ${result.recipients} enrolled student${result.recipients === 1 ? '' : 's'}.`
      );
      setNotificationDraft({
        title: '',
        message: '',
      });
    } catch (err) {
      clientLogger.error('Failed to send notification:', err);
      toast.error(extractErrorMessage(err, 'Failed to send notification'));
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleDeleteRecording = async () => {
    if (!recordingPendingDelete) {
      return;
    }

    setDeletingLessonId(recordingPendingDelete.id);

    try {
      await courseService.deleteLesson(recordingPendingDelete.id);
      toast.success('Recording deleted');
      await fetchCourse();
      setRecordingPendingDelete(null);
    } catch (err) {
      clientLogger.error('Failed to delete recording:', err);
      toast.error(extractErrorMessage(err, 'Failed to delete recording'));
    } finally {
      setDeletingLessonId(null);
    }
  };

  const handleNotificationTitleChange = (title: string) => {
    setNotificationDraft((currentDraft) => ({
      ...currentDraft,
      title,
    }));
  };

  const handleNotificationMessageChange = (message: string) => {
    setNotificationDraft((currentDraft) => ({
      ...currentDraft,
      message,
    }));
  };

  const handleOpenRecordingModal = () => {
    setEditingRecordingId(undefined);
    setShowRecordingModal(true);
  };

  const handleEditRecording = (lessonId: string) => {
    setEditingRecordingId(lessonId);
    setShowRecordingModal(true);
  };

  const handleRequestRecordingDelete = (lessonId: string, title: string) => {
    setRecordingPendingDelete({
      id: lessonId,
      title,
    });
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

  if (!courseId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Course ID is missing
          </h1>
          <Link to="/teacher/courses" className="btn-primary">
            Back to My Courses
          </Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error ? 'Unable to load course details' : 'Course not found'}
          </h1>
          {error ? <p className="text-red-600 mb-4">{error}</p> : null}
          <div className="flex items-center justify-center gap-3">
            {error ? (
              <button type="button" onClick={fetchCourse} className="btn-primary">
                Retry
              </button>
            ) : null}
            <Link to="/teacher/courses" className="btn-outline">
              Back to My Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const quizMetrics = buildQuizMetrics(course, quizAttempts);
  const recordedLessons = (course.lessons || []).filter(
    (lesson) => lesson.type === LessonType.RECORDED
  );
  const activeLesson =
    editingRecordingId && course.lessons
      ? course.lessons.find((lesson) => lesson.id === editingRecordingId)
      : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <CourseManagementHeader
          course={course}
          courseId={courseId}
          onBack={() => navigate('/teacher/courses')}
        />

        <CourseManagementStatsGrid course={course} />

        <div className="card mb-8">
          <CourseManagementTabsNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <div className="p-6">
            {activeTab === 'overview' ? (
              <CourseManagementOverviewTab course={course} courseId={courseId} />
            ) : null}

            {activeTab === 'live' ? (
              <CourseManagementLiveTab course={course} />
            ) : null}

            {activeTab === 'notifications' ? (
              <CourseManagementNotificationsTab
                title={notificationDraft.title}
                message={notificationDraft.message}
                isSending={isSendingNotification}
                onTitleChange={handleNotificationTitleChange}
                onMessageChange={handleNotificationMessageChange}
                onSend={handleSendNotification}
                lastDispatch={lastNotificationDispatch}
              />
            ) : null}

            {activeTab === 'materials' ? (
              <CourseManagementMaterialsTab materials={course.materials || []} />
            ) : null}

            {activeTab === 'recordings' ? (
              <CourseManagementRecordingsTab
                lessons={recordedLessons}
                deletingLessonId={deletingLessonId}
                onAddRecording={handleOpenRecordingModal}
                onEditRecording={handleEditRecording}
                onRequestDelete={handleRequestRecordingDelete}
              />
            ) : null}

            {activeTab === 'quizzes' ? (
              <CourseManagementQuizResultsTab
                metrics={quizMetrics}
                quizAttempts={quizAttempts}
              />
            ) : null}
          </div>
        </div>

        {showRecordingModal ? (
          <LessonModal
            courseId={courseId}
            lessonId={editingRecordingId}
            initialLesson={activeLesson}
            defaultVideoType={recordingDefaultVideoType}
            onClose={() => {
              setShowRecordingModal(false);
              setEditingRecordingId(undefined);
            }}
            onSuccess={fetchCourse}
          />
        ) : null}

        <ConfirmationModal
          isOpen={Boolean(recordingPendingDelete)}
          title="Delete recording"
          description={
            recordingPendingDelete
              ? `Permanently delete "${recordingPendingDelete.title}". This action cannot be undone.`
              : ''
          }
          confirmLabel="Delete Recording"
          tone="danger"
          isLoading={Boolean(
            recordingPendingDelete &&
              deletingLessonId === recordingPendingDelete.id
          )}
          onClose={() => {
            if (!deletingLessonId) {
              setRecordingPendingDelete(null);
            }
          }}
          onConfirm={handleDeleteRecording}
        />
      </div>
    </div>
  );
};

export default CourseManagementPage;

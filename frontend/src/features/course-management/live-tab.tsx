import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio,
  Clock3,
  Lock,
  Plus,
  Play,
  Square,
  Trash2,
  Edit3,
  ExternalLink,
  Video,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clientLogger from '@/utils/logger';
import courseService from '@/services/course.service';
import { extractErrorMessage } from '@/utils/error-handler';
import { useOverlayAccessibility } from '@/hooks';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { LessonType } from '@/types';
import type { Course, Lesson, LiveSession } from '@/types';

interface CourseManagementLiveTabProps {
  course: Course;
  onRefresh?: () => Promise<void> | void;
}

interface SessionFormState {
  lessonId: string;
  title: string;
  description: string;
  scheduledAt: string;
  duration: string;
  maxParticipants: string;
  meetingUrl: string;
  recordingUrl: string;
}

const getLiveLessonLabel = (type: LessonType) => {
  switch (type) {
    case LessonType.HYBRID:
      return 'Hybrid';
    case LessonType.LIVE:
    default:
      return 'Live';
  }
};

const getSessionStatusBadge = (status: LiveSession['status']) => {
  switch (status) {
    case 'ONGOING':
      return 'bg-red-100 text-red-700 border border-red-200';
    case 'SCHEDULED':
      return 'bg-blue-100 text-blue-700 border border-blue-200';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'CANCELLED':
      return 'bg-gray-200 text-gray-700 border border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const toDateTimeLocalInput = (isoValue?: string): string => {
  const date = isoValue ? new Date(isoValue) : new Date(Date.now() + 3600_000);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

export default function CourseManagementLiveTab({
  course,
  onRefresh,
}: CourseManagementLiveTabProps) {
  const lessons = course.lessons || [];
  const liveLessons = lessons.filter(
    (lesson) =>
      lesson.type === LessonType.LIVE || lesson.type === LessonType.HYBRID
  );

  const [sessions, setSessions] = useState<LiveSession[]>(
    () => course.liveSessions || []
  );
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<LiveSession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSessionId, setActionSessionId] = useState<string | null>(null);
  const [endingSession, setEndingSession] = useState<LiveSession | null>(null);
  const [endRecordingUrl, setEndRecordingUrl] = useState('');
  const [sessionPendingDelete, setSessionPendingDelete] =
    useState<LiveSession | null>(null);

  const [formState, setFormState] = useState<SessionFormState>({
    lessonId: liveLessons[0]?.id || '',
    title: '',
    description: '',
    scheduledAt: toDateTimeLocalInput(),
    duration: '60',
    maxParticipants: '100',
    meetingUrl: '',
    recordingUrl: '',
  });

  const modalRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const endModalRef = useRef<HTMLDivElement | null>(null);
  const endRecordingInputRef = useRef<HTMLInputElement | null>(null);

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const list = await courseService.getCourseLiveSessions(course.id);
      setSessions(list);
    } catch (error) {
      clientLogger.error('Failed to load live sessions:', error);
      toast.error(extractErrorMessage(error, 'Failed to load live sessions'));
    } finally {
      setIsLoadingSessions(false);
    }
  }, [course.id]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const closeSessionModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingSession(null);
  }, [isSubmitting]);

  const closeEndModal = useCallback(() => {
    if (actionSessionId) return;
    setEndingSession(null);
    setEndRecordingUrl('');
  }, [actionSessionId]);

  useOverlayAccessibility({
    isOpen: isModalOpen,
    containerRef: modalRef,
    initialFocusRef: titleInputRef,
    onClose: closeSessionModal,
    trapFocus: true,
    lockBodyScroll: true,
  });

  useOverlayAccessibility({
    isOpen: Boolean(endingSession),
    containerRef: endModalRef,
    initialFocusRef: endRecordingInputRef,
    onClose: closeEndModal,
    trapFocus: true,
    lockBodyScroll: true,
  });

  const openScheduleModal = (lesson?: Lesson) => {
    const defaultLesson = lesson || liveLessons[0];
    if (!defaultLesson) {
      toast.error('Add at least one Live or Hybrid lesson first');
      return;
    }

    setEditingSession(null);
    setFormState({
      lessonId: defaultLesson.id,
      title: `${defaultLesson.title} - Live Session`,
      description: defaultLesson.description || '',
      scheduledAt: toDateTimeLocalInput(),
      duration: String(defaultLesson.duration || 60),
      maxParticipants: '100',
      meetingUrl: '',
      recordingUrl: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (session: LiveSession) => {
    setEditingSession(session);
    setFormState({
      lessonId: session.lessonId,
      title: session.title,
      description: session.description || '',
      scheduledAt: toDateTimeLocalInput(session.scheduledAt),
      duration: session.duration ? String(session.duration) : '',
      maxParticipants: session.maxParticipants
        ? String(session.maxParticipants)
        : '',
      meetingUrl: session.meetingUrl || '',
      recordingUrl: session.recordingUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedTitle = formState.title.trim();
    if (!trimmedTitle) {
      toast.error('Session title is required');
      return;
    }

    if (!formState.scheduledAt) {
      toast.error('Scheduled date and time are required');
      return;
    }

    const parsedSchedule = new Date(formState.scheduledAt);
    if (Number.isNaN(parsedSchedule.getTime())) {
      toast.error('Please enter a valid scheduled date and time');
      return;
    }

    const parsedDuration = formState.duration.trim()
      ? Number.parseInt(formState.duration, 10)
      : undefined;
    if (
      parsedDuration !== undefined &&
      (!Number.isFinite(parsedDuration) || parsedDuration < 1)
    ) {
      toast.error('Duration must be at least 1 minute');
      return;
    }

    const parsedMaxParticipants = formState.maxParticipants.trim()
      ? Number.parseInt(formState.maxParticipants, 10)
      : undefined;
    if (
      parsedMaxParticipants !== undefined &&
      (!Number.isFinite(parsedMaxParticipants) || parsedMaxParticipants < 1)
    ) {
      toast.error('Max participants must be at least 1');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSession) {
        await courseService.updateLiveSession(editingSession.id, {
          title: trimmedTitle,
          description: formState.description.trim() || null,
          scheduledAt: parsedSchedule.toISOString(),
          duration: parsedDuration ?? null,
          maxParticipants: parsedMaxParticipants ?? null,
          meetingUrl: formState.meetingUrl.trim() || null,
          recordingUrl: formState.recordingUrl.trim() || null,
        });
        toast.success('Live session updated');
      } else {
        if (!formState.lessonId) {
          toast.error('Please select a live or hybrid lesson');
          setIsSubmitting(false);
          return;
        }
        await courseService.createLiveSession(formState.lessonId, {
          title: trimmedTitle,
          description: formState.description.trim() || undefined,
          scheduledAt: parsedSchedule.toISOString(),
          duration: parsedDuration,
          maxParticipants: parsedMaxParticipants,
          meetingUrl: formState.meetingUrl.trim() || null,
        });
        toast.success('Live session scheduled');
      }

      setIsModalOpen(false);
      setEditingSession(null);
      await loadSessions();
      await onRefresh?.();
    } catch (error) {
      clientLogger.error('Failed to save live session:', error);
      toast.error(extractErrorMessage(error, 'Failed to save live session'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartSession = async (session: LiveSession) => {
    setActionSessionId(session.id);
    try {
      await courseService.startLiveSession(session.id);
      toast.success('Live session started');
      await loadSessions();
      await onRefresh?.();
    } catch (error) {
      clientLogger.error('Failed to start live session:', error);
      toast.error(extractErrorMessage(error, 'Failed to start live session'));
    } finally {
      setActionSessionId(null);
    }
  };

  const handleConfirmEndSession = async () => {
    if (!endingSession) return;
    setActionSessionId(endingSession.id);
    try {
      await courseService.endLiveSession(
        endingSession.id,
        endRecordingUrl.trim() ? endRecordingUrl.trim() : undefined
      );
      toast.success('Live session completed');
      setEndingSession(null);
      setEndRecordingUrl('');
      await loadSessions();
      await onRefresh?.();
    } catch (error) {
      clientLogger.error('Failed to end live session:', error);
      toast.error(extractErrorMessage(error, 'Failed to end live session'));
    } finally {
      setActionSessionId(null);
    }
  };

  const handleCancelSession = async (session: LiveSession) => {
    setActionSessionId(session.id);
    try {
      await courseService.updateLiveSession(session.id, {
        status: 'CANCELLED',
      });
      toast.success('Live session cancelled');
      await loadSessions();
      await onRefresh?.();
    } catch (error) {
      clientLogger.error('Failed to cancel live session:', error);
      toast.error(extractErrorMessage(error, 'Failed to cancel live session'));
    } finally {
      setActionSessionId(null);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionPendingDelete) return;
    setActionSessionId(sessionPendingDelete.id);
    try {
      await courseService.deleteLiveSession(sessionPendingDelete.id);
      toast.success('Live session deleted');
      setSessionPendingDelete(null);
      await loadSessions();
      await onRefresh?.();
    } catch (error) {
      clientLogger.error('Failed to delete live session:', error);
      toast.error(extractErrorMessage(error, 'Failed to delete live session'));
    } finally {
      setActionSessionId(null);
    }
  };

  const totalLiveMinutes = liveLessons.reduce(
    (sum, lesson) => sum + (lesson.duration || 0),
    0
  );
  const ongoingCount = sessions.filter(
    (session) => session.status === 'ONGOING'
  ).length;

  const readinessState =
    course.courseType === 'RECORDED' && liveLessons.length === 0
      ? 'This course is recorded-only, so live room controls stay inactive until you add a live or hybrid lesson.'
      : liveLessons.length > 0
      ? 'Schedule runtime live sessions on your live or hybrid lessons below, then start or end sessions and join the real-time classroom.'
      : 'This course is marked for live-capable delivery, but there are no live or hybrid lessons configured yet.';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 p-6 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start space-x-4">
          <Radio className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-red-900 mb-2">
              Live Classroom Control Center
            </h3>
            <p className="text-red-800">{readinessState}</p>
          </div>
        </div>
        {liveLessons.length > 0 ? (
          <button
            type="button"
            onClick={() => openScheduleModal()}
            className="btn-primary inline-flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Schedule Live Session
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm font-medium text-gray-500">Live-capable lessons</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {liveLessons.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm font-medium text-gray-500">Scheduled & past sessions</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {sessions.length}
          </p>
          {ongoingCount > 0 ? (
            <p className="mt-1 text-xs font-semibold text-red-600">
              {ongoingCount} live right now
            </p>
          ) : null}
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm font-medium text-gray-500">Planned live minutes</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalLiveMinutes}
          </p>
        </div>
      </div>

      {/* Scheduled Runtime Sessions */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-gray-900">Live Classroom Sessions</h4>
          {isLoadingSessions ? (
            <span className="text-xs text-gray-500">Refreshing...</span>
          ) : null}
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-gray-600">
            {liveLessons.length === 0
              ? 'Add at least one Live or Hybrid lesson in the course editor to start scheduling live sessions.'
              : 'No live classroom sessions have been scheduled yet. Click "Schedule Live Session" to create one.'}
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const isBusy = actionSessionId === session.id;
              return (
                <div
                  key={session.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSessionStatusBadge(
                            session.status
                          )}`}
                        >
                          {session.status}
                        </span>
                        {session.lesson ? (
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                            Lesson {session.lesson.orderIndex ?? '-'}: {session.lesson.title}
                          </span>
                        ) : null}
                        {session.duration ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <Clock3 className="w-3.5 h-3.5" />
                            {session.duration} min
                          </span>
                        ) : null}
                        {session.maxParticipants ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <Users className="w-3.5 h-3.5" />
                            Cap: {session.maxParticipants} students
                          </span>
                        ) : null}
                      </div>

                      <h5 className="text-lg font-bold text-gray-900">
                        {session.title}
                      </h5>
                      {session.description ? (
                        <p className="text-sm text-gray-600">{session.description}</p>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span>
                          Scheduled: {new Date(session.scheduledAt).toLocaleString()}
                        </span>
                        {session.startedAt ? (
                          <span>
                            Started: {new Date(session.startedAt).toLocaleString()}
                          </span>
                        ) : null}
                        {session.endedAt ? (
                          <span>
                            Ended: {new Date(session.endedAt).toLocaleString()}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {session.meetingUrl ? (
                          <a
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline"
                          >
                            External Meeting URL
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : null}
                        {session.recordingUrl ? (
                          <a
                            href={session.recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Session Recording
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Link
                        to={`/live/${session.id}`}
                        className="btn-outline btn-sm inline-flex items-center gap-1.5"
                      >
                        <Radio className="w-4 h-4 text-red-600" />
                        Open Live Room
                      </Link>

                      {session.status === 'SCHEDULED' ? (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleStartSession(session)}
                            className="btn-primary btn-sm inline-flex items-center gap-1.5"
                          >
                            <Play className="w-4 h-4" />
                            Start Live
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleCancelSession(session)}
                            className="btn-outline btn-sm text-amber-700 border-amber-200 hover:bg-amber-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : null}

                      {session.status === 'ONGOING' ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setEndingSession(session);
                            setEndRecordingUrl(session.recordingUrl || '');
                          }}
                          className="btn-primary btn-sm bg-red-600 hover:bg-red-700 inline-flex items-center gap-1.5"
                        >
                          <Square className="w-4 h-4" />
                          End Session
                        </button>
                      ) : null}

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => openEditModal(session)}
                        className="btn-outline btn-sm inline-flex items-center gap-1"
                        aria-label={`Edit ${session.title}`}
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>

                      {session.status !== 'ONGOING' ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setSessionPendingDelete(session)}
                          className="btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50"
                          aria-label={`Delete ${session.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Lesson Plan */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h4 className="font-bold text-gray-900 mb-4">Live & Hybrid Lessons</h4>
        {liveLessons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-gray-600">
            No live or hybrid lessons are configured for this course yet. Add at least one live-capable lesson in the editor before scheduling live sessions.
          </div>
        ) : (
          <div className="space-y-3">
            {liveLessons
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((lesson) => (
                <div
                  key={lesson.id}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          Lesson {lesson.orderIndex}
                        </span>
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                          {getLiveLessonLabel(lesson.type)}
                        </span>
                        {lesson.isFree ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Free access
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            <Lock className="h-3 w-3" />
                            Enrolled access
                          </span>
                        )}
                      </div>
                      <h5 className="mt-3 text-lg font-semibold text-gray-900">
                        {lesson.title}
                      </h5>
                      {lesson.description ? (
                        <p className="mt-1 text-sm text-gray-600">
                          {lesson.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600">
                        <Clock3 className="h-4 w-4" />
                        {lesson.duration
                          ? `${lesson.duration} min`
                          : 'Duration not set'}
                      </div>
                      <button
                        type="button"
                        onClick={() => openScheduleModal(lesson)}
                        className="btn-outline btn-sm inline-flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Schedule
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Create / Edit Live Session Modal */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-session-modal-title"
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
              <h3
                id="live-session-modal-title"
                className="text-xl font-bold text-gray-900"
              >
                {editingSession ? 'Edit Live Session' : 'Schedule Live Session'}
              </h3>
              <button
                type="button"
                onClick={closeSessionModal}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-4">
              {!editingSession ? (
                <div>
                  <label
                    htmlFor="live-session-lesson"
                    className="block text-sm font-semibold text-gray-700 mb-1"
                  >
                    Lesson *
                  </label>
                  <select
                    id="live-session-lesson"
                    value={formState.lessonId}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        lessonId: e.target.value,
                      }))
                    }
                    className="input"
                    required
                  >
                    {liveLessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        Lesson {lesson.orderIndex}: {lesson.title} ({lesson.type})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="live-session-title"
                  className="block text-sm font-semibold text-gray-700 mb-1"
                >
                  Session Title *
                </label>
                <input
                  id="live-session-title"
                  ref={titleInputRef}
                  type="text"
                  value={formState.title}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="input"
                  placeholder="e.g., Week 1 Live Q&A Workshop"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="live-session-description"
                  className="block text-sm font-semibold text-gray-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="live-session-description"
                  rows={2}
                  value={formState.description}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="input"
                  placeholder="Agenda or preparation notes for students"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="live-session-scheduled-at"
                    className="block text-sm font-semibold text-gray-700 mb-1"
                  >
                    Scheduled Start *
                  </label>
                  <input
                    id="live-session-scheduled-at"
                    type="datetime-local"
                    value={formState.scheduledAt}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        scheduledAt: e.target.value,
                      }))
                    }
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="live-session-duration"
                    className="block text-sm font-semibold text-gray-700 mb-1"
                  >
                    Duration (min)
                  </label>
                  <input
                    id="live-session-duration"
                    type="number"
                    min={1}
                    value={formState.duration}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        duration: e.target.value,
                      }))
                    }
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="live-session-max-participants"
                    className="block text-sm font-semibold text-gray-700 mb-1"
                  >
                    Student Participant Cap
                  </label>
                  <input
                    id="live-session-max-participants"
                    type="number"
                    min={1}
                    value={formState.maxParticipants}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        maxParticipants: e.target.value,
                      }))
                    }
                    className="input"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="live-session-meeting-url"
                    className="block text-sm font-semibold text-gray-700 mb-1"
                  >
                    External Meeting Link (optional)
                  </label>
                  <input
                    id="live-session-meeting-url"
                    type="url"
                    value={formState.meetingUrl}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        meetingUrl: e.target.value,
                      }))
                    }
                    className="input"
                    placeholder="https://meet.example.com/room"
                  />
                </div>
              </div>

              {editingSession ? (
                <div>
                  <label
                    htmlFor="live-session-recording-url"
                    className="block text-sm font-semibold text-gray-700 mb-1"
                  >
                    Recording URL (optional)
                  </label>
                  <input
                    id="live-session-recording-url"
                    type="text"
                    value={formState.recordingUrl}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        recordingUrl: e.target.value,
                      }))
                    }
                    className="input"
                    placeholder="https://... or /uploads/videos/..."
                  />
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={closeSessionModal}
                  disabled={isSubmitting}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingSession
                    ? 'Save Changes'
                    : 'Schedule Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* End Session Modal */}
      {endingSession ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            ref={endModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="end-live-session-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h3
              id="end-live-session-title"
              className="text-xl font-bold text-gray-900 mb-2"
            >
              End Live Session
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Conclude &ldquo;{endingSession.title}&rdquo;. You can optionally attach a replay recording link for enrolled students.
            </p>
            <div className="mb-5">
              <label
                htmlFor="end-session-recording"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Recording URL (optional)
              </label>
              <input
                id="end-session-recording"
                ref={endRecordingInputRef}
                type="text"
                value={endRecordingUrl}
                onChange={(e) => setEndRecordingUrl(e.target.value)}
                className="input"
                placeholder="https://... or /uploads/videos/..."
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeEndModal}
                disabled={Boolean(actionSessionId)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmEndSession()}
                disabled={Boolean(actionSessionId)}
                className="btn-primary bg-red-600 hover:bg-red-700"
              >
                {actionSessionId === endingSession.id
                  ? 'Ending...'
                  : 'End Live Session'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmationModal
        isOpen={Boolean(sessionPendingDelete)}
        title="Delete live session"
        description={
          sessionPendingDelete
            ? `Permanently delete live session "${sessionPendingDelete.title}"?`
            : ''
        }
        confirmLabel="Delete Session"
        tone="danger"
        isLoading={Boolean(
          sessionPendingDelete && actionSessionId === sessionPendingDelete.id
        )}
        onClose={() => {
          if (!actionSessionId) {
            setSessionPendingDelete(null);
          }
        }}
        onConfirm={handleDeleteSession}
      />
    </div>
  );
}

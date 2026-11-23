import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio,
  Clock3,
  Lock,
  Plus,
  ExternalLink,
  Calendar,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LessonType } from '@/types';
import type { Course, LiveSession, LiveSessionStatus } from '@/types';
import courseService from '@/services/course.service';
import { extractErrorMessage } from '@/utils/error-handler';
import clientLogger from '@/utils/logger';

interface CourseManagementLiveTabProps {
  course: Course;
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

const getStatusBadgeClass = (status: LiveSessionStatus) => {
  switch (status) {
    case 'ONGOING':
      return 'bg-red-100 text-red-700 border border-red-200';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-600 border border-gray-200';
    default:
      return 'bg-blue-100 text-blue-700 border border-blue-200';
  }
};

export default function CourseManagementLiveTab({
  course,
}: CourseManagementLiveTabProps) {
  const lessons = course.lessons || [];
  const liveLessons = lessons
    .filter(
      (lesson) =>
        lesson.type === LessonType.LIVE || lesson.type === LessonType.HYBRID
    )
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingSessionId, setUpdatingSessionId] = useState<string | null>(null);

  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    liveLessons[0]?.id || ''
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState('60');
  const [maxParticipants, setMaxParticipants] = useState('100');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!selectedLessonId && liveLessons[0]?.id) {
      setSelectedLessonId(liveLessons[0].id);
    }
  }, [liveLessons, selectedLessonId]);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    setLoadError(null);
    try {
      const list = await courseService.getCourseLiveSessions(course.id);
      setSessions(list);
    } catch (error) {
      clientLogger.error('Failed to load course live sessions:', error);
      setLoadError(extractErrorMessage(error, 'Failed to load live sessions'));
    } finally {
      setLoadingSessions(false);
    }
  }, [course.id]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const handleScheduleSession = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isCreating) return;

    if (!selectedLessonId) {
      toast.error('Please select a live or hybrid lesson');
      return;
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      toast.error('Session title must be at least 3 characters');
      return;
    }
    if (!scheduledAt) {
      toast.error('Please select a scheduled date and time');
      return;
    }

    const parsedDate = new Date(scheduledAt);
    if (Number.isNaN(parsedDate.getTime())) {
      toast.error('Please provide a valid scheduled date and time');
      return;
    }

    const parsedDuration = Number(duration);
    if (!Number.isInteger(parsedDuration) || parsedDuration < 5 || parsedDuration > 480) {
      toast.error('Duration must be between 5 and 480 minutes');
      return;
    }

    const parsedMax = maxParticipants.trim() ? Number(maxParticipants) : undefined;
    if (
      parsedMax !== undefined &&
      (!Number.isInteger(parsedMax) || parsedMax < 1 || parsedMax > 1000)
    ) {
      toast.error('Max participants must be between 1 and 1000');
      return;
    }

    setIsCreating(true);
    try {
      const created = await courseService.createLiveSession(selectedLessonId, {
        title: trimmedTitle,
        description: description.trim() || undefined,
        scheduledAt: parsedDate.toISOString(),
        duration: parsedDuration,
        maxParticipants: parsedMax,
      });
      setSessions((prev) => [created, ...prev]);
      setTitle('');
      setDescription('');
      setScheduledAt('');
      toast.success('Live session scheduled successfully');
    } catch (error) {
      clientLogger.error('Failed to schedule live session:', error);
      toast.error(extractErrorMessage(error, 'Failed to schedule live session'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (
    sessionId: string,
    nextStatus: 'ONGOING' | 'COMPLETED' | 'CANCELLED'
  ) => {
    if (updatingSessionId) return;
    setUpdatingSessionId(sessionId);
    try {
      const updated = await courseService.updateLiveSessionStatus(
        sessionId,
        nextStatus
      );
      setSessions((prev) =>
        prev.map((item) => (item.id === sessionId ? { ...item, ...updated } : item))
      );
      toast.success(`Session marked as ${nextStatus.toLowerCase()}`);
    } catch (error) {
      clientLogger.error('Failed to update live session status:', error);
      toast.error(extractErrorMessage(error, 'Failed to update session status'));
    } finally {
      setUpdatingSessionId(null);
    }
  };

  const totalLiveMinutes = liveLessons.reduce(
    (sum, lesson) => sum + (lesson.duration || 0),
    0
  );
  const freeAccessCount = liveLessons.filter((lesson) => lesson.isFree).length;
  const readinessState =
    course.courseType === 'RECORDED'
      ? 'This course is recorded-only, so live room controls stay inactive until you add a live or hybrid lesson.'
      : liveLessons.length > 0
      ? 'Schedule live classroom sessions below and launch the real-time classroom room when class begins.'
      : 'This course is marked for live-capable delivery, but there are no live or hybrid lessons configured yet.';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 p-6 rounded-lg">
        <div className="flex items-start space-x-4">
          <Radio className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-red-900 mb-2">
              Live Teaching &amp; Classroom Sessions
            </h3>
            <p className="text-red-800">{readinessState}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm font-medium text-gray-500">Live-capable lessons</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {liveLessons.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm font-medium text-gray-500">Planned live minutes</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalLiveMinutes}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm font-medium text-gray-500">Free-access live lessons</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {freeAccessCount}
          </p>
        </div>
      </div>

      {liveLessons.length > 0 && (
        <form
          onSubmit={(e) => void handleScheduleSession(e)}
          className="rounded-xl border border-gray-200 bg-white p-6 space-y-4"
        >
          <h4 className="font-bold text-gray-900 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary-600" />
            Schedule a Live Classroom Session
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="live-lesson-select" className="block text-sm font-medium text-gray-700 mb-1">
                Target Lesson
              </label>
              <select
                id="live-lesson-select"
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="input"
                disabled={isCreating}
              >
                {liveLessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    Lesson {lesson.orderIndex}: {lesson.title} ({getLiveLessonLabel(lesson.type)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="live-session-title" className="block text-sm font-medium text-gray-700 mb-1">
                Session Title
              </label>
              <input
                id="live-session-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Week 1 Live Q&A Workshop"
                className="input"
                maxLength={200}
                disabled={isCreating}
              />
            </div>
            <div>
              <label htmlFor="live-session-time" className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Start
              </label>
              <input
                id="live-session-time"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="input"
                disabled={isCreating}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="live-session-duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (min)
                </label>
                <input
                  id="live-session-duration"
                  type="number"
                  min={5}
                  max={480}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="input"
                  disabled={isCreating}
                />
              </div>
              <div>
                <label htmlFor="live-session-capacity" className="block text-sm font-medium text-gray-700 mb-1">
                  Max Students
                </label>
                <input
                  id="live-session-capacity"
                  type="number"
                  min={1}
                  max={1000}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  className="input"
                  disabled={isCreating}
                />
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="live-session-desc" className="block text-sm font-medium text-gray-700 mb-1">
              Session Notes (optional)
            </label>
            <textarea
              id="live-session-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agenda, preparation instructions, or topics to cover..."
              className="input"
              maxLength={2000}
              disabled={isCreating}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Calendar className="h-4 w-4" />
              {isCreating ? 'Scheduling...' : 'Schedule Session'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-gray-50 p-6 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-900">Scheduled &amp; Past Live Sessions</h4>
          <button
            type="button"
            onClick={() => void loadSessions()}
            disabled={loadingSessions}
            className="btn-outline btn-sm inline-flex items-center gap-1.5"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {loadingSessions ? (
          <div className="py-8 text-center text-gray-500">Loading live sessions...</div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between gap-4">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => void loadSessions()}
              className="btn-outline btn-sm"
            >
              Retry
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-gray-600 text-sm">
            No live classroom sessions have been scheduled for this course yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isBusy = updatingSessionId === session.id;
              return (
                <div
                  key={session.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(
                          session.status
                        )}`}
                      >
                        {session.status}
                      </span>
                      {session.lesson ? (
                        <span className="text-xs font-medium text-gray-500">
                          Lesson {session.lesson.orderIndex}: {session.lesson.title}
                        </span>
                      ) : null}
                    </div>
                    <h5 className="mt-1.5 text-base font-bold text-gray-900">
                      {session.title}
                    </h5>
                    <p className="mt-1 text-xs text-gray-500">
                      Scheduled: {new Date(session.scheduledAt).toLocaleString()} &middot;{' '}
                      {session.duration} min
                      {session.maxParticipants
                        ? ` · Max ${session.maxParticipants} students`
                        : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(session.status === 'SCHEDULED' || session.status === 'ONGOING') && (
                      <Link
                        to={`/live/${session.id}`}
                        className="btn-primary btn-sm inline-flex items-center gap-1.5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Enter Classroom
                      </Link>
                    )}
                    {session.status === 'SCHEDULED' && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleStatusChange(session.id, 'ONGOING')}
                          className="btn-outline btn-sm inline-flex items-center gap-1"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Start
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleStatusChange(session.id, 'CANCELLED')}
                          className="btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50 inline-flex items-center gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </>
                    )}
                    {session.status === 'ONGOING' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleStatusChange(session.id, 'COMPLETED')}
                        className="btn-outline btn-sm text-emerald-700 border-emerald-200 hover:bg-emerald-50 inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h4 className="font-bold text-gray-900 mb-4">Live Lesson Plan</h4>
        {liveLessons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-gray-600">
            No live or hybrid lessons are configured for this course yet. Add at least one live-capable lesson in the editor before scheduling a live room.
          </div>
        ) : (
          <div className="space-y-3">
            {liveLessons.map((lesson) => (
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

                  <div className="text-sm text-gray-600">
                    <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5">
                      <Clock3 className="h-4 w-4" />
                      {lesson.duration ? `${lesson.duration} min` : 'Duration not set'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

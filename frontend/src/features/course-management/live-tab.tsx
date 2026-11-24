import { useCallback, useEffect, useRef, useState } from 'react';
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
  Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LessonType } from '@/types';
import type { Course, LiveSession, LiveSessionStatus } from '@/types';
import courseService from '@/services/course.service';
import { extractErrorMessage } from '@/utils/error-handler';
import { isProtectedUploadAssetUrl, openProtectedAsset } from '@/utils/protected-assets';
import { resolveBackendAssetUrl, toStorableBackendAssetPath } from '@/utils/runtime';
import { normalizeSafeHttpUrl, normalizeSafeInternalPath } from '@/utils/safe-url';
import clientLogger from '@/utils/logger';

interface CourseManagementLiveTabProps {
  course: Course;
}

const getLiveLessonLabel = (type: LessonType) =>
  type === LessonType.HYBRID ? 'Hybrid' : 'Live';

const getStatusBadgeClass = (status: LiveSessionStatus) => {
  switch (status) {
    case 'ONGOING':
      return 'badge-danger';
    case 'COMPLETED':
      return 'badge-success';
    case 'CANCELLED':
      return 'badge';
    default:
      return 'badge-info';
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
  const [editingRecordingId, setEditingRecordingId] = useState<string | null>(null);
  const [recordingDrafts, setRecordingDrafts] = useState<Record<string, string>>({});

  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    liveLessons[0]?.id || ''
  );
  const effectiveLessonId =
    selectedLessonId && liveLessons.some((l) => l.id === selectedLessonId)
      ? selectedLessonId
      : liveLessons[0]?.id || '';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [duration, setDuration] = useState('60');
  const [maxParticipants, setMaxParticipants] = useState('100');
  const [isCreating, setIsCreating] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadSessions = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoadingSessions(true);
    setLoadError(null);
    try {
      const list = await courseService.getCourseLiveSessions(course.id);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setSessions(list);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      clientLogger.error('Failed to load course live sessions:', error);
      setLoadError(extractErrorMessage(error, 'Failed to load live sessions'));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingSessions(false);
      }
    }
  }, [course.id]);

  useEffect(() => {
    void loadSessions();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadSessions]);

  const handleScheduleSession = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isCreating) return;

    const failSchedule = (message: string) => {
      setScheduleError(message);
      toast.error(message);
    };

    if (!effectiveLessonId) {
      failSchedule('Please select a live or hybrid lesson');
      return;
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      failSchedule('Session title must be at least 3 characters');
      return;
    }
    if (!scheduledAt) {
      failSchedule('Please select a scheduled date and time');
      return;
    }

    const parsedDate = new Date(scheduledAt);
    if (Number.isNaN(parsedDate.getTime())) {
      failSchedule('Please provide a valid scheduled date and time');
      return;
    }

    const parsedDuration = Number(duration);
    if (!Number.isInteger(parsedDuration) || parsedDuration < 5 || parsedDuration > 480) {
      failSchedule('Duration must be between 5 and 480 minutes');
      return;
    }

    const parsedMax = maxParticipants.trim() ? Number(maxParticipants) : undefined;
    if (
      parsedMax !== undefined &&
      (!Number.isInteger(parsedMax) || parsedMax < 1 || parsedMax > 1000)
    ) {
      failSchedule('Max participants must be between 1 and 1000');
      return;
    }

    setScheduleError(null);
    setIsCreating(true);
    try {
      const created = await courseService.createLiveSession(effectiveLessonId, {
        title: trimmedTitle,
        description: description.trim() || undefined,
        scheduledAt: parsedDate.toISOString(),
        duration: parsedDuration,
        meetingUrl: meetingUrl.trim() || undefined,
        maxParticipants: parsedMax,
      });
      setSessions((prev) => [created, ...prev]);
      setTitle('');
      setDescription('');
      setScheduledAt('');
      setMeetingUrl('');
      toast.success('Live session scheduled successfully');
    } catch (error) {
      clientLogger.error('Failed to schedule live session:', error);
      failSchedule(extractErrorMessage(error, 'Failed to schedule live session'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (
    sessionId: string,
    nextStatus: 'ONGOING' | 'COMPLETED' | 'CANCELLED',
    recordingUrl?: string | null
  ) => {
    if (updatingSessionId) return;

    let normalizedRecordingUrl = recordingUrl;
    if (typeof recordingUrl === 'string' && recordingUrl.trim()) {
      const candidate = toStorableBackendAssetPath(recordingUrl.trim());
      const safe =
        normalizeSafeHttpUrl(candidate) ||
        (/^\/uploads\//i.test(candidate) ? normalizeSafeInternalPath(candidate) : null);
      if (!safe) {
        toast.error('Please enter a valid http(s) URL or /uploads/ video path');
        return;
      }
      normalizedRecordingUrl = safe;
    }

    setUpdatingSessionId(sessionId);
    try {
      const updated = await courseService.updateLiveSessionStatus(
        sessionId,
        nextStatus,
        normalizedRecordingUrl
      );
      setSessions((prev) =>
        prev.map((item) => (item.id === sessionId ? { ...item, ...updated } : item))
      );
      setEditingRecordingId(null);
      toast.success(
        recordingUrl !== undefined
          ? 'Session recording URL saved'
          : `Session marked as ${nextStatus.toLowerCase()}`
      );
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
        ? 'Schedule live classroom sessions below, launch the real-time classroom room when class begins, and attach replay links once completed.'
        : 'This course is marked for live-capable delivery, but there are no live or hybrid lessons configured yet.';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 p-6 rounded-xl">
        <div className="flex items-start gap-4">
          <Radio className="w-7 h-7 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-bold text-red-950 mb-1">
              Live Teaching &amp; Classroom Sessions
            </h3>
            <p className="text-sm text-red-900">{readinessState}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-600">Live-capable lessons</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
            {liveLessons.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-600">Planned live minutes</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
            {totalLiveMinutes}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-600">Free-access live lessons</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
            {freeAccessCount}
          </p>
        </div>
      </div>

      {liveLessons.length > 0 && (
        <form
          onSubmit={(e) => void handleScheduleSession(e)}
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
        >
          <h4 className="font-bold text-slate-900 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary-600" />
            Schedule a Live Classroom Session
          </h4>
          {scheduleError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {scheduleError}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="live-lesson-select"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Target Lesson
              </label>
              <select
                id="live-lesson-select"
                value={effectiveLessonId}
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
              <label
                htmlFor="live-session-title"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
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
              <label
                htmlFor="live-session-time"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
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
                <label
                  htmlFor="live-session-duration"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Duration (min)
                </label>
                <input
                  id="live-session-duration"
                  type="number"
                  min={5}
                  max={480}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="input tabular-nums"
                  disabled={isCreating}
                />
              </div>
              <div>
                <label
                  htmlFor="live-session-capacity"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Max Students
                </label>
                <input
                  id="live-session-capacity"
                  type="number"
                  min={1}
                  max={1000}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  className="input tabular-nums"
                  disabled={isCreating}
                />
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="live-session-meeting-url"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                External Video Bridge URL (optional)
              </label>
              <input
                id="live-session-meeting-url"
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.example.com/classroom"
                className="input"
                disabled={isCreating}
              />
            </div>
            <div>
              <label
                htmlFor="live-session-desc"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Session Notes (optional)
              </label>
              <input
                id="live-session-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Agenda, preparation instructions, or topics..."
                className="input"
                maxLength={2000}
                disabled={isCreating}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="btn-primary"
            >
              <Calendar className="h-4 w-4" />
              {isCreating ? 'Scheduling...' : 'Schedule Session'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-50 p-6 rounded-xl space-y-4 border border-slate-200">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-900">Scheduled &amp; Past Live Sessions</h4>
          <button
            type="button"
            onClick={() => void loadSessions()}
            disabled={loadingSessions}
            className="btn-secondary btn-sm"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {loadingSessions ? (
          <div className="py-8 text-center text-slate-600">Loading live sessions...</div>
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
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-slate-600 text-sm">
            No live classroom sessions have been scheduled for this course yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isBusy = updatingSessionId === session.id;
              const isEditingReplay = editingRecordingId === session.id;
              const draftUrl =
                recordingDrafts[session.id] ?? session.recordingUrl ?? '';

              return (
                <div
                  key={session.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={getStatusBadgeClass(session.status)}>
                          {session.status}
                        </span>
                        {session.lesson ? (
                          <span className="text-xs font-medium text-slate-500">
                            Lesson {session.lesson.orderIndex}: {session.lesson.title}
                          </span>
                        ) : null}
                      </div>
                      <h5 className="mt-1.5 text-base font-bold text-slate-900">
                        {session.title}
                      </h5>
                      <p className="mt-1 text-xs text-slate-600 tabular-nums">
                        Scheduled: {new Date(session.scheduledAt).toLocaleString()} &middot;{' '}
                        {session.duration} min
                        {session.maxParticipants
                          ? ` · Max ${session.maxParticipants} students`
                          : ''}
                      </p>
                      {session.recordingUrl && (
                        <p className="mt-1.5 text-xs">
                          {isProtectedUploadAssetUrl(session.recordingUrl) ? (
                            <button
                              type="button"
                              onClick={() => {
                                void openProtectedAsset(session.recordingUrl!).catch((err) => {
                                  toast.error(extractErrorMessage(err, 'Failed to open session replay'));
                                });
                              }}
                              className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                            >
                              <Video className="h-3.5 w-3.5" />
                              Session Replay Link
                            </button>
                          ) : (
                            <a
                              href={resolveBackendAssetUrl(session.recordingUrl) || session.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                            >
                              <Video className="h-3.5 w-3.5" />
                              Session Replay Link
                            </a>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(session.status === 'SCHEDULED' || session.status === 'ONGOING') && (
                        <Link
                          to={`/live/${session.id}`}
                          className="btn-primary btn-sm"
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
                            className="btn-outline btn-sm"
                          >
                            <Play className="h-3.5 w-3.5" />
                            Start
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleStatusChange(session.id, 'CANCELLED')}
                            className="btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50"
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
                          onClick={() => {
                            setRecordingDrafts((prev) => ({
                              ...prev,
                              [session.id]: prev[session.id] ?? '',
                            }));
                            setEditingRecordingId(
                              isEditingReplay ? null : session.id
                            );
                          }}
                          className="btn-outline btn-sm text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Complete Session
                        </button>
                      )}
                      {session.status === 'COMPLETED' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setRecordingDrafts((prev) => ({
                              ...prev,
                              [session.id]:
                                prev[session.id] ?? session.recordingUrl ?? '',
                            }));
                            setEditingRecordingId(
                              isEditingReplay ? null : session.id
                            );
                          }}
                          className="btn-secondary btn-sm"
                        >
                          <Video className="h-3.5 w-3.5" />
                          {session.recordingUrl ? 'Edit Replay URL' : 'Attach Replay URL'}
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditingReplay && (
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        aria-label="Session replay video URL"
                        value={draftUrl}
                        onChange={(e) =>
                          setRecordingDrafts((prev) => ({
                            ...prev,
                            [session.id]: e.target.value,
                          }))
                        }
                        placeholder="Replay video URL (https://... or /uploads/videos/...)"
                        className="input py-2 text-sm flex-1"
                        disabled={isBusy}
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            void handleStatusChange(
                              session.id,
                              'COMPLETED',
                              draftUrl.trim() ? draftUrl.trim() : null
                            )
                          }
                          className="btn-primary btn-sm"
                        >
                          {session.status === 'ONGOING'
                            ? 'Complete & Save'
                            : 'Save Replay'}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setEditingRecordingId(null)}
                          className="btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h4 className="font-bold text-slate-900 mb-4">Live Lesson Plan</h4>
        {liveLessons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-slate-600 text-sm">
            No live or hybrid lessons are configured for this course yet. Add at least one live-capable lesson in the editor before scheduling a live room.
          </div>
        ) : (
          <div className="space-y-3">
            {liveLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge">Lesson {lesson.orderIndex}</span>
                      <span className="badge-danger">
                        {getLiveLessonLabel(lesson.type)}
                      </span>
                      {lesson.isFree ? (
                        <span className="badge-success">Free access</span>
                      ) : (
                        <span className="badge-warning">
                          <Lock className="h-3 w-3" />
                          Enrolled access
                        </span>
                      )}
                    </div>
                    <h5 className="mt-2.5 text-base font-semibold text-slate-900">
                      {lesson.title}
                    </h5>
                    {lesson.description ? (
                      <p className="mt-1 text-sm text-slate-600">
                        {lesson.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-sm text-slate-600 tabular-nums">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                      <Clock3 className="h-3.5 w-3.5" />
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

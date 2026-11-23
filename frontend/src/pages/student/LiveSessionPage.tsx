import { useEffect, useState, useRef, useCallback } from 'react';
import clientLogger from '@/utils/logger';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Send,
  Users,
  Hand,
  ExternalLink,
  ArrowLeft,
  Play,
  Square,
  Video,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import courseService from '@/services/course.service';
import UniversalVideoPlayer from '@/components/common/UniversalVideoPlayer';
import { extractErrorMessage } from '@/utils/error-handler';
import { getAccessToken } from '@/utils/auth-storage';
import { getSocketServerUrl } from '@/utils/runtime';
import { useAuthStore } from '@/store/auth-store';
import { LiveSession, UserRole } from '@/types';
import { usePageTitle } from '@/hooks';

interface ChatMessage {
  id?: string;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
  };
  message: string;
  timestamp?: number;
}

interface SessionParticipant {
  id?: string;
  firstName?: string;
  lastName?: string;
}

interface SessionParticipantEvent {
  user?: SessionParticipant;
  userId?: string;
  timestamp?: string;
}

interface SocketErrorPayload {
  message?: string;
}

const generateMessageId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const token = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join('');
    return `msg-${Date.now()}-${token}`;
  }

  return `msg-${Date.now()}-${performance.now().toString(36).replace('.', '')}`;
};

const normalizeExternalUrl = (url?: string | null): string | null => {
  const candidate = url?.trim();
  if (!candidate) {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
};

const LiveSessionPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, fetchProfile } = useAuthStore();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [recordingDraft, setRecordingDraft] = useState('');
  const [showEndForm, setShowEndForm] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isRecoveringSocketSessionRef = useRef(false);

  usePageTitle(session?.title ? `Live: ${session.title}` : 'Live Session');

  const loadSessionDetails = useCallback(async () => {
    if (!sessionId) {
      toast.error('Session ID is missing');
      navigate('/courses');
      return;
    }

    setIsLoadingSession(true);
    setLoadError(null);
    try {
      const details = await courseService.getLiveSessionById(sessionId);
      setSession(details);
      setRecordingDraft(details.recordingUrl || '');
    } catch (error) {
      const msg = extractErrorMessage(error, 'Failed to load live session');
      clientLogger.error('Failed to load live session:', error);
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setIsLoadingSession(false);
    }
  }, [navigate, sessionId]);

  useEffect(() => {
    void loadSessionDetails();
  }, [loadSessionDetails]);

  const shouldConnectRealtime = Boolean(
    sessionId &&
      session &&
      (session.status === 'SCHEDULED' || session.status === 'ONGOING')
  );

  useEffect(() => {
    if (!sessionId || !shouldConnectRealtime) {
      setIsJoined(false);
      setSocket(null);
      return;
    }

    const socketUrl = getSocketServerUrl();
    const socketOptions = {
      autoConnect: true,
      auth: (callback: (data: { token?: string }) => void) => {
        const currentToken = getAccessToken();
        callback(currentToken ? { token: currentToken } : {});
      },
    };
    const newSocket = socketUrl
      ? io(socketUrl, socketOptions)
      : io(socketOptions);

    newSocket.on('connect', () => {
      isRecoveringSocketSessionRef.current = false;
      newSocket.emit('join-session', { sessionId });
    });

    newSocket.on('session-joined', (data: { session?: LiveSession }) => {
      if (data.session) {
        setSession((prev) => ({
          ...prev,
          ...data.session,
        } as LiveSession));
      }
      setIsJoined(true);
      toast.success('Joined live session');
    });

    newSocket.on('session-started', (data: { session?: LiveSession }) => {
      if (data.session) {
        setSession((prev) => ({
          ...prev,
          ...data.session,
        } as LiveSession));
      }
      toast.success('Live session has started');
    });

    newSocket.on('session-ended', (data: { session?: LiveSession }) => {
      if (data.session) {
        setSession((prev) => ({
          ...prev,
          ...data.session,
        } as LiveSession));
      }
      setShowEndForm(false);
      toast('This live session has ended');
    });

    newSocket.on('user-joined', (data: SessionParticipantEvent) => {
      if (data.user?.id && data.user.id === user?.id) {
        return;
      }
      const userName = data.user?.firstName
        ? `${data.user.firstName}${data.user.lastName ? ` ${data.user.lastName}` : ''}`
        : 'A user';
      toast(`${userName} joined the session`);
    });

    newSocket.on('user-left', (data: SessionParticipantEvent) => {
      if (data.userId && data.userId === user?.id) {
        return;
      }
      toast('A participant left the session');
    });

    newSocket.on('chat-message', (data: ChatMessage) => {
      const messageWithId: ChatMessage = {
        ...data,
        id: data.id || generateMessageId(),
        timestamp: data.timestamp || Date.now(),
      };
      setMessages((prev) => [...prev, messageWithId]);
    });

    newSocket.on('hand-raised', (data: SessionParticipantEvent) => {
      if (data.userId && data.userId === user?.id) {
        toast.success('Your hand was raised');
        return;
      }

      if (user?.role === UserRole.TEACHER || session?.isInstructor) {
        toast('A participant raised their hand');
      }
    });

    const handleSocketError = async (error: SocketErrorPayload | Error) => {
      clientLogger.error('Socket error:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : error?.message || 'Connection error occurred';

      if (
        newSocket.disconnected &&
        !isRecoveringSocketSessionRef.current &&
        (errorMessage === 'Token expired' ||
          errorMessage === 'Invalid token' ||
          errorMessage === 'Session expired' ||
          errorMessage === 'Authentication required')
      ) {
        isRecoveringSocketSessionRef.current = true;

        try {
          await fetchProfile();
          if (newSocket.disconnected) {
            newSocket.connect();
          }
          return;
        } catch (recoveryError) {
          clientLogger.error(
            'Failed to recover live session socket auth:',
            recoveryError
          );
        } finally {
          isRecoveringSocketSessionRef.current = false;
        }
      }

      toast.error(extractErrorMessage(errorMessage, 'Connection error occurred'));
    };

    newSocket.on('error', handleSocketError);
    newSocket.on('connect_error', handleSocketError);

    setSocket(newSocket);

    return () => {
      setIsJoined(false);
      if (sessionId) {
        newSocket.emit('leave-session', { sessionId });
      }
      newSocket.off('session-joined');
      newSocket.off('session-started');
      newSocket.off('session-ended');
      newSocket.off('user-joined');
      newSocket.off('user-left');
      newSocket.off('chat-message');
      newSocket.off('hand-raised');
      newSocket.off('error', handleSocketError);
      newSocket.off('connect_error', handleSocketError);
      newSocket.disconnect();
    };
  }, [
    fetchProfile,
    session?.isInstructor,
    sessionId,
    shouldConnectRealtime,
    user?.id,
    user?.role,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartLive = async () => {
    if (!sessionId || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await courseService.startLiveSession(sessionId);
      setSession((prev) => ({ ...prev, ...updated }));
      toast.success('Live session started');
    } catch (error) {
      clientLogger.error('Failed to start live session:', error);
      toast.error(extractErrorMessage(error, 'Failed to start live session'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleEndLive = async () => {
    if (!sessionId || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await courseService.endLiveSession(
        sessionId,
        recordingDraft.trim() ? recordingDraft.trim() : undefined
      );
      setSession((prev) => ({ ...prev, ...updated }));
      setShowEndForm(false);
      toast.success('Live session ended');
    } catch (error) {
      clientLogger.error('Failed to end live session:', error);
      toast.error(extractErrorMessage(error, 'Failed to end live session'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const sendMessage = () => {
    const trimmedMessage = message.trim();
    if (!socket || !trimmedMessage || !sessionId) return;
    if (!isJoined || session?.status !== 'ONGOING') {
      toast.error('Chat is available only after the live session starts');
      return;
    }
    socket.emit('chat-message', { sessionId, message: trimmedMessage });
    setMessage('');
  };

  const raiseHand = () => {
    if (!socket || !sessionId) {
      toast.error('Unable to raise hand. Please check your connection.');
      return;
    }
    if (!isJoined || session?.status !== 'ONGOING') {
      toast.error('You can raise your hand only during an ongoing live session');
      return;
    }
    socket.emit('raise-hand', { sessionId });
  };

  const handleNavigateBack = () => {
    const courseId = session?.lesson?.courseId || session?.lesson?.course?.id;
    if (courseId) {
      if (session?.canManageSession || user?.role === UserRole.TEACHER) {
        navigate(`/teacher/courses/${courseId}/manage`);
        return;
      }
      navigate(
        `/courses/${courseId}/learn${
          session?.lessonId ? `?lessonId=${encodeURIComponent(session.lessonId)}` : ''
        }`
      );
      return;
    }
    navigate('/courses');
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner" />
          <p className="text-gray-600 font-medium">Loading live classroom...</p>
        </div>
      </div>
    );
  }

  if (loadError || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 p-4">
        <div className="card max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Unable to open live session
          </h2>
          <p className="text-gray-600 mb-6">
            {loadError || 'Live session not found.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void loadSessionDetails()}
              className="btn-primary"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => navigate('/courses')}
              className="btn-outline"
            >
              Back to Courses
            </button>
          </div>
        </div>
      </div>
    );
  }

  const meetingUrl = normalizeExternalUrl(session.meetingUrl);
  const canOpenMeetingRoom = Boolean(
    meetingUrl &&
      (session.status === 'SCHEDULED' || session.status === 'ONGOING')
  );
  const canManage = Boolean(session.canManageSession);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={handleNavigateBack}
              className="btn-outline btn-sm inline-flex items-center gap-2 mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Course
            </button>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              {session.title}
            </h1>
            {session.lesson?.course?.title ? (
              <p className="text-sm text-gray-600 mt-1">
                {session.lesson.course.title} • {session.lesson.title}
              </p>
            ) : null}
          </div>

          {canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              {session.status === 'SCHEDULED' ? (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => void handleStartLive()}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {isUpdatingStatus ? 'Starting...' : 'Start Live Session'}
                </button>
              ) : null}

              {session.status === 'ONGOING' ? (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => setShowEndForm((prev) => !prev)}
                  className="btn-primary bg-red-600 hover:bg-red-700 inline-flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  End Live Session
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {canManage && showEndForm && session.status === 'ONGOING' ? (
          <div className="card mb-6 border-2 border-red-200 bg-red-50/70">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Conclude Live Session
            </h2>
            <p className="text-sm text-gray-700 mb-3">
              Optionally provide a recording link so enrolled students can replay this session afterwards.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={recordingDraft}
                onChange={(e) => setRecordingDraft(e.target.value)}
                placeholder="https://... or /uploads/videos/..."
                className="input flex-1 bg-white"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEndForm(false)}
                  disabled={isUpdatingStatus}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleEndLive()}
                  disabled={isUpdatingStatus}
                  className="btn-primary bg-red-600 hover:bg-red-700"
                >
                  {isUpdatingStatus ? 'Ending...' : 'Confirm End'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video / Replay Area */}
          <div className="lg:col-span-2 space-y-4">
            {session.status === 'COMPLETED' && session.recordingUrl ? (
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-black">
                <UniversalVideoPlayer
                  src={session.recordingUrl}
                  title={`${session.title} (Recording)`}
                  autoPlay={false}
                />
              </div>
            ) : (
              <div className="card bg-black aspect-video flex items-center justify-center shadow-2xl border border-gray-800 rounded-2xl overflow-hidden">
                <div className="text-center px-6">
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      session.status === 'ONGOING'
                        ? 'bg-red-600 animate-pulse'
                        : session.status === 'COMPLETED'
                        ? 'bg-emerald-600'
                        : 'bg-slate-700'
                    }`}
                  >
                    <span className="text-white text-xl font-bold">
                      {session.status === 'ONGOING'
                        ? 'LIVE'
                        : session.status === 'COMPLETED'
                        ? 'DONE'
                        : 'SOON'}
                    </span>
                  </div>
                  <p className="text-white text-xl font-semibold">
                    {session.title}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    {session.status === 'ONGOING'
                      ? 'Session is live now. Use the chat to participate.'
                      : session.status === 'COMPLETED'
                      ? 'This live session has concluded.'
                      : session.status === 'CANCELLED'
                      ? 'This live session was cancelled.'
                      : `Scheduled for ${new Date(session.scheduledAt).toLocaleString()}.`}
                  </p>
                  <div className="mt-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold text-white">
                    Status: {session.status}
                  </div>

                  {canOpenMeetingRoom ? (
                    <div className="mt-6">
                      <a
                        href={meetingUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
                      >
                        Open Meeting Room
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <p className="mt-3 text-xs text-gray-400">
                        Opens the configured external live room in a new tab.
                      </p>
                    </div>
                  ) : session.status === 'COMPLETED' && session.recordingUrl ? (
                    <div className="mt-6">
                      <a
                        href={session.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        <Video className="w-4 h-4" />
                        Watch Recording
                      </a>
                    </div>
                  ) : session.meetingUrl ? (
                    <p className="mt-6 text-xs text-gray-400">
                      The meeting room link is available once the session is active.
                    </p>
                  ) : (
                    <p className="mt-6 text-xs text-gray-400">
                      {session.status === 'COMPLETED'
                        ? 'No replay recording URL was attached to this session.'
                        : 'Participate via the real-time classroom chat when the instructor starts the session.'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {session.description ? (
              <div className="card border border-gray-100 rounded-2xl">
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                  Session Agenda
                </h2>
                <p className="text-gray-700 whitespace-pre-line">
                  {session.description}
                </p>
              </div>
            ) : null}
          </div>

          {/* Chat Sidebar */}
          <div className="card flex flex-col h-[600px] shadow-xl border border-gray-100 rounded-2xl">
            <div className="border-b-2 border-gray-200 pb-4 mb-4">
              <h3 className="font-bold text-lg text-gray-900 flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg mr-3">
                  <Users className="w-5 h-5 text-primary-600" />
                </div>
                Live Chat
              </h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>
                    {session.status === 'ONGOING'
                      ? 'No messages yet. Start the conversation!'
                      : session.status === 'SCHEDULED'
                      ? 'Live chat unlocks automatically as soon as the session starts.'
                      : 'Live chat is closed because this session has ended.'}
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id || `msg-${msg.timestamp || Date.now()}`}
                    className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200"
                  >
                    <p className="text-xs font-bold text-primary-600 mb-1">
                      {[msg.user?.firstName, msg.user?.lastName]
                        .filter(Boolean)
                        .join(' ') || 'Participant'}
                    </p>
                    <p className="text-sm text-gray-900">{msg.message}</p>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex space-x-2 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={raiseHand}
                className="btn-outline p-3 rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
                title="Raise hand"
                disabled={!isJoined || session.status !== 'ONGOING'}
              >
                <Hand className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 input"
                disabled={!isJoined || session.status !== 'ONGOING'}
              />
              <button
                type="button"
                onClick={sendMessage}
                className="btn-primary p-3 rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
                disabled={
                  !message.trim() || !isJoined || session.status !== 'ONGOING'
                }
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveSessionPage;

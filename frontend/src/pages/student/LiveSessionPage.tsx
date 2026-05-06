import { useEffect, useState, useRef } from 'react';
import clientLogger from '@/utils/logger';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Users, Hand, ExternalLink } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import { getAccessToken } from '@/utils/auth-storage';
import { getSocketServerUrl } from '@/utils/runtime';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types';
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

type SessionStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

interface SessionInfo {
  id: string;
  title: string;
  description?: string;
  scheduledAt?: string;
  status: SessionStatus;
  meetingUrl?: string;
}

const generateMessageId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `msg-${Date.now()}-${token}`;
  }

  return `msg-${Date.now()}-${performance.now().toString(36).replace('.', '')}`;
};

const normalizeMeetingUrl = (url?: string): string | null => {
  const candidate = url?.trim();
  if (!candidate) {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

const LiveSessionPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  usePageTitle('Live Session');
  const navigate = useNavigate();
  const { user, fetchProfile } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isRecoveringSocketSessionRef = useRef(false);
  const meetingUrl = normalizeMeetingUrl(session?.meetingUrl);
  const canOpenMeetingRoom = Boolean(
    meetingUrl &&
    (session?.status === 'SCHEDULED' || session?.status === 'ONGOING')
  );

  useEffect(() => {
    if (!sessionId) {
      toast.error('Session ID is missing');
      navigate('/courses');
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
    const newSocket = socketUrl ? io(socketUrl, socketOptions) : io(socketOptions);

    newSocket.on('connect', () => {
      isRecoveringSocketSessionRef.current = false;
      newSocket.emit('join-session', { sessionId });
    });

    newSocket.on('session-joined', (data: { session?: SessionInfo }) => {
      setSession(data.session || null);
      setIsJoined(true);
      toast.success('Joined live session');
    });

    newSocket.on('session-started', (data: { session?: SessionInfo }) => {
      setSession(data.session || null);
      toast.success('Live session has started');
    });

    newSocket.on('session-ended', (data: { session?: SessionInfo }) => {
      setSession(data.session || null);
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

      if (user?.role === UserRole.TEACHER) {
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
          clientLogger.error('Failed to recover live session socket auth:', recoveryError);
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
      setSession(null);
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
  }, [fetchProfile, navigate, sessionId, user?.id, user?.role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Area */}
          <div className="lg:col-span-2">
            <div className="card bg-black aspect-video flex items-center justify-center shadow-2xl border border-gray-800 rounded-2xl overflow-hidden">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <span className="text-white text-2xl font-bold">LIVE</span>
                </div>
                <p className="text-white text-xl font-semibold">{session?.title || 'Live Session Video'}</p>
                <p className="text-gray-400 text-sm mt-2">
                  {session?.status === 'ONGOING'
                    ? 'Session is live now. Use the chat to participate.'
                    : session?.status === 'COMPLETED'
                      ? 'This live session has already ended.'
                      : session?.status === 'CANCELLED'
                        ? 'This live session was cancelled.'
                        : 'Live video will appear here when the session starts.'}
                </p>
                {session?.status ? (
                  <div className="mt-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold text-white">
                    Status: {session.status}
                  </div>
                ) : null}
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
                ) : session?.meetingUrl ? (
                  <p className="mt-6 text-xs text-gray-400">
                    The meeting room link is unavailable in the current session state.
                  </p>
                ) : (
                  <p className="mt-6 text-xs text-gray-400">
                    A direct meeting room link has not been published for this session yet.
                  </p>
                )}
              </div>
            </div>
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
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id || `msg-${msg.timestamp || Date.now()}`} className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                    <p className="text-xs font-bold text-primary-600 mb-1">
                      {[msg.user?.firstName, msg.user?.lastName].filter(Boolean).join(' ') || 'Participant'}
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
                disabled={!isJoined || session?.status !== 'ONGOING'}
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
                disabled={!isJoined || session?.status !== 'ONGOING'}
              />
              <button
                type="button"
                onClick={sendMessage}
                className="btn-primary p-3 rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
                disabled={!message.trim() || !isJoined || session?.status !== 'ONGOING'}
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

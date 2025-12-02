import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Users, Hand } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface ChatMessage {
  id?: string;
  user?: {
    firstName?: string;
    lastName?: string;
  };
  message: string;
  timestamp?: number;
}

const LiveSessionPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) {
      toast.error('Session ID is missing');
      navigate('/courses');
      return;
    }

    const token = localStorage.getItem('accessToken');
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
    const newSocket = io(socketUrl, {
      auth: { token },
    });

    newSocket.on('connect', () => {
      newSocket.emit('join-session', { sessionId });
    });

    newSocket.on('session-joined', () => {
      toast.success('Joined live session');
    });

    newSocket.on('user-joined', (data: { user?: { firstName?: string; lastName?: string } }) => {
      const userName = data.user?.firstName 
        ? `${data.user.firstName}${data.user.lastName ? ` ${data.user.lastName}` : ''}`
        : 'A user';
      toast(`${userName} joined the session`);
    });

    newSocket.on('chat-message', (data: ChatMessage) => {
      const messageWithId: ChatMessage = {
        ...data,
        id: data.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: data.timestamp || Date.now(),
      };
      setMessages((prev) => [...prev, messageWithId]);
    });

    newSocket.on('error', (error: { message?: string }) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'Connection error occurred');
    });

    setSocket(newSocket);

    return () => {
      if (sessionId) {
        newSocket.emit('leave-session', { sessionId });
      }
      newSocket.disconnect();
    };
  }, [sessionId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!socket || !message.trim() || !sessionId) return;
    socket.emit('chat-message', { sessionId, message });
    setMessage('');
  };

  const raiseHand = () => {
    if (!socket || !sessionId) {
      toast.error('Unable to raise hand. Please check your connection.');
      return;
    }
    socket.emit('raise-hand', { sessionId });
    toast.success('Hand raised!');
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
                <p className="text-white text-xl font-semibold">Live Session Video</p>
                <p className="text-gray-400 text-sm mt-2">WebRTC integration needed</p>
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
                      {msg.user?.firstName || ''} {msg.user?.lastName || ''}
                      {!msg.user?.firstName && !msg.user?.lastName && 'Anonymous'}
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
                onClick={raiseHand}
                className="btn-outline p-3 rounded-xl"
                title="Raise hand"
              >
                <Hand className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 input"
              />
              <button onClick={sendMessage} className="btn-primary p-3 rounded-xl" aria-label="Send message">
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

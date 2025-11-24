import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Users, Hand } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

const LiveSessionPage = () => {
  const { sessionId } = useParams();
  const [socket, setSocket] = useState<Socket | null>(null);
  interface ChatMessage {
    user?: {
      firstName?: string;
      lastName?: string;
    };
    message: string;
  }
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
    });

    newSocket.on('connect', () => {
      newSocket.emit('join-session', { sessionId });
    });

    newSocket.on('session-joined', () => {
      toast.success('Joined live session');
    });

    newSocket.on('user-joined', (data) => {
      toast(`${data.user.firstName} joined the session`);
    });

    newSocket.on('chat-message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave-session', { sessionId });
      newSocket.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!socket || !message.trim()) return;
    socket.emit('chat-message', { sessionId, message });
    setMessage('');
  };

  const raiseHand = () => {
    if (!socket) return;
    socket.emit('raise-hand', { sessionId });
    toast.success('Hand raised!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Area */}
          <div className="lg:col-span-2">
            <div className="card bg-black aspect-video flex items-center justify-center shadow-2xl rounded-2xl overflow-hidden">
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
          <div className="card flex flex-col h-[600px] shadow-lg">
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
                messages.map((msg, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                    <p className="text-xs font-bold text-primary-600 mb-1">
                      {msg.user?.firstName} {msg.user?.lastName}
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
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 input"
              />
              <button onClick={sendMessage} className="btn-primary p-3 rounded-xl">
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


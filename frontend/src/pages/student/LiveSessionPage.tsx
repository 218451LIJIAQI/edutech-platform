import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Users, Hand } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

const LiveSessionPage = () => {
  const { sessionId } = useParams();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [participants, setParticipants] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
    });

    newSocket.on('connect', () => {
      newSocket.emit('join-session', { sessionId });
    });

    newSocket.on('session-joined', (data) => {
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
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Area */}
          <div className="lg:col-span-2">
            <div className="card bg-black aspect-video flex items-center justify-center">
              <p className="text-white text-lg">Live Session Video (WebRTC integration needed)</p>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="card flex flex-col h-[600px]">
            <div className="border-b pb-4 mb-4">
              <h3 className="font-semibold flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Live Chat
              </h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {messages.map((msg, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-semibold text-gray-700">
                    {msg.user.firstName} {msg.user.lastName}
                  </p>
                  <p className="text-sm text-gray-900 mt-1">{msg.message}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex space-x-2">
              <button
                onClick={raiseHand}
                className="btn-outline p-2"
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
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              <button onClick={sendMessage} className="btn-primary p-2">
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


import { useEffect, useState, useRef, useCallback } from 'react';
import {
  MessageCircle,
  Send,
  X,
  Plus,
  Paperclip,
  Smile,
} from 'lucide-react';
import toast from 'react-hot-toast';
import supportService from '@/services/support.service';
import { SupportTicket, SupportTicketMessage, SupportTicketPriority, SupportTicketStatus } from '@/types';
import { useAuthStore } from '@/store/authStore';

/**
 * Customer Support Chat Component
 * Provides live chat experience built on top of Support Tickets endpoints
 * Features: Ticket list, live messaging, create ticket, close ticket
 */
type CustomerSupportChatProps = {
  // When true, opens the chat window. Useful for triggering from elsewhere (e.g., a widget)
  open?: boolean;
  // Called when the chat window is closed by the user
  onClose?: () => void;
};

const CustomerSupportChat = ({ open, onClose }: CustomerSupportChatProps) => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(!!open);

  // Tickets act as conversations
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);

  // Compose message
  const [newMessage, setNewMessage] = useState('');

  // Create ticket form
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSubject, setNewChatSubject] = useState('');
  const [newChatCategory, setNewChatCategory] = useState('general');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [newChatPriority, setNewChatPriority] = useState<SupportTicketPriority>(SupportTicketPriority.MEDIUM);
  const [isCreating, setIsCreating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Support categories
  const supportCategories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'billing', label: 'Billing & Payment' },
    { value: 'course', label: 'Course Related' },
    { value: 'account', label: 'Account & Profile' },
    { value: 'refund', label: 'Refund Request' },
    { value: 'other', label: 'Other' },
  ];

  // Auto-scroll to latest message
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Sync open prop
  useEffect(() => { setIsOpen(!!open); }, [open]);

  // Select ticket and load its messages
  const selectTicket = useCallback(async (ticketId: string) => {
    try {
      const ticket = await supportService.getTicketById(ticketId);
      setSelectedTicket(ticket);
      setMessages(ticket.messages || []);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast.error('Failed to load conversation');
    }
  }, []);

  // Load all tickets for current user
  const loadTickets = useCallback(async () => {
    try {
      const list = await supportService.getUserTickets();
      setTickets(list);
      // Auto-select an active ticket or the most recent
      if (list.length > 0) {
        const active = list.find(t => t.status === SupportTicketStatus.OPEN || t.status === SupportTicketStatus.IN_PROGRESS) || list[0];
        await selectTicket(active.id);
      } else {
        setSelectedTicket(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    }
  }, [selectTicket]);

  // Initial load when chat opens
  useEffect(() => {
    if (!isOpen) return;
    void loadTickets();
  }, [isOpen, loadTickets]);

  // Send a message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    const body = newMessage;
    setNewMessage('');
    try {
      const msg = await supportService.addMessage(selectedTicket.id, body);
      setMessages(prev => [...prev, msg]);
    } catch (e) {
      console.error(e);
      toast.error('Failed to send message');
      setNewMessage(body); // restore on error
    }
  };

  // Create new ticket (new chat)
  const handleCreateNewChat = async () => {
    if (!newChatSubject.trim() || !newChatMessage.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }
    setIsCreating(true);
    try {
      const ticket = await supportService.createTicket(
        newChatSubject,
        newChatMessage,
        newChatCategory,
        undefined,
        newChatPriority
      );
      toast.success('Support chat created');
      setShowNewChat(false);
      setNewChatSubject('');
      setNewChatMessage('');
      setNewChatCategory('general');
      setNewChatPriority(SupportTicketPriority.MEDIUM);
      await loadTickets();
      await selectTicket(ticket.id);
    } catch (e) {
      console.error(e);
      toast.error('Failed to create chat');
    } finally {
      setIsCreating(false);
    }
  };

  // Close ticket (end chat)
  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    try {
      await supportService.closeTicket(selectedTicket.id);
      toast.success('Conversation closed');
      await loadTickets();
    } catch (e) {
      console.error(e);
      toast.error('Failed to close conversation');
    }
  };

  // UI helpers
  const statusBadge = (status: SupportTicketStatus) => {
    const map: Record<SupportTicketStatus, string> = {
      [SupportTicketStatus.OPEN]: 'bg-green-100 text-green-800',
      [SupportTicketStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
      [SupportTicketStatus.RESOLVED]: 'bg-purple-100 text-purple-800',
      [SupportTicketStatus.CLOSED]: 'bg-gray-100 text-gray-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  const priorityBadge = (priority: SupportTicketPriority) => {
    const map: Record<SupportTicketPriority, string> = {
      [SupportTicketPriority.URGENT]: 'bg-red-100 text-red-800',
      [SupportTicketPriority.HIGH]: 'bg-orange-100 text-orange-800',
      [SupportTicketPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800',
      [SupportTicketPriority.LOW]: 'bg-green-100 text-green-800',
    };
    return map[priority] || 'bg-gray-100 text-gray-800';
  };

  // Single return: render chat or launcher, and always allow modal
  return (
    <>
      {isOpen ? (
        <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-40 border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Customer Support</h3>
                <p className="text-xs text-white text-opacity-80">Always here to help</p>
              </div>
            </div>
            <button type="button" onClick={() => { setIsOpen(false); onClose?.(); }} className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Ticket list */}
            <div className="w-1/3 border-r border-gray-200 bg-gray-50 overflow-y-auto">
              <div className="p-3 border-b border-gray-200">
                <button type="button" onClick={() => setShowNewChat(true)} className="w-full flex items-center justify-center space-x-2 bg-primary-600 text-white py-2 px-3 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
                  <Plus className="w-4 h-4" />
                  <span>New Chat</span>
                </button>
              </div>

              {tickets.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {tickets.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => void selectTicket(t.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${selectedTicket?.id === t.id ? 'bg-primary-100 border-l-4 border-primary-600' : 'hover:bg-gray-100'}`}
                    >
                      <p className="font-medium text-gray-900 truncate">{t.subject}</p>
                      <p className="text-xs text-gray-600 truncate">{t.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(t.status)}`}>{t.status.replace(/_/g, ' ')}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${priorityBadge(t.priority)}`}>{t.priority}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col">
              {selectedTicket ? (
                <>
                  {/* Conversation header */}
                  <div className="bg-white border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900">{selectedTicket.subject}</h4>
                        <p className="text-xs text-gray-600">Ticket No: {selectedTicket.ticketNo}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${priorityBadge(selectedTicket.priority)}`}>{selectedTicket.priority}</span>
                        {selectedTicket.status !== SupportTicketStatus.CLOSED && (
                          <button type="button" onClick={handleCloseTicket} className="text-xs px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium">Close</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No messages yet</p>
                      </div>
                    ) : (
                      messages.map((m) => (
                        <div key={m.id} className={`flex ${m.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs px-4 py-2 rounded-lg ${m.senderId === user?.id ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'}`}>
                            {m.sender && m.sender.id !== user?.id && (
                              <p className="text-xs font-semibold text-gray-600 mb-1">{m.sender.firstName} {m.sender.lastName}</p>
                            )}
                            <p className="text-sm break-words">{m.message}</p>
                            <p className={`text-xs mt-1 ${m.senderId === user?.id ? 'text-white text-opacity-70' : 'text-gray-500'}`}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  {selectedTicket.status !== SupportTicketStatus.CLOSED && (
                    <div className="bg-white border-t border-gray-200 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              void handleSendMessage();
                            }
                          }}
                          placeholder="Type your message..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button type="button" onClick={() => void handleSendMessage()} disabled={!newMessage.trim()} className="bg-primary-600 text-white p-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <button type="button" className="hover:text-primary-600 transition-colors">
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <button type="button" className="hover:text-primary-600 transition-colors">
                            <Smile className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Select a conversation to start</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all z-40 group"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Chat with us
          </span>
        </button>
      )}

      {/* New Chat Modal (always available) */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6 rounded-t-lg flex items-center justify-between">
              <h3 className="text-lg font-bold">Start New Chat</h3>
              <button type="button" onClick={() => setShowNewChat(false)} className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Category</label>
                <select
                  value={newChatCategory}
                  onChange={(e) => setNewChatCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {supportCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Priority</label>
                <select
                  value={newChatPriority}
                  onChange={(e) => setNewChatPriority(e.target.value as SupportTicketPriority)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={SupportTicketPriority.LOW}>Low</option>
                  <option value={SupportTicketPriority.MEDIUM}>Medium</option>
                  <option value={SupportTicketPriority.HIGH}>High</option>
                  <option value={SupportTicketPriority.URGENT}>Urgent</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Subject *</label>
                <input
                  type="text"
                  value={newChatSubject}
                  onChange={(e) => setNewChatSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Message *</label>
                <textarea
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  placeholder="Describe your issue in detail"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowNewChat(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                  Cancel
                </button>
                <button type="button" onClick={() => void handleCreateNewChat()} disabled={isCreating} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors font-medium">
                  {isCreating ? 'Creating...' : 'Start Chat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerSupportChat;

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import supportService from '@/services/support.service';
import { SupportTicket, SupportTicketPriority } from '@/types';

interface CustomerServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
}

/**
 * Customer Service Modal Component
 * Allows users to create and manage support tickets
 * Similar to Grab/Shopee customer service functionality
 */
const CustomerServiceModal = ({ isOpen, onClose, orderId }: CustomerServiceModalProps) => {
  const [activeTab, setActiveTab] = useState<'create' | 'tickets'>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  // Form state
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [priority, setPriority] = useState<SupportTicketPriority>('MEDIUM');
  const [newMessage, setNewMessage] = useState('');

  // Load tickets on mount
  useEffect(() => {
    if (isOpen) {
      loadTickets();
    }
  }, [isOpen]);

  /**
   * Load all support tickets
   */
  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await supportService.getUserTickets();
      setTickets(data);
    } catch (e) {
      const message =
        e instanceof Error && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load ticket details
   */
  const loadTicketDetails = async (ticketId: string) => {
    try {
      const data = await supportService.getTicketById(ticketId);
      setSelectedTicket(data);
    } catch (e) {
      const message =
        e instanceof Error && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to load ticket');
    }
  };

  /**
   * Create new support ticket
   */
  const handleCreateTicket = async () => {
    if (!subject.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setWorking(true);
    try {
      const ticket = await supportService.createTicket(
        subject,
        description,
        category,
        orderId,
        priority
      );

      toast.success('Support ticket created successfully');
      setSubject('');
      setDescription('');
      setCategory('OTHER');
      setPriority('MEDIUM');
      setActiveTab('tickets');
      await loadTickets();
    } catch (e) {
      const message =
        e instanceof Error && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to create ticket');
    } finally {
      setWorking(false);
    }
  };

  /**
   * Send message in ticket
   */
  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setWorking(true);
    try {
      await supportService.addMessage(selectedTicket.id, newMessage);
      toast.success('Message sent');
      setNewMessage('');
      await loadTicketDetails(selectedTicket.id);
    } catch (e) {
      const message =
        e instanceof Error && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to send message');
    } finally {
      setWorking(false);
    }
  };

  /**
   * Close ticket
   */
  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    if (!confirm('Are you sure you want to close this ticket?')) return;

    setWorking(true);
    try {
      await supportService.closeTicket(selectedTicket.id);
      toast.success('Ticket closed');
      setSelectedTicket(null);
      await loadTickets();
    } catch (e) {
      const message =
        e instanceof Error && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to close ticket');
    } finally {
      setWorking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎧</span>
            <div>
              <h2 className="text-2xl font-bold">Customer Service</h2>
              <p className="text-sm text-primary-100">Get help with your orders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-primary-600 rounded-full p-2 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'tickets'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Tickets ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'create'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Create Ticket
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'tickets' ? (
            // Tickets List
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="spinner"></div>
                </div>
              ) : selectedTicket ? (
                // Ticket Detail View
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-2"
                  >
                    ← Back to Tickets
                  </button>

                  <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg text-gray-900">{selectedTicket.ticketNo}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          selectedTicket.status === 'OPEN'
                            ? 'bg-blue-100 text-blue-700'
                            : selectedTicket.status === 'IN_PROGRESS'
                              ? 'bg-yellow-100 text-yellow-700'
                              : selectedTicket.status === 'RESOLVED'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {selectedTicket.status}
                      </span>
                    </div>
                    <p className="text-gray-700 font-semibold mb-1">{selectedTicket.subject}</p>
                    <p className="text-sm text-gray-600">
                      Created: {new Date(selectedTicket.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">{selectedTicket.description}</p>
                  </div>

                  {/* Messages */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    <h4 className="font-bold text-gray-900">Messages</h4>
                    {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                      selectedTicket.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg ${
                            msg.senderId === selectedTicket.userId
                              ? 'bg-blue-50 border-l-4 border-blue-500'
                              : 'bg-gray-100 border-l-4 border-gray-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm text-gray-900">
                              {msg.sender?.firstName} {msg.sender?.lastName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm">{msg.message}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No messages yet</p>
                    )}
                  </div>

                  {/* Message Input */}
                  {selectedTicket.status !== 'CLOSED' && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="input flex-1"
                        disabled={working}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={working || !newMessage.trim()}
                        className="btn-primary"
                      >
                        Send
                      </button>
                    </div>
                  )}

                  {/* Close Button */}
                  {selectedTicket.status !== 'CLOSED' && (
                    <button
                      onClick={handleCloseTicket}
                      disabled={working}
                      className="btn-outline w-full"
                    >
                      Close Ticket
                    </button>
                  )}
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No support tickets yet</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="btn-primary"
                  >
                    Create Your First Ticket
                  </button>
                </div>
              ) : (
                // Tickets List
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => loadTicketDetails(ticket.id)}
                      className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900">{ticket.ticketNo}</span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            ticket.status === 'OPEN'
                              ? 'bg-blue-100 text-blue-700'
                              : ticket.status === 'IN_PROGRESS'
                                ? 'bg-yellow-100 text-yellow-700'
                                : ticket.status === 'RESOLVED'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-gray-700 font-semibold text-sm mb-1">{ticket.subject}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Create Ticket Form
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  className="input w-full"
                  disabled={working}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input w-full"
                  disabled={working}
                >
                  <option value="REFUND">Refund Request</option>
                  <option value="QUALITY">Quality Issue</option>
                  <option value="TECHNICAL">Technical Issue</option>
                  <option value="COURSE_CONTENT">Course Content</option>
                  <option value="PAYMENT">Payment Issue</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
                  className="input w-full"
                  disabled={working}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide detailed information about your issue..."
                  className="input w-full h-32 resize-none"
                  disabled={working}
                />
              </div>

              <button
                onClick={handleCreateTicket}
                disabled={working}
                className="btn-primary w-full"
              >
                {working ? 'Creating...' : 'Create Support Ticket'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerServiceModal;


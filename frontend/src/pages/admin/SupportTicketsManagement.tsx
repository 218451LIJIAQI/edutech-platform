import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import adminSupportService from '@/services/admin-support.service';
import { SupportTicket, SupportTicketStatus } from '@/types';

/**
 * Support Tickets Management Page Component
 * Admin can view, assign, respond to, and resolve support tickets
 */
const SupportTicketsManagement = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('OPEN');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [resolutionText, setResolutionText] = useState('');

  /**
   * Load tickets and stats
   */
  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketsData, statsData] = await Promise.all([
        adminSupportService.getAllTickets(
          filterStatus === 'ALL' ? undefined : filterStatus,
          filterPriority || undefined
        ),
        adminSupportService.getStats(),
      ]);
      setTickets(ticketsData.tickets);
      setStats(statsData);
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

  useEffect(() => {
    loadData();
  }, [filterStatus, filterPriority]);

  /**
   * Assign ticket to self
   */
  const handleAssign = async () => {
    if (!selectedTicket) return;
    setWorking(true);
    try {
      await adminSupportService.assignTicket(selectedTicket.id);
      toast.success('Ticket assigned to you');
      setSelectedTicket(null);
      await loadData();
    } catch (e) {
      const message =
        e instanceof Error && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to assign ticket');
    } finally {
      setWorking(false);
    }
  };

  /**
   * Add response to ticket
   */
  const handleAddResponse = async () => {
    if (!selectedTicket || !responseMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    setWorking(true);
    try {
      await adminSupportService.addResponse(selectedTicket.id, responseMessage);
      toast.success('Response added');
      setResponseMessage('');
      // Reload ticket details
      const updated = await adminSupportService.getTicketById(selectedTicket.id);
      setSelectedTicket(updated);
    } catch (e) {
      const message =
        e instanceof Error && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to add response');
    } finally {
      setWorking(false);
    }
  };

  /**
   * Resolve ticket
   */
  const handleResolve = async () => {
    if (!selectedTicket || !resolutionText.trim()) {
      toast.error('Please enter a resolution');
      return;
    }
    setWorking(true);
    try {
      await adminSupportService.resolveTicket(selectedTicket.id, resolutionText);
      toast.success('Ticket resolved');
      setResolutionText('');
      setSelectedTicket(null);
      await loadData();
    } catch (e) {
      const message =
        e instanceof Error && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to resolve ticket');
    } finally {
      setWorking(false);
    }
  };

  /**
   * Close ticket
   */
  const handleClose = async () => {
    if (!selectedTicket) return;
    if (!confirm('Are you sure you want to close this ticket?')) return;
    setWorking(true);
    try {
      await adminSupportService.closeTicket(selectedTicket.id);
      toast.success('Ticket closed');
      setSelectedTicket(null);
      await loadData();
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

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-700';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-700';
      case 'RESOLVED':
        return 'bg-green-100 text-green-700';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  /**
   * Get priority badge color
   */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-100 text-gray-700';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-700';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700';
      case 'URGENT':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Support Tickets</h2>
        <p className="text-gray-600 mt-1">Manage customer support requests</p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 bg-blue-50 border-l-4 border-blue-500">
            <div className="text-sm text-gray-600">Open</div>
            <div className="text-2xl font-bold text-blue-700">{stats.open}</div>
          </div>
          <div className="card p-4 bg-yellow-50 border-l-4 border-yellow-500">
            <div className="text-sm text-gray-600">In Progress</div>
            <div className="text-2xl font-bold text-yellow-700">{stats.inProgress}</div>
          </div>
          <div className="card p-4 bg-green-50 border-l-4 border-green-500">
            <div className="text-sm text-gray-600">Resolved</div>
            <div className="text-2xl font-bold text-green-700">{stats.resolved}</div>
          </div>
          <div className="card p-4 bg-gray-50 border-l-4 border-gray-500">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="ALL">All</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">Priority</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="input"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="card shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No tickets found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{ticket.ticketNo}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {ticket.user
                        ? `${ticket.user.firstName} ${ticket.user.lastName}`
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{ticket.category}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicket(ticket);
                        }}
                        className="text-primary-600 hover:text-primary-700 font-semibold"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6 flex items-center justify-between sticky top-0">
              <div>
                <h3 className="text-2xl font-bold">{selectedTicket.ticketNo}</h3>
                <p className="text-sm text-primary-100">{selectedTicket.subject}</p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-white hover:bg-primary-600 rounded-full p-2"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Ticket Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Customer</div>
                  <div className="font-semibold text-gray-900">
                    {selectedTicket.user
                      ? `${selectedTicket.user.firstName} ${selectedTicket.user.lastName}`
                      : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">{selectedTicket.user?.email}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Category</div>
                  <div className="font-semibold text-gray-900">{selectedTicket.category}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Priority</div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(selectedTicket.priority)}`}>
                    {selectedTicket.priority}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Messages */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Messages</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg ${
                          msg.senderId === selectedTicket.userId
                            ? 'bg-blue-50 border-l-4 border-blue-500'
                            : 'bg-gray-50 border-l-4 border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
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
              </div>

              {/* Add Response */}
              {selectedTicket.status !== 'CLOSED' && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Add Response</h4>
                  <textarea
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder="Type your response..."
                    className="input w-full h-20 resize-none mb-2"
                    disabled={working}
                  />
                  <button
                    onClick={handleAddResponse}
                    className="btn-primary"
                    disabled={working}
                  >
                    Send Response
                  </button>
                </div>
              )}

              {/* Resolution */}
              {selectedTicket.status === 'IN_PROGRESS' && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Resolve Ticket</h4>
                  <textarea
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Describe the resolution..."
                    className="input w-full h-20 resize-none mb-2"
                    disabled={working}
                  />
                  <button
                    onClick={handleResolve}
                    className="btn-primary"
                    disabled={working}
                  >
                    Mark as Resolved
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedTicket.status === 'OPEN' && (
                  <button
                    onClick={handleAssign}
                    className="flex-1 btn-primary"
                    disabled={working}
                  >
                    Assign to Me
                  </button>
                )}
                {selectedTicket.status !== 'CLOSED' && (
                  <button
                    onClick={handleClose}
                    className="flex-1 btn-outline"
                    disabled={working}
                  >
                    Close Ticket
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTicketsManagement;


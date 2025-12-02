import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Headphones,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  X,
  Loader2,
  Eye,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import adminSupportService from '@/services/admin-support.service';
import { SupportTicket } from '@/types';
import { usePageTitle } from '@/hooks';

/**
 * Support Tickets Management Page Component
 * Admin can view, assign, respond to, and resolve support tickets
 */
const SupportTicketsManagement = () => {
  usePageTitle('Support Tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [stats, setStats] = useState<{
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    total: number;
  } | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [resolutionText, setResolutionText] = useState('');

  /**
   * Extract error message from error object
   */
  const getErrorMessage = useCallback((e: unknown): string | undefined => {
    if (e instanceof Error && 'response' in e) {
      return (e as { response?: { data?: { message?: string } } }).response?.data?.message;
    }
    return undefined;
  }, []);

  /**
   * Load tickets and stats
   */
  const loadData = useCallback(async () => {
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
      const message = getErrorMessage(e);
      toast.error(message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, getErrorMessage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      const message = getErrorMessage(e);
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
      const message = getErrorMessage(e);
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
      const message = getErrorMessage(e);
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
    if (!window.confirm('Are you sure you want to close this ticket?')) return;
    setWorking(true);
    try {
      await adminSupportService.closeTicket(selectedTicket.id);
      toast.success('Ticket closed');
      setSelectedTicket(null);
      await loadData();
    } catch (e) {
      const message = getErrorMessage(e);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/25 ring-4 ring-white">
              <Headphones className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Support <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Tickets</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">Manage customer support requests</p>
            </div>
          </div>
        </div>

        {/* Statistics - Clickable to filter */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
            <button
              onClick={() => setFilterStatus('OPEN')}
              className={`group bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden text-left ${filterStatus === 'OPEN' ? 'border-blue-400 ring-2 ring-blue-200' : 'border-blue-100'}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-100/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Open</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.open}</div>
            </button>
            <button
              onClick={() => setFilterStatus('IN_PROGRESS')}
              className={`group bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden text-left ${filterStatus === 'IN_PROGRESS' ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-yellow-100'}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-yellow-100/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-yellow-100 rounded-xl group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider">In Progress</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.inProgress}</div>
            </button>
            <button
              onClick={() => setFilterStatus('RESOLVED')}
              className={`group bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden text-left ${filterStatus === 'RESOLVED' ? 'border-green-400 ring-2 ring-green-200' : 'border-green-100'}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-100/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-green-100 rounded-xl group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Resolved</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.resolved}</div>
            </button>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`group bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden text-left ${filterStatus === 'ALL' ? 'border-gray-400 ring-2 ring-gray-200' : 'border-gray-200'}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-gray-100/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-gray-100 rounded-xl group-hover:scale-110 transition-transform">
                  <Headphones className="w-5 h-5 text-gray-600" />
                </div>
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Total</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-card border border-gray-100 mb-8">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                aria-label="Filter by status"
              >
                <option value="ALL">All</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">Priority</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                aria-label="Filter by priority"
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse flex items-center justify-center mb-4">
                <Headphones className="w-6 h-6 text-white animate-pulse" />
              </div>
              <p className="text-gray-500 font-medium">Loading tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No tickets found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Ticket
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent cursor-pointer transition-all duration-200"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <MessageSquare className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{ticket.ticketNo}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {ticket.user?.firstName?.charAt(0) || '?'}
                          </div>
                          <span className="text-gray-700">
                            {ticket.user
                              ? `${ticket.user.firstName} ${ticket.user.lastName}`
                              : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{ticket.category}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(ticket);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-semibold text-sm hover:bg-indigo-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
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

      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Headphones className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{selectedTicket.ticketNo}</h3>
                  <p className="text-sm text-indigo-100">{selectedTicket.subject}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
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
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Send className="w-4 h-4 text-indigo-600" />
                    Add Response
                  </h4>
                  <textarea
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder="Type your response..."
                    className="w-full h-20 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    disabled={working}
                  />
                  <button
                    onClick={handleAddResponse}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/25"
                    disabled={working}
                  >
                    {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Response
                  </button>
                </div>
              )}

              {/* Resolution */}
              {selectedTicket.status === 'IN_PROGRESS' && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Resolve Ticket
                  </h4>
                  <textarea
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Describe the resolution..."
                    className="w-full h-20 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    disabled={working}
                  />
                  <button
                    onClick={handleResolve}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/25"
                    disabled={working}
                  >
                    {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Mark as Resolved
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                {selectedTicket.status === 'OPEN' && (
                  <button
                    onClick={handleAssign}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/25"
                    disabled={working}
                  >
                    {working ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                    Assign to Me
                  </button>
                )}
                {selectedTicket.status !== 'CLOSED' && (
                  <button
                    onClick={handleClose}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                    disabled={working}
                  >
                    <XCircle className="w-5 h-5" />
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

import { type ChangeEvent, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import clientLogger from '@/utils/logger';
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
  Paperclip,
  ExternalLink,
  RefreshCcw,
  Search,
} from 'lucide-react';
import adminSupportService from '@/services/admin-support.service';
import uploadService from '@/services/upload.service';
import { SupportTicket } from '@/types';
import { useOverlayAccessibility, usePageTitle } from '@/hooks';
import { extractErrorMessage } from '@/utils/error-handler';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import {
  SUPPORT_ATTACHMENT_ACCEPT,
  buildSupportConversationEntries,
  getSupportAttachmentLabel,
  validateSupportAttachmentFile,
} from '@/utils/support-thread';
import { openProtectedAsset } from '@/utils/protected-assets';
import { toStorableBackendAssetPath } from '@/utils/runtime';

type PendingAttachment = {
  readonly name: string;
  readonly url: string;
};

const SupportTicketsManagement = () => {
  usePageTitle('Support Tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isTicketLoading, setIsTicketLoading] = useState(false);
  const [ticketLoadError, setTicketLoadError] = useState<string | null>(null);
  const [showCloseTicketModal, setShowCloseTicketModal] = useState(false);
  const [stats, setStats] = useState<{
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    total: number;
  } | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [responseAttachment, setResponseAttachment] = useState<PendingAttachment | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [isUploadingResponseAttachment, setIsUploadingResponseAttachment] = useState(false);
  const ticketModalRef = useRef<HTMLDivElement | null>(null);
  const ticketModalCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const responseAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const listRequestRef = useRef(0);
  const detailRequestRef = useRef(0);

  const hasActiveFilters =
    filterStatus !== 'ALL' || Boolean(filterPriority) || Boolean(searchQuery.trim());

  const conversationEntries = buildSupportConversationEntries(selectedTicket);

  const loadData = useCallback(async () => {
    const requestId = ++listRequestRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const [ticketsData, statsData] = await Promise.all([
        adminSupportService.getAllTickets(
          filterStatus === 'ALL' ? undefined : filterStatus,
          filterPriority || undefined
        ),
        adminSupportService.getStats(),
      ]);
      if (requestId !== listRequestRef.current) {
        return;
      }
      setTickets(ticketsData.tickets);
      setStats(statsData);
    } catch (error) {
      if (requestId !== listRequestRef.current) {
        return;
      }
      clientLogger.error('Failed to load support tickets:', error);
      const message = extractErrorMessage(error, 'Failed to load tickets');
      setLoadError(message);
      toast.error(message);
    } finally {
      if (requestId === listRequestRef.current) {
        setLoading(false);
      }
    }
  }, [filterStatus, filterPriority]);

  useEffect(() => {
    void loadData();
    return () => {
      listRequestRef.current += 1;
      detailRequestRef.current += 1;
    };
  }, [loadData]);

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) => {
      const ticketNo = t.ticketNo.toLowerCase();
      const subject = t.subject.toLowerCase();
      const customer = `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.toLowerCase();
      const email = t.user?.email?.toLowerCase() || '';
      return (
        ticketNo.includes(q) ||
        subject.includes(q) ||
        customer.includes(q) ||
        email.includes(q)
      );
    });
  }, [tickets, searchQuery]);

  const closeTicketModal = useCallback(() => {
    if (working || isUploadingResponseAttachment) {
      return;
    }
    detailRequestRef.current += 1;
    setIsTicketModalOpen(false);
    setSelectedTicket(null);
    setSelectedTicketId(null);
    setTicketLoadError(null);
    setResponseMessage('');
    setResponseAttachment(null);
    setResolutionText('');
  }, [isUploadingResponseAttachment, working]);

  useOverlayAccessibility({
    isOpen: isTicketModalOpen && !showCloseTicketModal,
    containerRef: ticketModalRef,
    initialFocusRef: ticketModalCloseButtonRef,
    onClose: closeTicketModal,
    trapFocus: true,
    lockBodyScroll: true,
  });

  const refreshTicketDetails = useCallback(async (ticketId: string) => {
    const requestId = ++detailRequestRef.current;
    try {
      const ticket = await adminSupportService.getTicketById(ticketId);
      if (requestId !== detailRequestRef.current) {
        return;
      }
      setSelectedTicket(ticket);
      setTicketLoadError(null);
    } catch (error) {
      if (requestId !== detailRequestRef.current) {
        return;
      }
      clientLogger.error(`Failed to refresh support ticket ${ticketId}:`, error);
      toast.error(extractErrorMessage(error, 'Failed to refresh ticket details'));
    }
  }, []);

  const openTicketDetails = useCallback(async (ticketId: string) => {
    const requestId = ++detailRequestRef.current;
    setIsTicketModalOpen(true);
    setIsTicketLoading(true);
    setTicketLoadError(null);
    setSelectedTicket(null);
    setSelectedTicketId(ticketId);
    setResponseMessage('');
    setResponseAttachment(null);
    setResolutionText('');

    try {
      const ticket = await adminSupportService.getTicketById(ticketId);
      if (requestId !== detailRequestRef.current) {
        return;
      }
      setSelectedTicket(ticket);
    } catch (error) {
      if (requestId !== detailRequestRef.current) {
        return;
      }
      clientLogger.error(`Failed to load support ticket ${ticketId}:`, error);
      const errorMessage = extractErrorMessage(error, 'Failed to load ticket details');
      setTicketLoadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      if (requestId === detailRequestRef.current) {
        setIsTicketLoading(false);
      }
    }
  }, []);

  const handleAssign = async () => {
    if (!selectedTicket || working) return;
    setWorking(true);
    try {
      await adminSupportService.assignTicket(selectedTicket.id);
      toast.success('Ticket assigned to you');
      await Promise.all([
        loadData(),
        refreshTicketDetails(selectedTicket.id),
      ]);
    } catch (error) {
      clientLogger.error(`Failed to assign support ticket ${selectedTicket.id}:`, error);
      toast.error(extractErrorMessage(error, 'Failed to assign ticket'));
    } finally {
      setWorking(false);
    }
  };

  const handleAddResponse = async () => {
    if (!selectedTicket || working || !responseMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    setWorking(true);
    try {
      await adminSupportService.addResponse(
        selectedTicket.id,
        responseMessage,
        responseAttachment?.url
      );
      toast.success('Response added');
      setResponseMessage('');
      setResponseAttachment(null);
      await Promise.all([
        loadData(),
        refreshTicketDetails(selectedTicket.id),
      ]);
    } catch (error) {
      clientLogger.error(`Failed to add response to support ticket ${selectedTicket.id}:`, error);
      toast.error(extractErrorMessage(error, 'Failed to add response'));
    } finally {
      setWorking(false);
    }
  };

  const handleResponseAttachmentChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateSupportAttachmentFile(file);
    if (validationError) {
      toast.error(validationError);
      event.target.value = '';
      return;
    }

    try {
      setIsUploadingResponseAttachment(true);
      const result = await uploadService.uploadFile(file, 'support-attachments');
      setResponseAttachment({
        name: result.filename || file.name,
        url: toStorableBackendAssetPath(result.url),
      });
      toast.success('Attachment uploaded');
    } catch (error) {
      clientLogger.error('Failed to upload admin support attachment:', error);
      toast.error(extractErrorMessage(error, 'Failed to upload attachment'));
    } finally {
      setIsUploadingResponseAttachment(false);
      event.target.value = '';
    }
  };

  const handleOpenAttachment = async (assetUrl: string) => {
    try {
      await openProtectedAsset(assetUrl);
    } catch (error) {
      clientLogger.error('Failed to open support attachment:', error);
      toast.error(extractErrorMessage(error, 'Failed to open attachment'));
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket || working || !resolutionText.trim()) {
      toast.error('Please enter a resolution');
      return;
    }
    setWorking(true);
    try {
      await adminSupportService.resolveTicket(selectedTicket.id, resolutionText);
      toast.success('Ticket resolved');
      setResolutionText('');
      await Promise.all([
        loadData(),
        refreshTicketDetails(selectedTicket.id),
      ]);
    } catch (error) {
      clientLogger.error(`Failed to resolve support ticket ${selectedTicket.id}:`, error);
      toast.error(extractErrorMessage(error, 'Failed to resolve ticket'));
    } finally {
      setWorking(false);
    }
  };

  const handleClose = async () => {
    if (!selectedTicket || working) return;
    setWorking(true);
    try {
      await adminSupportService.closeTicket(selectedTicket.id);
      toast.success('Ticket closed');
      setShowCloseTicketModal(false);
      await loadData();
      await refreshTicketDetails(selectedTicket.id);
    } catch (error) {
      clientLogger.error(`Failed to close support ticket ${selectedTicket.id}:`, error);
      toast.error(extractErrorMessage(error, 'Failed to close ticket'));
    } finally {
      setWorking(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-100 text-gray-700';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/25 ring-4 ring-white">
              <Headphones className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                Support <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Tickets</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">Manage customer support requests</p>
            </div>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8 tabular-nums">
            <button
              type="button"
              onClick={() => setFilterStatus('OPEN')}
              className={`group bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden text-left ${filterStatus === 'OPEN' ? 'border-blue-400 ring-2 ring-blue-200' : 'border-blue-100'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-100 rounded-xl">
                  <MessageSquare className="w-5 h-5 text-blue-700" />
                </div>
                <span className="text-xs font-bold text-blue-700 uppercase">Open</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.open}</div>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('IN_PROGRESS')}
              className={`group bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden text-left ${filterStatus === 'IN_PROGRESS' ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-yellow-100'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-yellow-100 rounded-xl">
                  <Clock className="w-5 h-5 text-yellow-700" />
                </div>
                <span className="text-xs font-bold text-yellow-700 uppercase">In Progress</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.inProgress}</div>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('RESOLVED')}
              className={`group bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden text-left ${filterStatus === 'RESOLVED' ? 'border-green-400 ring-2 ring-green-200' : 'border-green-100'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-green-100 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-700" />
                </div>
                <span className="text-xs font-bold text-green-700 uppercase">Resolved</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.resolved}</div>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`group bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden text-left ${filterStatus === 'ALL' ? 'border-gray-400 ring-2 ring-gray-200' : 'border-gray-200'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-gray-100 rounded-xl">
                  <Headphones className="w-5 h-5 text-gray-700" />
                </div>
                <span className="text-xs font-bold text-gray-700 uppercase">Total</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            </button>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-card border border-gray-100 mb-8">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="ticket-status-filter" className="text-xs font-bold text-gray-600 uppercase block mb-2">
                Status
              </label>
              <select
                id="ticket-status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="ALL">All</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label htmlFor="ticket-priority-filter" className="text-xs font-bold text-gray-600 uppercase block mb-2">
                Priority
              </label>
              <select
                id="ticket-priority-filter"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="flex-1 min-w-[240px]">
              <label htmlFor="ticket-search-input" className="text-xs font-bold text-gray-600 uppercase block mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="ticket-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ticket no, subject, or customer..."
                  className="input pl-10 py-2.5 text-sm"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus('ALL');
                  setFilterPriority('');
                  setSearchQuery('');
                }}
                className="btn-secondary btn-sm py-2.5"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse motion-reduce:animate-none flex items-center justify-center mb-4">
                <Headphones className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-500 font-medium">Loading tickets...</p>
            </div>
          ) : loadError ? (
            <div role="alert" className="p-12 text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <h2 className="text-lg font-bold text-gray-900">Unable to load support tickets</h2>
              <p className="text-sm text-gray-600">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadData()}
                className="btn-primary btn-sm inline-flex items-center gap-1.5"
              >
                <RefreshCcw className="w-4 h-4" />
                Retry
              </button>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                {hasActiveFilters ? 'No tickets match your filters' : 'No support tickets yet'}
              </h2>
              <p className="text-sm text-gray-500">
                {hasActiveFilters
                  ? 'Try clearing your status, priority, or search filters.'
                  : 'Incoming student and teacher support tickets will appear here.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus('ALL');
                    setFilterPriority('');
                    setSearchQuery('');
                  }}
                  className="btn-secondary btn-sm"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Ticket</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Category</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Priority</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent cursor-pointer transition-all duration-200"
                      onClick={() => {
                        void openTicketDetails(ticket.id);
                      }}
                    >
                      <td className="px-6 py-4 tabular-nums">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <MessageSquare className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{ticket.ticketNo}</div>
                            <div className="text-xs text-gray-500">
                              Updated {new Date(ticket.updatedAt).toLocaleDateString()}
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
                          {ticket.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void openTicketDetails(ticket.id);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-semibold text-sm hover:bg-indigo-100 transition-colors"
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
      {isTicketModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-modal flex items-center justify-center p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !working) {
              closeTicketModal();
            }
          }}
        >
          <div
            ref={ticketModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-ticket-modal-title"
            aria-describedby="support-ticket-modal-description"
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Headphones className="w-6 h-6" />
                </div>
                <div>
                  <h2 id="support-ticket-modal-title" className="text-2xl font-bold text-white tabular-nums">
                    {selectedTicket?.ticketNo || 'Ticket Details'}
                  </h2>
                  <p className="text-sm text-indigo-100">
                    {selectedTicket?.subject || 'Loading ticket information'}
                  </p>
                </div>
              </div>
              <button
                ref={ticketModalCloseButtonRef}
                type="button"
                onClick={closeTicketModal}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p id="support-ticket-modal-description" className="sr-only">
                Review support ticket details, respond to the customer, and resolve or close the ticket.
              </p>
              {isTicketLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
                  <p className="text-gray-600 font-medium">Loading ticket details...</p>
                </div>
              ) : ticketLoadError ? (
                <div role="alert" className="text-center py-12">
                  <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
                  <p className="text-gray-900 font-semibold mb-2">Unable to load ticket details</p>
                  <p className="text-gray-600 mb-4">{ticketLoadError}</p>
                  <div className="flex items-center justify-center gap-3">
                    {selectedTicketId ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedTicketId) {
                            void openTicketDetails(selectedTicketId);
                          }
                        }}
                        className="btn-primary"
                      >
                        Retry
                      </button>
                    ) : null}
                    <button type="button" onClick={closeTicketModal} className="btn-outline">
                      Close
                    </button>
                  </div>
                </div>
              ) : selectedTicket ? (
                <>
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
                        {selectedTicket.status.replace(/_/g, ' ')}
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

                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 text-base">Conversation</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {conversationEntries.length > 0 ? (
                        conversationEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className={`p-4 rounded-lg ${
                              entry.senderId === selectedTicket.userId
                                ? 'bg-blue-50 border-l-4 border-blue-500'
                                : 'bg-gray-50 border-l-4 border-gray-400'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-gray-900">
                                  {entry.senderId === selectedTicket.userId
                                    ? entry.sender?.firstName && entry.sender?.lastName
                                      ? `${entry.sender.firstName} ${entry.sender.lastName}`
                                      : 'Customer'
                                    : entry.sender?.firstName && entry.sender?.lastName
                                      ? `${entry.sender.firstName} ${entry.sender.lastName}`
                                      : 'Support'}
                                </span>
                                {entry.kind === 'initial_request' && (
                                  <span className="px-2 py-0.5 rounded-full bg-white/80 text-[10px] font-semibold text-blue-700">
                                    Initial request
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 tabular-nums">
                                {new Date(entry.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-700 text-sm whitespace-pre-wrap">
                              {entry.message}
                            </p>
                            {entry.attachment ? (
                              <button
                                type="button"
                                onClick={() => void handleOpenAttachment(entry.attachment!)}
                                className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50"
                              >
                                <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">
                                  {getSupportAttachmentLabel(entry.attachment)}
                                </span>
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              </button>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No conversation history yet</p>
                      )}
                    </div>
                  </div>

                  {selectedTicket.status !== 'CLOSED' && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <label htmlFor="admin-ticket-response" className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Send className="w-4 h-4 text-indigo-600" />
                        Add Response
                      </label>
                      <textarea
                        id="admin-ticket-response"
                        value={responseMessage}
                        onChange={(e) => setResponseMessage(e.target.value)}
                        placeholder="Type your response..."
                        maxLength={5000}
                        className="w-full h-20 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        disabled={working || isUploadingResponseAttachment}
                      />
                      <input
                        ref={responseAttachmentInputRef}
                        type="file"
                        accept={SUPPORT_ATTACHMENT_ACCEPT}
                        className="hidden"
                        onChange={(event) => void handleResponseAttachmentChange(event)}
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => responseAttachmentInputRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                          disabled={working || isUploadingResponseAttachment}
                        >
                          {isUploadingResponseAttachment ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Paperclip className="w-4 h-4" />
                          )}
                          {isUploadingResponseAttachment ? 'Uploading...' : 'Attach file'}
                        </button>
                        {responseAttachment && (
                          <div className="inline-flex max-w-full items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                            <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{responseAttachment.name}</span>
                            <button
                              type="button"
                              onClick={() => setResponseAttachment(null)}
                              className="font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleAddResponse()}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                        disabled={
                          working ||
                          isUploadingResponseAttachment ||
                          !responseMessage.trim()
                        }
                      >
                        {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send Response
                      </button>
                    </div>
                  )}

                  {selectedTicket.status === 'IN_PROGRESS' && (
                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                      <label htmlFor="admin-ticket-resolution" className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Resolve Ticket
                      </label>
                      <textarea
                        id="admin-ticket-resolution"
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        placeholder="Describe the resolution..."
                        maxLength={3000}
                        className="w-full h-20 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        disabled={working}
                      />
                      <button
                        type="button"
                        onClick={() => void handleResolve()}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/25 disabled:opacity-50"
                        disabled={working || !resolutionText.trim()}
                      >
                        {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Mark as Resolved
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    {selectedTicket.status === 'OPEN' && (
                      <button
                        type="button"
                        onClick={() => void handleAssign()}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/25"
                        disabled={working}
                      >
                        {working ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                        Assign to Me
                      </button>
                    )}
                    {selectedTicket.status !== 'CLOSED' && (
                      <button
                        type="button"
                        onClick={() => setShowCloseTicketModal(true)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                        disabled={working}
                      >
                        <XCircle className="w-5 h-5" />
                        Close Ticket
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Ticket details are unavailable.</p>
                </div>
              )}
            </div>
          </div>
        </div>,
          document.body
        )}

      <ConfirmationModal
        isOpen={showCloseTicketModal}
        title="Close support ticket"
        description={
          selectedTicket
            ? `Close ticket ${selectedTicket.ticketNo}. This stops further action on the current support workflow.`
            : ''
        }
        confirmLabel="Close Ticket"
        tone="warning"
        isLoading={working}
        onClose={() => {
          if (!working) {
            setShowCloseTicketModal(false);
          }
        }}
        onConfirm={handleClose}
      />
    </div>
  );
};

export default SupportTicketsManagement;

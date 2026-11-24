import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  RefreshCcw,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  FileText,
  X,
  Check,
  Loader2,
  Eye,
  AlertCircle,
  Search,
} from 'lucide-react';
import adminRefundService from '@/services/admin-refund.service';
import { Refund } from '@/types';
import { useOverlayAccessibility, usePageTitle } from '@/hooks';
import { extractErrorMessage } from '@/utils/error-handler';

const RefundsManagement = () => {
  usePageTitle('Refund Management');
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [stats, setStats] = useState<{
    pending: number;
    approved: number;
    processing: number;
    completed: number;
    rejected: number;
    totalRefundAmount: number;
    completedRefundAmount: number;
  } | null>(null);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const refundDetailModalRef = useRef<HTMLDivElement | null>(null);
  const refundDetailCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const approveModalRef = useRef<HTMLDivElement | null>(null);
  const approveNotesRef = useRef<HTMLTextAreaElement | null>(null);
  const rejectModalRef = useRef<HTMLDivElement | null>(null);
  const rejectReasonRef = useRef<HTMLTextAreaElement | null>(null);
  const requestIdRef = useRef(0);

  const hasActiveFilters = filter !== 'ALL' || Boolean(searchQuery.trim());

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const [refundsData, statsData] = await Promise.all([
        adminRefundService.getAllRefunds(filter === 'ALL' ? undefined : filter),
        adminRefundService.getStats(),
      ]);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setRefunds(refundsData.refunds);
      setStats(statsData);
    } catch (e) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      const message = extractErrorMessage(e, 'Failed to load refunds');
      setLoadError(message);
      toast.error(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [filter]);

  const filteredRefunds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return refunds;
    return refunds.filter((r) => {
      const orderNo = r.order?.orderNo?.toLowerCase() || '';
      const customer = `${r.order?.user?.firstName || ''} ${r.order?.user?.lastName || ''}`.toLowerCase();
      const email = r.order?.user?.email?.toLowerCase() || '';
      const category = r.reasonCategory?.toLowerCase() || '';
      return (
        orderNo.includes(q) ||
        customer.includes(q) ||
        email.includes(q) ||
        category.includes(q)
      );
    });
  }, [refunds, searchQuery]);

  useEffect(() => {
    void loadData();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadData]);

  const closeRefundDetails = useCallback(() => {
    if (working) {
      return;
    }
    setSelectedRefund(null);
    setShowApproveModal(false);
    setShowRejectModal(false);
    setApprovalNotes('');
    setRejectionReason('');
    setRejectError(null);
  }, [working]);

  const closeApproveModal = useCallback(() => {
    if (working) {
      return;
    }
    setShowApproveModal(false);
    setApprovalNotes('');
  }, [working]);

  const closeRejectModal = useCallback(() => {
    if (working) {
      return;
    }
    setShowRejectModal(false);
    setRejectionReason('');
    setRejectError(null);
  }, [working]);

  useOverlayAccessibility({
    isOpen: Boolean(selectedRefund) && !showApproveModal && !showRejectModal,
    containerRef: refundDetailModalRef,
    initialFocusRef: refundDetailCloseButtonRef,
    onClose: closeRefundDetails,
    trapFocus: true,
    lockBodyScroll: true,
  });

  useOverlayAccessibility({
    isOpen: showApproveModal && Boolean(selectedRefund),
    containerRef: approveModalRef,
    initialFocusRef: approveNotesRef,
    onClose: closeApproveModal,
    trapFocus: true,
    lockBodyScroll: true,
  });

  useOverlayAccessibility({
    isOpen: showRejectModal && Boolean(selectedRefund),
    containerRef: rejectModalRef,
    initialFocusRef: rejectReasonRef,
    onClose: closeRejectModal,
    trapFocus: true,
    lockBodyScroll: true,
  });

  const handleApprove = async () => {
    if (!selectedRefund || working) return;
    setWorking(true);
    try {
      await adminRefundService.approveRefund(selectedRefund.id, approvalNotes);
      toast.success('Refund approved');
      setShowApproveModal(false);
      setApprovalNotes('');
      setSelectedRefund(null);
      await loadData();
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Failed to approve refund'));
    } finally {
      setWorking(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRefund || working) return;
    if (!rejectionReason.trim()) {
      setRejectError('Please provide a rejection reason.');
      return;
    }
    setRejectError(null);
    setWorking(true);
    try {
      await adminRefundService.rejectRefund(selectedRefund.id, rejectionReason);
      toast.success('Refund rejected');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedRefund(null);
      await loadData();
    } catch (e) {
      const message = extractErrorMessage(e, 'Failed to reject refund');
      setRejectError(message);
      toast.error(message);
    } finally {
      setWorking(false);
    }
  };

  const handleMarkProcessing = async () => {
    if (!selectedRefund || working) return;
    setWorking(true);
    try {
      await adminRefundService.markAsProcessing(selectedRefund.id);
      toast.success('Refund marked as processing');
      setSelectedRefund(null);
      await loadData();
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Failed to update refund'));
    } finally {
      setWorking(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedRefund || working) return;
    setWorking(true);
    try {
      await adminRefundService.completeRefund(selectedRefund.id);
      toast.success('Refund completed');
      setSelectedRefund(null);
      await loadData();
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Failed to complete refund'));
    } finally {
      setWorking(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800';
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRefundMethodLabel = (refundMethod?: string) => {
    switch (refundMethod) {
      case 'ORIGINAL_PAYMENT':
        return 'Original Payment';
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      case 'WALLET':
        return 'Legacy Platform Wallet (Unavailable)';
      default:
        return 'N/A';
    }
  };

  const getFilterLabel = (value: string) => {
    switch (value) {
      case 'ALL':
        return 'all';
      case 'PENDING':
        return 'pending';
      case 'APPROVED':
        return 'approved';
      case 'PROCESSING':
        return 'processing';
      case 'COMPLETED':
        return 'completed';
      case 'REJECTED':
        return 'rejected';
      default:
        return value.toLowerCase();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/25 ring-4 ring-white">
              <RefreshCcw className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                Refund <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Management</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">Review and process refund requests</p>
            </div>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-5 mb-8 tabular-nums">
            {[
              { key: 'PENDING', label: 'Pending', value: stats.pending, Icon: Clock, active: 'border-yellow-400 ring-2 ring-yellow-200', idle: 'border-yellow-100', badge: 'bg-yellow-100', text: 'text-yellow-700' },
              { key: 'APPROVED', label: 'Approved', value: stats.approved, Icon: CheckCircle, active: 'border-blue-400 ring-2 ring-blue-200', idle: 'border-blue-100', badge: 'bg-blue-100', text: 'text-blue-700' },
              { key: 'PROCESSING', label: 'Processing', value: stats.processing, Icon: Loader2, active: 'border-purple-400 ring-2 ring-purple-200', idle: 'border-purple-100', badge: 'bg-purple-100', text: 'text-purple-700' },
              { key: 'COMPLETED', label: 'Completed', value: stats.completed, Icon: Check, active: 'border-green-400 ring-2 ring-green-200', idle: 'border-green-100', badge: 'bg-green-100', text: 'text-green-700' },
              { key: 'REJECTED', label: 'Rejected', value: stats.rejected, Icon: XCircle, active: 'border-red-400 ring-2 ring-red-200', idle: 'border-red-100', badge: 'bg-red-100', text: 'text-red-700' },
            ].map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => setFilter(card.key)}
                className={`group bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden text-left ${filter === card.key ? card.active : card.idle}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2.5 ${card.badge} rounded-xl`}>
                    <card.Icon className={`w-5 h-5 ${card.text}`} />
                  </div>
                  <span className={`text-xs font-bold ${card.text} uppercase`}>{card.label}</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{card.value}</div>
              </button>
            ))}
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-card border border-gray-100 mb-8">
          <div className="flex flex-wrap gap-2">
            {['ALL', 'PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  filter === status
                    ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-lg shadow-primary-500/25'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <label htmlFor="refund-search-input" className="sr-only">
                Search refund requests
              </label>
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="refund-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order no, customer, email, or category..."
                className="input pl-10 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="btn-secondary btn-sm"
                >
                  Clear Filters
                </button>
              )}
              <p className="text-sm text-gray-500 tabular-nums">
                Showing {filteredRefunds.length} {getFilterLabel(filter)} refund request(s).
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse motion-reduce:animate-none flex items-center justify-center mb-4">
                <RefreshCcw className="w-6 h-6 text-white animate-spin motion-reduce:animate-none" />
              </div>
              <p className="text-gray-500 font-medium">Loading refunds...</p>
            </div>
          ) : loadError ? (
            <div role="alert" className="p-12 text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <h2 className="text-lg font-bold text-gray-900">Unable to load refund requests</h2>
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
          ) : filteredRefunds.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                {hasActiveFilters
                  ? `No ${getFilterLabel(filter)} refund requests match your filters`
                  : 'No refund requests submitted yet'}
              </h2>
              <p className="text-sm text-gray-500">
                {hasActiveFilters
                  ? 'Try clearing your search query or switching to All.'
                  : 'Student refund requests will appear here when submitted.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setFilter('ALL');
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
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Order</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Customer</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Reason</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRefunds.map((refund) => (
                    <tr
                      key={refund.id}
                      className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent cursor-pointer transition-all duration-200"
                      onClick={() => setSelectedRefund(refund)}
                    >
                      <td className="px-6 py-4 tabular-nums">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <FileText className="w-4 h-4 text-gray-600" />
                          </div>
                          <span className="font-semibold text-gray-900">{refund.order?.orderNo || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {refund.order?.user?.firstName?.charAt(0) || '?'}
                          </div>
                          <span className="text-gray-700">
                            {refund.order?.user
                              ? `${refund.order.user.firstName} ${refund.order.user.lastName}`
                              : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums">
                        <div className="inline-flex items-center justify-end gap-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-bold text-gray-900">{refund.amount.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {refund.reasonCategory || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getStatusColor(refund.status)}`}>
                          {refund.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRefund(refund);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg font-semibold text-sm hover:bg-primary-100 transition-colors"
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

      {/* Refund Detail Modal */}
      {selectedRefund && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !working) {
              closeRefundDetails();
            }
          }}
        >
          <div
            ref={refundDetailModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal={!showApproveModal && !showRejectModal}
            aria-hidden={showApproveModal || showRejectModal}
            aria-labelledby="refund-detail-modal-title"
            aria-describedby="refund-detail-modal-description"
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white p-6 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <RefreshCcw className="w-6 h-6" />
                </div>
                <div>
                  <h2 id="refund-detail-modal-title" className="text-2xl font-bold text-white">Refund Details</h2>
                  <p className="text-sm text-amber-100 font-mono">{selectedRefund.id.slice(0, 8)}...</p>
                </div>
              </div>
              <button
                ref={refundDetailCloseButtonRef}
                type="button"
                onClick={closeRefundDetails}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p id="refund-detail-modal-description" className="sr-only">
                Review this refund request, its order details, status history, and available admin actions.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-3 text-base">Order Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Number:</span>
                    <span className="font-semibold text-gray-900 tabular-nums">
                      {selectedRefund.order?.orderNo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedRefund.order?.user
                        ? `${selectedRefund.order.user.firstName} ${selectedRefund.order.user.lastName}`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedRefund.order?.user?.email}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <h3 className="font-bold text-gray-900 mb-3 text-base">Refund Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-bold text-lg text-blue-700 tabular-nums">
                      ${selectedRefund.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedRefund.status)}`}
                    >
                      {selectedRefund.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Refund Method:</span>
                    <span className="font-semibold text-gray-900">
                      {getRefundMethodLabel(selectedRefund.refundMethod)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reason Category:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedRefund.reasonCategory || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedRefund.reason && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-base">Reason</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedRefund.reason}</p>
                </div>
              )}

              {selectedRefund.notes && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-base">Notes</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedRefund.notes}</p>
                </div>
              )}

              <div>
                <h3 className="font-bold text-gray-900 mb-3 text-base">Timeline</h3>
                <div className="space-y-2 text-sm tabular-nums">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    <span className="text-gray-600">
                      Requested: {new Date(selectedRefund.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {selectedRefund.processedAt && (
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="text-gray-600">
                        Processed: {new Date(selectedRefund.processedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedRefund.completedAt && (
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-gray-600">
                        Completed: {new Date(selectedRefund.completedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedRefund.status === 'PENDING' && (
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowApproveModal(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/25"
                    disabled={working}
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectError(null);
                      setShowRejectModal(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all"
                    disabled={working}
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                </div>
              )}

              {selectedRefund.status === 'APPROVED' && (
                <button
                  type="button"
                  onClick={() => void handleMarkProcessing()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/25"
                  disabled={working}
                >
                  <Loader2 className="w-5 h-5" />
                  Mark as Processing
                </button>
              )}

              {selectedRefund.status === 'PROCESSING' && (
                <button
                  type="button"
                  onClick={() => void handleComplete()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/25"
                  disabled={working}
                >
                  <Check className="w-5 h-5" />
                  Complete Refund
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRefund && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !working) {
              closeApproveModal();
            }
          }}
        >
          <div
            ref={approveModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="approve-refund-modal-title"
            aria-describedby="approve-refund-modal-description"
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <h2 id="approve-refund-modal-title" className="text-xl font-bold text-white">Approve Refund</h2>
            </div>
            <div className="p-6">
              <p id="approve-refund-modal-description" className="sr-only">
                Add optional approval notes before approving this refund request.
              </p>
              <label htmlFor="refund-approve-notes" className="block text-sm font-semibold text-gray-700 mb-2">
                Approval notes (optional)
              </label>
              <textarea
                id="refund-approve-notes"
                ref={approveNotesRef}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Optional notes for approval..."
                maxLength={500}
                className="w-full h-24 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                disabled={working}
              />
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={closeApproveModal}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  disabled={working}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleApprove()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all"
                  disabled={working}
                >
                  {working ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  {working ? 'Processing...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRefund && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !working) {
              closeRejectModal();
            }
          }}
        >
          <div
            ref={rejectModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-refund-modal-title"
            aria-describedby="reject-refund-modal-description"
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <h2 id="reject-refund-modal-title" className="text-xl font-bold text-white">Reject Refund</h2>
            </div>
            <div className="p-6">
              <p id="reject-refund-modal-description" className="sr-only">
                Provide a rejection reason before declining this refund request.
              </p>
              {rejectError && (
                <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {rejectError}
                </div>
              )}
              <label htmlFor="refund-reject-reason" className="block text-sm font-semibold text-gray-700 mb-2">
                Rejection reason <span className="text-red-600">*</span>
              </label>
              <textarea
                id="refund-reject-reason"
                ref={rejectReasonRef}
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  setRejectError(null);
                }}
                placeholder="Please provide a reason for rejection..."
                maxLength={500}
                className="w-full h-24 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                disabled={working}
              />
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={closeRejectModal}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  disabled={working}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleReject()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all"
                  disabled={working}
                >
                  {working ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                  {working ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundsManagement;

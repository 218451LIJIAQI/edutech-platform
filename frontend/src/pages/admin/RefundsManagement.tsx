import { useEffect, useState, useCallback } from 'react';
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
} from 'lucide-react';
import adminRefundService from '@/services/admin-refund.service';
import { Refund } from '@/types';
import { usePageTitle } from '@/hooks';

/**
 * Refunds Management Page Component
 * Admin can view, approve, reject, and process refunds
 */
const RefundsManagement = () => {
  usePageTitle('Refund Management');
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [filter, setFilter] = useState<string>('PENDING');
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

  // Modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

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
   * Load refunds and stats
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [refundsData, statsData] = await Promise.all([
        adminRefundService.getAllRefunds(filter === 'ALL' ? undefined : filter),
        adminRefundService.getStats(),
      ]);
      setRefunds(refundsData.refunds);
      setStats(statsData);
    } catch (e) {
      const message = getErrorMessage(e);
      toast.error(message || 'Failed to load refunds');
    } finally {
      setLoading(false);
    }
  }, [filter, getErrorMessage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Approve refund
   */
  const handleApprove = async () => {
    if (!selectedRefund) return;
    setWorking(true);
    try {
      await adminRefundService.approveRefund(selectedRefund.id, approvalNotes);
      toast.success('Refund approved');
      setShowApproveModal(false);
      setApprovalNotes('');
      setSelectedRefund(null);
      await loadData();
    } catch (e) {
      const message = getErrorMessage(e);
      toast.error(message || 'Failed to approve refund');
    } finally {
      setWorking(false);
    }
  };

  /**
   * Reject refund
   */
  const handleReject = async () => {
    if (!selectedRefund || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setWorking(true);
    try {
      await adminRefundService.rejectRefund(selectedRefund.id, rejectionReason);
      toast.success('Refund rejected');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedRefund(null);
      await loadData();
    } catch (e) {
      const message = getErrorMessage(e);
      toast.error(message || 'Failed to reject refund');
    } finally {
      setWorking(false);
    }
  };

  /**
   * Mark as processing
   */
  const handleMarkProcessing = async () => {
    if (!selectedRefund) return;
    setWorking(true);
    try {
      await adminRefundService.markAsProcessing(selectedRefund.id);
      toast.success('Refund marked as processing');
      setSelectedRefund(null);
      await loadData();
    } catch (e) {
      const message = getErrorMessage(e);
      toast.error(message || 'Failed to update refund');
    } finally {
      setWorking(false);
    }
  };

  /**
   * Complete refund
   */
  const handleComplete = async () => {
    if (!selectedRefund) return;
    setWorking(true);
    try {
      await adminRefundService.completeRefund(selectedRefund.id);
      toast.success('Refund completed');
      setSelectedRefund(null);
      await loadData();
    } catch (e) {
      const message = getErrorMessage(e);
      toast.error(message || 'Failed to complete refund');
    } finally {
      setWorking(false);
    }
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-700';
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-700';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'REJECTED':
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
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/25 ring-4 ring-white">
              <RefreshCcw className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Refund <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Management</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">Review and process refund requests</p>
            </div>
          </div>
        </div>

        {/* Statistics - Clickable to filter */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-5 mb-8">
            <button
              onClick={() => setFilter('PENDING')}
              className={`group bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden text-left ${filter === 'PENDING' ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-yellow-100'}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-yellow-100/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-yellow-100 rounded-xl group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider">Pending</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.pending}</div>
            </button>
            <button
              onClick={() => setFilter('APPROVED')}
              className={`group bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden text-left ${filter === 'APPROVED' ? 'border-blue-400 ring-2 ring-blue-200' : 'border-blue-100'}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-100/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Approved</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.approved}</div>
            </button>
            <button
              onClick={() => setFilter('PROCESSING')}
              className={`group bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden text-left ${filter === 'PROCESSING' ? 'border-purple-400 ring-2 ring-purple-200' : 'border-purple-100'}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-100/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-purple-100 rounded-xl group-hover:scale-110 transition-transform">
                  <Loader2 className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Processing</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.processing}</div>
            </button>
            <button
              onClick={() => setFilter('COMPLETED')}
              className={`group bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden text-left ${filter === 'COMPLETED' ? 'border-green-400 ring-2 ring-green-200' : 'border-green-100'}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-100/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-green-100 rounded-xl group-hover:scale-110 transition-transform">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Completed</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.completed}</div>
            </button>
            <button
              onClick={() => setFilter('REJECTED')}
              className={`group bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border relative overflow-hidden text-left ${filter === 'REJECTED' ? 'border-red-400 ring-2 ring-red-200' : 'border-red-100'}`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-red-100/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-red-100 rounded-xl group-hover:scale-110 transition-transform">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Rejected</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.rejected}</div>
            </button>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-card border border-gray-100 mb-8">
          <div className="flex flex-wrap gap-2">
            {['ALL', 'PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED'].map((status) => (
              <button
                key={status}
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
        </div>

        {/* Refunds Table */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center mb-4">
                <RefreshCcw className="w-6 h-6 text-white animate-spin" />
              </div>
              <p className="text-gray-500 font-medium">Loading refunds...</p>
            </div>
          ) : refunds.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No refunds found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Reason
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
                  {refunds.map((refund) => (
                    <tr
                      key={refund.id}
                      className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent cursor-pointer transition-all duration-200"
                      onClick={() => setSelectedRefund(refund)}
                    >
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRefund(refund);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg font-semibold text-sm hover:bg-primary-100 transition-colors"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white p-6 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <RefreshCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Refund Details</h3>
                  <p className="text-sm text-amber-100 font-mono">{selectedRefund.id.slice(0, 8)}...</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRefund(null)}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-gray-900 mb-3">Order Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Number:</span>
                    <span className="font-semibold text-gray-900">
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

              {/* Refund Details */}
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <h4 className="font-bold text-gray-900 mb-3">Refund Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-bold text-lg text-blue-600">
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
                      {selectedRefund.refundMethod === 'ORIGINAL_PAYMENT'
                        ? 'Original Payment'
                        : selectedRefund.refundMethod === 'WALLET'
                          ? 'Platform Wallet'
                          : 'Bank Transfer'}
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

              {/* Reason */}
              {selectedRefund.reason && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Reason</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedRefund.reason}</p>
                </div>
              )}

              {/* Notes */}
              {selectedRefund.notes && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Notes</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedRefund.notes}</p>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Timeline</h4>
                <div className="space-y-2 text-sm">
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

              {/* Actions */}
              {selectedRefund.status === 'PENDING' && (
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/25"
                    disabled={working}
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
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
                  onClick={handleMarkProcessing}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/25"
                  disabled={working}
                >
                  <Loader2 className="w-5 h-5" />
                  Mark as Processing
                </button>
              )}

              {selectedRefund.status === 'PROCESSING' && (
                <button
                  onClick={handleComplete}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Approve Refund</h3>
            </div>
            <div className="p-6">
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Optional notes for approval..."
                className="w-full h-24 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                disabled={working}
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setApprovalNotes('');
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  disabled={working}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Reject Refund</h3>
            </div>
            <div className="p-6">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                className="w-full h-24 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                disabled={working}
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  disabled={working}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
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

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import adminRefundService from '@/services/admin-refund.service';
import { Refund, RefundStatus } from '@/types';

/**
 * Refunds Management Page Component
 * Admin can view, approve, reject, and process refunds
 */
const RefundsManagement = () => {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [filter, setFilter] = useState<string>('PENDING');
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  /**
   * Load refunds and stats
   */
  const loadData = async () => {
    setLoading(true);
    try {
      const [refundsData, statsData] = await Promise.all([
        adminRefundService.getAllRefunds(filter === 'ALL' ? undefined : filter),
        adminRefundService.getStats(),
      ]);
      setRefunds(refundsData.refunds);
      setStats(statsData);
    } catch (e) {
      const message =
        e instanceof Error && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to load refunds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

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
      const message =
        e instanceof Error && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
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
      const message =
        e instanceof Error && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
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
      const message =
        e instanceof Error && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
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
      const message =
        e instanceof Error && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Refund Management</h2>
        <p className="text-gray-600 mt-1">Review and process refund requests</p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card p-4 bg-yellow-50 border-l-4 border-yellow-500">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
          </div>
          <div className="card p-4 bg-blue-50 border-l-4 border-blue-500">
            <div className="text-sm text-gray-600">Approved</div>
            <div className="text-2xl font-bold text-blue-700">{stats.approved}</div>
          </div>
          <div className="card p-4 bg-purple-50 border-l-4 border-purple-500">
            <div className="text-sm text-gray-600">Processing</div>
            <div className="text-2xl font-bold text-purple-700">{stats.processing}</div>
          </div>
          <div className="card p-4 bg-green-50 border-l-4 border-green-500">
            <div className="text-sm text-gray-600">Completed</div>
            <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
          </div>
          <div className="card p-4 bg-red-50 border-l-4 border-red-500">
            <div className="text-sm text-gray-600">Rejected</div>
            <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {['ALL', 'PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Refunds Table */}
      <div className="card shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : refunds.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No refunds found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Reason
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
                {refunds.map((refund) => (
                  <tr
                    key={refund.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedRefund(refund)}
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {refund.order?.orderNo || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {refund.order?.user
                        ? `${refund.order.user.firstName} ${refund.order.user.lastName}`
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ${refund.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {refund.reasonCategory || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(refund.status)}`}>
                        {refund.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRefund(refund);
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

      {/* Refund Detail Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6 flex items-center justify-between sticky top-0">
              <div>
                <h3 className="text-2xl font-bold">Refund Details</h3>
                <p className="text-sm text-primary-100">{selectedRefund.id}</p>
              </div>
              <button
                onClick={() => setSelectedRefund(null)}
                className="text-white hover:bg-primary-600 rounded-full p-2"
              >
                ✕
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
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="flex-1 btn-primary"
                    disabled={working}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 btn-outline"
                    disabled={working}
                  >
                    ✕ Reject
                  </button>
                </div>
              )}

              {selectedRefund.status === 'APPROVED' && (
                <button
                  onClick={handleMarkProcessing}
                  className="w-full btn-primary"
                  disabled={working}
                >
                  Mark as Processing
                </button>
              )}

              {selectedRefund.status === 'PROCESSING' && (
                <button
                  onClick={handleComplete}
                  className="w-full btn-primary"
                  disabled={working}
                >
                  Complete Refund
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Approve Refund</h3>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Optional notes for approval..."
              className="input w-full h-24 resize-none mb-4"
              disabled={working}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setApprovalNotes('');
                }}
                className="flex-1 btn-outline"
                disabled={working}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 btn-primary"
                disabled={working}
              >
                {working ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Refund</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="input w-full h-24 resize-none mb-4"
              disabled={working}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="flex-1 btn-outline"
                disabled={working}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 btn-danger"
                disabled={working}
              >
                {working ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundsManagement;


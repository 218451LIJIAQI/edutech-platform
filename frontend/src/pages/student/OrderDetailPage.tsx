import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Headphones, Package } from 'lucide-react';
import ordersService from '@/services/orders.service';
import { Order, Refund } from '@/types';
import toast from 'react-hot-toast';
import RefundModal from '@/components/common/RefundModal';
import CustomerServiceModal from '@/components/common/CustomerServiceModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { extractErrorMessage } from '@/utils/error-handler';
import clientLogger from '@/utils/logger';
import { usePageTitle } from '@/hooks';

/**
 * Order Detail Page Component
 * Displays comprehensive order information with:
 * - Order details and timeline
 * - Item information
 * - Refund status and history
 * - Customer service integration
 * - Cancel/Refund actions
 */
const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showCustomerService, setShowCustomerService] = useState(false);
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false);
  usePageTitle(order?.orderNo ? `Order ${order.orderNo}` : 'Order Details');

  /**
   * Load order and refund details
   */
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [orderData, refundsData] = await Promise.all([
        ordersService.getOrderById(id),
        ordersService.getRefundsByOrderId(id),
      ]);
      setOrder(orderData);
      setRefunds(refundsData);
    } catch (error) {
      clientLogger.error('Failed to load order details:', error);
      toast.error(extractErrorMessage(error, 'Failed to load order'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Handle cancel order
   */
  const handleCancel = async () => {
    if (!id) return;
    setWorking(true);
    try {
      const updated = await ordersService.cancelOrder(id, cancelReason || undefined);
      toast.success('Order cancelled successfully');
      setOrder(updated);
      setCancelReason('');
      setShowCancelOrderModal(false);
    } catch (error) {
      clientLogger.error('Failed to cancel order:', error);
      toast.error(extractErrorMessage(error, 'Failed to cancel order'));
    } finally {
      setWorking(false);
    }
  };

  /**
   * Get status badge color
   */
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'badge-success';
      case 'PENDING':
        return 'badge-warning';
      case 'CANCELLED':
        return 'badge-danger';
      case 'REFUNDED':
        return 'badge-info';
      default:
        return 'badge-primary';
    }
  };

  /**
   * Get refund status badge color
   */
  const getRefundStatusColor = (status: string) => {
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

  const getRefundMethodLabel = (refundMethod?: string) => {
    switch (refundMethod) {
      case 'ORIGINAL_PAYMENT':
        return 'Original Payment Method';
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      case 'WALLET':
        return 'Legacy Platform Wallet (Unavailable in this build)';
      default:
        return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center"><Package className="w-8 h-8 text-white" /></div><div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div></div><p className="text-gray-600 font-medium">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Order not found.</p>
          <button type="button" className="btn-primary" onClick={() => navigate('/orders')}>
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const completedRefundAmount = refunds
    .filter((item) => item.status === 'COMPLETED')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const remainingRefundableAmount = Math.max(0, order.totalAmount - completedRefundAmount);
  const activeRefund =
    refunds.find((item) => ['PENDING', 'APPROVED', 'PROCESSING'].includes(item.status)) || null;
  const latestRefund = refunds[0] || null;
  const canRequestRefund =
    order.status === 'PAID' &&
    remainingRefundableAmount > 0 &&
    activeRefund === null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Order <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Details</span>
              </h1>
            </div>
          </div>
          <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={() => navigate('/orders')}>
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Orders</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Header */}
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Order Number</div>
                  <div className="text-2xl font-bold text-gray-900">{order.orderNo}</div>
                </div>
                <div className={`badge ${getStatusBadgeClass(order.status)} text-lg px-4 py-2`}>
                  {order.status}
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 rounded-full bg-green-500 mt-2"></div>
                  <div>
                    <p className="font-semibold text-gray-900">Order Created</p>
                    <p className="text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                    {order.paidAt && (
                  <div className="flex items-start gap-4">
                    <div className="w-3 h-3 rounded-full bg-green-500 mt-2"></div>
                    <div>
                      <p className="font-semibold text-gray-900">Payment Completed</p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.paidAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                    )}

                    {order.canceledAt && (
                  <div className="flex items-start gap-4">
                    <div className="w-3 h-3 rounded-full bg-red-500 mt-2"></div>
                    <div>
                      <p className="font-semibold text-gray-900">Order Cancelled</p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.canceledAt).toLocaleString()}
                      </p>
                      {order.cancelReason && (
                        <p className="text-sm text-gray-700 mt-1">
                          <span className="font-semibold">Reason:</span> {order.cancelReason}
                        </p>
                      )}
                    </div>
                  </div>
                    )}

                    {order.refundedAt && (
                  <div className="flex items-start gap-4">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mt-2"></div>
                    <div>
                      <p className="font-semibold text-gray-900">Refund Processed</p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.refundedAt).toLocaleString()}
                      </p>
                      {order.refundAmount && (
                        <p className="text-sm text-gray-700 mt-1">
                          <span className="font-semibold">Amount:</span> ${order.refundAmount.toFixed(2)}
                        </p>
                    )}
                  </div>
                </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Order Items</h2>
              <div className="space-y-4">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-shadow"
                    >
                    <div className="flex-1">
                        <div className="font-bold text-gray-900 mb-1">
                          {item.package?.name || 'Package'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.package?.course?.title || 'Course'}
                        </div>
                        {item.package?.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {item.package.description}
                          </div>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-600 mb-1">
                          Price: ${item.price.toFixed(2)}
                    </div>
                        {item.discount && item.discount > 0 && (
                          <div className="text-sm text-green-600 font-semibold mb-1">
                            Discount: -${item.discount.toFixed(2)}
                          </div>
                        )}
                        <div className="font-bold text-lg text-primary-600">
                          ${item.finalPrice.toFixed(2)}
              </div>
            </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No items in this order</p>
                )}
              </div>
            </div>

            {/* Refund Information */}
            {refunds.length > 0 && (
              <div className="card shadow-lg border-2 border-blue-200 bg-blue-50">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Refund History</h2>
                  <div className="text-sm text-right">
                    <div className="text-gray-600">Refunded so far</div>
                    <div className="font-bold text-blue-600">${completedRefundAmount.toFixed(2)}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  {refunds.map((refund) => (
                    <div key={refund.id} className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="font-semibold text-gray-900">
                            ${refund.amount.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Requested: {new Date(refund.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRefundStatusColor(refund.status)}`}>
                          {refund.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 font-semibold">Method:</span>{' '}
                          <span className="text-gray-900">{getRefundMethodLabel(refund.refundMethod)}</span>
                        </div>
                        {refund.reasonCategory && (
                          <div>
                            <span className="text-gray-600 font-semibold">Category:</span>{' '}
                            <span className="text-gray-900">{refund.reasonCategory}</span>
                          </div>
                        )}
                        {refund.processedAt && (
                          <div>
                            <span className="text-gray-600 font-semibold">Processed:</span>{' '}
                            <span className="text-gray-900">{new Date(refund.processedAt).toLocaleString()}</span>
                          </div>
                        )}
                        {refund.completedAt && (
                          <div>
                            <span className="text-gray-600 font-semibold">Completed:</span>{' '}
                            <span className="text-gray-900">{new Date(refund.completedAt).toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {refund.reason && (
                        <div className="mt-3">
                          <span className="text-gray-700 font-semibold block mb-2">Details:</span>
                          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{refund.reason}</p>
                        </div>
                      )}

                      {refund.notes && (
                        <div className="mt-3">
                          <span className="text-gray-700 font-semibold block mb-2">Notes:</span>
                          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{refund.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Total Amount */}
            <div className="card shadow-lg bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-200">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-gray-900">Total</span>
                <span className="text-3xl font-bold text-primary-600">
                  ${order.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Customer Service Button */}
            <button
              type="button"
              onClick={() => setShowCustomerService(true)}
              className="w-full card shadow-lg hover:shadow-xl transition-all border-2 border-primary-200 bg-gradient-to-r from-primary-50 to-primary-100 p-4 text-center cursor-pointer"
            >
              <Headphones className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <p className="font-bold text-gray-900">Contact Support</p>
              <p className="text-xs text-gray-600 mt-1">Get help with this order</p>
            </button>

            {/* Cancel Order (PENDING only) */}
            {order.status === 'PENDING' && (
              <div className="card shadow-lg border-2 border-orange-200 bg-orange-50">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Cancel Order</h3>
                <textarea
                  className="input mb-4 h-20 resize-none"
                  placeholder="Optional reason for cancellation"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={working}
                />
                <button
                  type="button"
                  className="btn-outline w-full"
                  onClick={() => setShowCancelOrderModal(true)}
                  disabled={working}
                >
                  {working ? 'Cancelling...' : 'Cancel Order'}
                </button>
              </div>
            )}

            {/* Request Refund (PAID only) */}
            {canRequestRefund && (
              <div className="card shadow-lg border-2 border-blue-200 bg-blue-50">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Request Refund</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Start a refund request for the remaining refundable balance of ${remainingRefundableAmount.toFixed(2)}.
                </p>
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={() => setShowRefundModal(true)}
                  disabled={working}
                >
                  Request Refund
                </button>
              </div>
            )}

            {/* Refund Pending */}
            {activeRefund?.status === 'PENDING' && (
              <div className="card shadow-lg border-2 border-yellow-200 bg-yellow-50">
                <h3 className="font-bold text-lg text-gray-900 mb-2">Refund Pending</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Your refund request is being reviewed. We'll notify you once it's processed.
                </p>
                <button
                  type="button"
                  className="btn-outline w-full"
                  onClick={() => setShowCustomerService(true)}
                >
                  Contact Support
                </button>
              </div>
            )}

            {/* Refund Info */}
            {activeRefund && ['APPROVED', 'PROCESSING'].includes(activeRefund.status) && (
              <div className="card shadow-lg border-2 border-green-200 bg-green-50">
                <h3 className="font-bold text-lg text-gray-900 mb-2">Refund {activeRefund.status}</h3>
                <p className="text-sm text-gray-700">
                  Amount: <span className="font-bold">${activeRefund.amount.toFixed(2)}</span>
                </p>
                <p className="text-xs text-green-700 mt-2">
                  Method: {getRefundMethodLabel(activeRefund.refundMethod)}
                </p>
              </div>
            )}

            {latestRefund?.status === 'REJECTED' && (
              <div className="card shadow-lg border-2 border-red-200 bg-red-50">
                <h3 className="font-bold text-lg text-gray-900 mb-2">Latest Refund Rejected</h3>
                <p className="text-sm text-gray-700">
                  Your latest refund request was rejected. You can submit a new request if you still have refundable balance remaining.
                </p>
              </div>
            )}

            {completedRefundAmount > 0 && remainingRefundableAmount > 0 && (
              <div className="card shadow-lg border-2 border-blue-200 bg-blue-50">
                <h3 className="font-bold text-lg text-gray-900 mb-2">Partial Refund Completed</h3>
                <p className="text-sm text-gray-700">
                  Refunded: <span className="font-bold">${completedRefundAmount.toFixed(2)}</span>
                </p>
                <p className="text-sm text-gray-700">
                  Remaining refundable: <span className="font-bold">${remainingRefundableAmount.toFixed(2)}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <RefundModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        order={order}
        maxRefundAmount={remainingRefundableAmount}
        onRefundSubmitted={load}
      />

      <CustomerServiceModal
        isOpen={showCustomerService}
        onClose={() => setShowCustomerService(false)}
        orderId={order.id}
      />

      <ConfirmationModal
        isOpen={showCancelOrderModal}
        title="Cancel order"
        description="Cancel this pending order before payment is completed."
        details={cancelReason.trim() ? [`Reason: ${cancelReason.trim()}`] : []}
        confirmLabel="Cancel Order"
        tone="warning"
        isLoading={working}
        onClose={() => {
          if (!working) {
            setShowCancelOrderModal(false);
          }
        }}
        onConfirm={handleCancel}
      />
    </div>
  );
};

export default OrderDetailPage;

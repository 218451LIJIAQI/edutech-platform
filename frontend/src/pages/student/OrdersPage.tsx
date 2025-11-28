import { useEffect, useState } from 'react';
import ordersService from '@/services/orders.service';
import { Order, OrderStatus } from '@/types';
import { Link } from 'react-router-dom';

/**
 * Orders Page Component
 * Displays all orders with:
 * - Filter by status
 * - Detailed order information
 * - Quick action buttons
 * - Order timeline
 */
const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | keyof typeof OrderStatus>('ALL');

  /**
   * Load all orders
   */
  const load = async () => {
    setLoading(true);
    try {
      const data = await ordersService.getMyOrders();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /**
   * Filter orders by status
   */
  const filtered = orders.filter((o) => (filter === 'ALL' ? true : o.status === filter));

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
   * Get status icon
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return '✓';
      case 'PENDING':
        return '⏳';
      case 'CANCELLED':
        return '✕';
      case 'REFUNDED':
        return '↩';
      default:
        return '•';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="section-title mb-2">My Orders</h1>
          <p className="text-gray-600">Manage and track all your purchases</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
              filter === 'ALL'
              ? 'bg-primary-600 text-white border-primary-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-700'
            }`}
            onClick={() => setFilter('ALL')}
          >
            All Orders
          </button>
          {Object.keys(OrderStatus).map((k) => (
            <button
              key={k}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                filter === k
                ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-700'
              }`}
              onClick={() => setFilter(k as keyof typeof OrderStatus)}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="spinner"></div>
          </div>
        ) : filtered.length === 0 ? (
          // Empty State
          <div className="card p-16 text-center shadow-xl max-w-md mx-auto border border-gray-100 rounded-2xl">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-5xl">📦</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No orders found</h3>
            <p className="text-gray-600 text-lg">
              {filter === 'ALL'
                ? "You haven't placed any orders yet."
                : `No ${filter.toLowerCase()} orders found.`}
            </p>
          </div>
        ) : (
          // Orders List
          <div className="space-y-4">
            {filtered.map((order) => (
              <Link
                to={`/orders/${order.id}`}
                key={order.id}
                className="card block p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-102 border border-gray-100 hover:border-primary-200 rounded-2xl shadow-lg"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                  {/* Order Number and Status */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                      <span className="text-xl">📋</span>
                  </div>
                    <div>
                      <div className="font-bold text-gray-900">{order.orderNo}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  </div>

                  {/* Items Count */}
                  <div className="hidden md:block">
                    <div className="text-sm text-gray-600 mb-1">Items</div>
                    <div className="font-bold text-gray-900">
                      {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="hidden lg:block">
                    <div className="text-sm text-gray-600 mb-1">Amount</div>
                    <div className="text-2xl font-bold text-primary-600">
                      ${order.totalAmount.toFixed(2)}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between md:justify-end gap-3">
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">Status</div>
                      <div
                        className={`badge ${getStatusBadgeClass(order.status)} inline-flex items-center gap-1`}
                      >
                        <span>{getStatusIcon(order.status)}</span>
                        <span>{order.status}</span>
                      </div>
                    </div>
                    <div className="text-2xl text-gray-400">→</div>
                  </div>
                </div>

                {/* Additional Info Row */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
                  {order.paidAt && (
                    <div className="flex items-center gap-1">
                      <span>✓ Paid</span>
                      <span>{new Date(order.paidAt).toLocaleDateString()}</span>
                    </div>
                  )}

                  {order.canceledAt && (
                    <div className="flex items-center gap-1">
                      <span>✕ Cancelled</span>
                      <span>{new Date(order.canceledAt).toLocaleDateString()}</span>
                    </div>
                  )}

                  {order.refundedAt && (
                    <div className="flex items-center gap-1">
                      <span>↩ Refunded</span>
                      <span>${order.refundAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                  )}

                  {!order.paidAt && !order.canceledAt && order.status === 'PENDING' && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <span>⏳ Awaiting payment</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;

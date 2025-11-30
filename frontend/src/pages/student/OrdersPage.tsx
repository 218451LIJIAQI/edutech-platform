import { useEffect, useState, useCallback, useMemo } from 'react';
import ordersService from '@/services/orders.service';
import { Order, OrderStatus } from '@/types';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks';

/**
 * Orders Page Component
 * Displays all orders with:
 * - Filter by status
 * - Detailed order information
 * - Quick action buttons
 * - Order timeline
 */
const OrdersPage = () => {
  usePageTitle('My Orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | OrderStatus>('ALL');

  /**
   * Load all orders
   */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ordersService.getMyOrders();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Filter orders by status
   */
  const filtered = useMemo(() => {
    return orders.filter((o) => (filter === 'ALL' ? true : o.status === filter));
  }, [orders, filter]);

  /**
   * Get status badge color
   */
  const getStatusBadgeClass = (status: OrderStatus): string => {
    switch (status) {
      case OrderStatus.PAID:
        return 'badge-success';
      case OrderStatus.PENDING:
        return 'badge-warning';
      case OrderStatus.CANCELLED:
        return 'badge-danger';
      case OrderStatus.REFUNDED:
        return 'badge-info';
      case OrderStatus.FAILED:
        return 'badge-danger';
      default:
        return 'badge-primary';
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status: OrderStatus): string => {
    switch (status) {
      case OrderStatus.PAID:
        return '✓';
      case OrderStatus.PENDING:
        return '⏳';
      case OrderStatus.CANCELLED:
        return '✕';
      case OrderStatus.REFUNDED:
        return '↩';
      case OrderStatus.FAILED:
        return '⚠';
      default:
        return '•';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      
      {/* Decorative Elements */}
      <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 left-[5%] w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <span className="text-2xl">📦</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                My <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Orders</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">Manage and track all your purchases</p>
            </div>
          </div>
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
          {Object.values(OrderStatus).map((status) => (
            <button
              key={status}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                filter === status
                ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-700'
              }`}
              onClick={() => setFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="card p-6 mb-8 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-red-900 mb-1">Error loading orders</h3>
                <p className="text-red-700 text-sm">{error}</p>
                <button
                  onClick={load}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

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

                  {!order.paidAt && !order.canceledAt && order.status === OrderStatus.PENDING && (
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

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import ordersService from '@/services/orders.service';
import { Order, OrderStatus } from '@/types';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks';
import { extractErrorMessage } from '@/utils/error-handler';
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Circle, Clock3, FileText, Package, RotateCcw, XCircle } from 'lucide-react';

/**
 * Orders Page Component
 * Displays all orders with status filtering, timeline metadata, and empty/filter/error separation.
 */
const OrdersPage = () => {
  usePageTitle('My Orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | OrderStatus>('ALL');
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await ordersService.getMyOrders();
      if (requestId !== requestIdRef.current) {
        return;
      }
      setOrders(data);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setError(extractErrorMessage(err, 'Failed to load orders'));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      requestIdRef.current += 1;
    };
  }, [load]);

  const filtered = useMemo(() => {
    return orders.filter((o) => (filter === 'ALL' ? true : o.status === filter));
  }, [orders, filter]);

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

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PAID:
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case OrderStatus.PENDING:
        return <Clock3 className="w-3.5 h-3.5" />;
      case OrderStatus.CANCELLED:
        return <XCircle className="w-3.5 h-3.5" />;
      case OrderStatus.REFUNDED:
        return <RotateCcw className="w-3.5 h-3.5" />;
      case OrderStatus.FAILED:
        return <AlertCircle className="w-3.5 h-3.5" />;
      default:
        return <Circle className="w-3 h-3 fill-current" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 left-[5%] w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                My <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Orders</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">Manage and track all your purchases</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            type="button"
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border tabular-nums ${
              filter === 'ALL'
              ? 'bg-primary-600 text-white border-primary-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-700'
            }`}
            onClick={() => setFilter('ALL')}
          >
            All Orders ({orders.length})
          </button>
          {Object.values(OrderStatus).map((status) => (
            <button
              key={status}
              type="button"
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border tabular-nums ${
                filter === status
                ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-700'
              }`}
              onClick={() => setFilter(status)}
            >
              {status} ({orders.filter((o) => o.status === status).length})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[320px]">
            <div className="spinner"></div>
          </div>
        ) : error ? (
          <div role="alert" className="card p-8 max-w-lg mx-auto bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" />
            <h2 className="font-bold text-red-900 text-lg">Error loading orders</h2>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="btn-primary btn-sm"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-14 text-center shadow-xl max-w-md mx-auto border border-gray-100 rounded-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Package className="w-9 h-9 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders found</h2>
            <p className="text-gray-600 mb-6">
              {filter === 'ALL'
                ? "You haven't placed any orders yet."
                : `No ${filter.toLowerCase()} orders found.`}
            </p>
            {filter !== 'ALL' ? (
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className="btn-secondary"
              >
                Show All Orders
              </button>
            ) : (
              <Link to="/courses" className="btn-primary">
                Browse Courses
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => (
              <Link
                to={`/orders/${order.id}`}
                key={order.id}
                className="card card-smooth block p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary-700" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 tabular-nums">{order.orderNo}</div>
                      <div className="text-xs text-gray-500 tabular-nums">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:block">
                    <div className="text-sm text-gray-600 mb-1">Items</div>
                    <div className="font-bold text-gray-900 tabular-nums">
                      {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="hidden lg:block">
                    <div className="text-sm text-gray-600 mb-1">Amount</div>
                    <div className="text-2xl font-bold text-primary-700 tabular-nums">
                      ${order.totalAmount.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3">
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">Status</div>
                      <div
                        className={`badge ${getStatusBadgeClass(order.status)} inline-flex items-center gap-1`}
                      >
                        {getStatusIcon(order.status)}
                        <span>{order.status}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 tabular-nums">
                  {order.paidAt && (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      <span>Paid</span>
                      <span>{new Date(order.paidAt).toLocaleDateString()}</span>
                    </div>
                  )}

                  {order.canceledAt && (
                    <div className="flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-red-600" />
                      <span>Cancelled</span>
                      <span>{new Date(order.canceledAt).toLocaleDateString()}</span>
                    </div>
                  )}

                  {order.refundedAt && (
                    <div className="flex items-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                      <span>Refunded</span>
                      <span>${order.refundAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                  )}

                  {!order.paidAt && !order.canceledAt && order.status === OrderStatus.PENDING && (
                    <div className="flex items-center gap-1 text-yellow-700">
                      <Clock3 className="w-3.5 h-3.5" />
                      <span>Awaiting payment</span>
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

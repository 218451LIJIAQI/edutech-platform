import { useEffect, useState } from 'react';
import ordersService from '@/services/orders.service';
import { Order, OrderStatus } from '@/types';
import { Link } from 'react-router-dom';

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | keyof typeof OrderStatus>('ALL');

  const load = async () => {
    setLoading(true);
    try {
      const data = await ordersService.getMyOrders();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = orders.filter(o => filter === 'ALL' ? true : o.status === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="section-title mb-8">My Orders</h1>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
            filter==='ALL'
              ? 'bg-primary-600 text-white border-primary-600 shadow-md'
              : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-700'
          }`} onClick={()=>setFilter('ALL')}>All</button>
          {Object.keys(OrderStatus).map(k => (
            <button key={k} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
              filter===k
                ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:text-primary-700'
            }`} onClick={()=>setFilter(k as keyof typeof OrderStatus)}>{k}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="spinner"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center shadow-lg max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📦</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">You haven't placed any orders yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(o => (
              <Link to={`/orders/${o.id}`} key={o.id} className="card block p-6 hover:shadow-xl transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-bold text-lg text-gray-900 mb-2">Order No: {o.orderNo}</div>
                    <div className="text-sm text-gray-600">Created: {new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-600 mb-1">${o.totalAmount.toFixed(2)}</div>
                    <div className="text-sm">
                      <span className={`badge ${
                        o.status === 'PAID' ? 'badge-success' :
                        o.status === 'PENDING' ? 'badge-warning' :
                        o.status === 'CANCELLED' ? 'badge-danger' :
                        'badge-primary'
                      }`}>{o.status}</span>
                    </div>
                  </div>
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


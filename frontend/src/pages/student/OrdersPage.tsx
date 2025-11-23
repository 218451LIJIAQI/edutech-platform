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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>

      <div className="flex items-center gap-2 mb-4">
        <button className={`btn-sm ${filter==='ALL'?'btn-primary':'btn-outline'}`} onClick={()=>setFilter('ALL')}>All</button>
        {Object.keys(OrderStatus).map(k => (
          <button key={k} className={`btn-sm ${filter===k?'btn-primary':'btn-outline'}`} onClick={()=>setFilter(k as any)}>{k}</button>
        ))}
      </div>

      {loading ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <div className="card p-6 text-center text-gray-600">No orders found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => (
            <Link to={`/orders/${o.id}`} key={o.id} className="card block p-4 hover:shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Order No: {o.orderNo}</div>
                  <div className="text-sm text-gray-600">Created: {new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">${o.totalAmount.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Status: {o.status}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;


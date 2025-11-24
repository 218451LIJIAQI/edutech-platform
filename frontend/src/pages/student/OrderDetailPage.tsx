import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ordersService from '@/services/orders.service';
import { Order } from '@/types';
import toast from 'react-hot-toast';

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await ordersService.getOrderById(id);
      setOrder(data);
    } catch (e) {
      const message = e instanceof Error && 'response' in e 
        ? (e as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined;
      toast.error(message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleCancel = async () => {
    if (!id) return;
    if (!confirm('Cancel this order?')) return;
    setWorking(true);
    try {
      const updated = await ordersService.cancelOrder(id, cancelReason || undefined);
      toast.success('Order cancelled');
      setOrder(updated);
    } catch (e) {
      const message = e instanceof Error && 'response' in e 
        ? (e as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined;
      toast.error(message || 'Failed to cancel order');
    } finally {
      setWorking(false);
    }
  };

  const handleRefund = async () => {
    if (!id || !refundAmount) return;
    if (!confirm('Submit a refund request?')) return;
    setWorking(true);
    try {
      const amount = parseFloat(refundAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Enter a valid refund amount');
        setWorking(false);
        return;
      }
      await ordersService.requestRefund(id, amount, refundReason || undefined);
      toast.success('Refund request submitted');
      navigate('/orders');
    } catch (e) {
      const message = e instanceof Error && 'response' in e 
        ? (e as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined;
      toast.error(message || 'Failed to request refund');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <p className="text-gray-600 font-medium">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Order not found.</p>
          <button className="btn-primary" onClick={() => navigate('/orders')}>Back to Orders</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-10">
          <h1 className="section-title">Order Detail</h1>
          <button className="btn-outline" onClick={() => navigate('/orders')}>Back to Orders</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="card shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-bold text-xl text-gray-900 mb-3">Order No: {order.orderNo}</div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>Created: {new Date(order.createdAt).toLocaleString()}</div>
                    {order.paidAt && (
                      <div>Paid: {new Date(order.paidAt).toLocaleString()}</div>
                    )}
                    {order.canceledAt && (
                      <div>Cancelled: {new Date(order.canceledAt).toLocaleString()}</div>
                    )}
                    {order.refundedAt && (
                      <div>Refunded: {new Date(order.refundedAt).toLocaleString()}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-2">Status</div>
                  <div className={`badge ${
                    order.status === 'PAID' ? 'badge-success' :
                    order.status === 'PENDING' ? 'badge-warning' :
                    order.status === 'CANCELLED' ? 'badge-danger' :
                    'badge-primary'
                  } text-lg px-4 py-2`}>{order.status}</div>
                </div>
              </div>
            </div>

            <div className="card shadow-lg">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Items</h2>
              <div className="space-y-4">
                {order.items?.map((it) => (
                  <div key={it.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 mb-1">{it.package?.name || 'Package'}</div>
                      <div className="text-sm text-gray-600">{it.package?.course?.title || ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">Price: ${it.price.toFixed(2)}</div>
                      <div className="font-bold text-lg text-primary-600">${it.finalPrice.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card shadow-lg bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-200">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-gray-900">Total</span>
                <span className="text-3xl font-bold text-primary-600">${order.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Cancel order (PENDING only) */}
            {order.status === 'PENDING' && (
              <div className="card shadow-lg border-2 border-orange-200 bg-orange-50">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Cancel Order</h3>
                <input className="input mb-4" placeholder="Optional reason" value={cancelReason} onChange={(e)=>setCancelReason(e.target.value)} />
                <button className="btn-outline w-full" onClick={handleCancel} disabled={working}>Cancel Order</button>
              </div>
            )}

            {/* Request refund (PAID only) */}
            {order.status === 'PAID' && (
              <div className="card shadow-lg border-2 border-blue-200 bg-blue-50">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Request Refund</h3>
                <input className="input mb-4" placeholder="Amount" value={refundAmount} onChange={(e)=>setRefundAmount(e.target.value)} />
                <input className="input mb-4" placeholder="Optional reason" value={refundReason} onChange={(e)=>setRefundReason(e.target.value)} />
                <button className="btn-primary w-full" onClick={handleRefund} disabled={working}>Submit Refund</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;


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
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load order');
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
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to cancel order');
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
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to request refund');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8"><div className="spinner"/></div>;
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600 mb-4">Order not found.</p>
        <button className="btn-primary" onClick={() => navigate('/orders')}>Back to Orders</button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Order Detail</h1>
        <button className="btn-outline" onClick={() => navigate('/orders')}>Back to Orders</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Order No: {order.orderNo}</div>
                <div className="text-sm text-gray-600">Created: {new Date(order.createdAt).toLocaleString()}</div>
                {order.paidAt && (
                  <div className="text-sm text-gray-600">Paid: {new Date(order.paidAt).toLocaleString()}</div>
                )}
                {order.canceledAt && (
                  <div className="text-sm text-gray-600">Cancelled: {new Date(order.canceledAt).toLocaleString()}</div>
                )}
                {order.refundedAt && (
                  <div className="text-sm text-gray-600">Refunded: {new Date(order.refundedAt).toLocaleString()}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Status</div>
                <div className="text-xl font-bold">{order.status}</div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <h2 className="text-lg font-semibold mb-3">Items</h2>
            <div className="space-y-3">
              {order.items?.map((it) => (
                <div key={it.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{it.package?.name || 'Package'}</div>
                    <div className="text-sm text-gray-600">{it.package?.course?.title || ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Price: ${it.price.toFixed(2)}</div>
                    <div className="font-semibold">${it.finalPrice.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <span>Total</span>
              <span className="text-xl font-bold">${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Cancel order (PENDING only) */}
          {order.status === 'PENDING' && (
            <div className="card p-4 space-y-3">
              <h3 className="font-semibold">Cancel Order</h3>
              <input className="input" placeholder="Optional reason" value={cancelReason} onChange={(e)=>setCancelReason(e.target.value)} />
              <button className="btn-outline" onClick={handleCancel} disabled={working}>Cancel Order</button>
            </div>
          )}

          {/* Request refund (PAID only) */}
          {order.status === 'PAID' && (
            <div className="card p-4 space-y-3">
              <h3 className="font-semibold">Request Refund</h3>
              <input className="input" placeholder="Amount" value={refundAmount} onChange={(e)=>setRefundAmount(e.target.value)} />
              <input className="input" placeholder="Optional reason" value={refundReason} onChange={(e)=>setRefundReason(e.target.value)} />
              <button className="btn-primary" onClick={handleRefund} disabled={working}>Submit Refund</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;


import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import cartService, { CartSummaryDTO } from '@/services/cart.service';
import toast from 'react-hot-toast';

const CartPage = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await cartService.getCart();
      setCart(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRemove = async (packageId: string) => {
    setWorking(true);
    try {
      await cartService.removeItem(packageId);
      toast.success('Removed from cart');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to remove');
    } finally {
      setWorking(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear your cart?')) return;
    setWorking(true);
    try {
      await cartService.clear();
      toast.success('Cart cleared');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to clear');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8"><div className="spinner"/></div>
    );
  }

  const items = cart?.items || [];
  const total = cart?.totalAmount || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Cart</h1>

      {items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">Your cart is empty.</p>
          <button className="btn-primary" onClick={() => navigate('/courses')}>Browse Courses</button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.id} className="card flex items-center justify-between">
              <div>
                <div className="font-semibold">{it.package?.name || 'Package'}</div>
                <div className="text-sm text-gray-600">{it.package?.course?.title || ''}</div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-lg font-bold">${it.package?.finalPrice?.toFixed(2)}</div>
                <button className="btn-sm btn-outline" disabled={working} onClick={() => handleRemove(it.packageId)}>Remove</button>
              </div>
            </div>
          ))}

          <div className="card flex items-center justify-between">
            <div className="font-semibold">Total</div>
            <div className="text-xl font-bold">${total.toFixed(2)}</div>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button className="btn-outline" onClick={handleClear} disabled={working}>Clear Cart</button>
            <button className="btn-primary" onClick={() => navigate('/cart/checkout')} disabled={items.length===0}>Proceed to Checkout</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;


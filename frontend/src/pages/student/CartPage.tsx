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
    } catch (e) {
      const message = e instanceof Error && 'response' in e 
        ? (e as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined;
      toast.error(message || 'Failed to load cart');
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
    } catch (e) {
      const message = e instanceof Error && 'response' in e 
        ? (e as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined;
      toast.error(message || 'Failed to remove');
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
    } catch (e) {
      const message = e instanceof Error && 'response' in e 
        ? (e as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined;
      toast.error(message || 'Failed to clear');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <p className="text-gray-600 font-medium">Loading your cart...</p>
        </div>
      </div>
    );
  }

  const items = cart?.items || [];
  const total = cart?.totalAmount || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="section-title mb-8">My Cart</h1>

        {items.length === 0 ? (
          <div className="card text-center py-16 shadow-lg max-w-md mx-auto">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🛒</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Your cart is empty</h3>
            <p className="text-gray-600 mb-6">Start adding courses to your cart to continue learning!</p>
            <button className="btn-primary" onClick={() => navigate('/courses')}>Browse Courses</button>
          </div>
        ) : (
          <div className="space-y-6">
            {items.map((it) => (
              <div key={it.id} className="card shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-bold text-lg text-gray-900 mb-1">{it.package?.name || 'Package'}</div>
                    <div className="text-sm text-gray-600">{it.package?.course?.title || ''}</div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-2xl font-bold text-primary-600">${it.package?.finalPrice?.toFixed(2)}</div>
                    <button className="btn-sm btn-outline" disabled={working} onClick={() => handleRemove(it.packageId)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}

            <div className="card bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-200 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="font-bold text-xl text-gray-900">Total</div>
                <div className="text-3xl font-bold text-primary-600">${total.toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button className="btn-outline" onClick={handleClear} disabled={working}>Clear Cart</button>
              <button className="btn-primary btn-lg" onClick={() => navigate('/cart/checkout')} disabled={items.length===0}>Proceed to Checkout</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;


import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import cartService, { CartSummaryDTO } from '@/services/cart.service';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/helpers';

const CartPage = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
        <h1 className="section-title mb-12 text-5xl">My Cart</h1>

        {items.length === 0 ? (
          <div className="card text-center py-20 shadow-2xl max-w-md mx-auto border border-gray-100 hover:shadow-3xl transition-all">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
              <span className="text-5xl">🛒</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h3>
            <p className="text-gray-600 mb-8 text-lg">Start adding courses to your cart to continue learning!</p>
            <button className="btn-primary btn-lg" onClick={() => navigate('/courses')}>Browse Courses</button>
          </div>
        ) : (
          <div className="space-y-6">
            {items.map((it) => (
              <div key={it.id} className="card shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-100 hover:border-primary-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-bold text-xl text-gray-900 mb-2">{it.package?.name || 'Package'}</div>
                    <div className="text-sm text-gray-600 font-medium">{it.package?.course?.title || ''}</div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-3xl font-bold text-primary-600">{formatCurrency(it.package?.finalPrice || 0)}</div>
                    <button
                      className="btn-sm btn-outline hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all"
                      disabled={working}
                      onClick={() => handleRemove(it.packageId)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white border-2 border-primary-400 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="font-bold text-2xl">Total Amount</div>
                <div className="text-4xl font-bold">{formatCurrency(total)}</div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                className="btn-outline hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all"
                onClick={handleClear}
                disabled={working}
              >
                Clear Cart
              </button>
              <button
                className="btn-primary btn-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                onClick={() => navigate('/cart/checkout')}
                disabled={items.length === 0}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;


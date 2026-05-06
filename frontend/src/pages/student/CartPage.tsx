import { useEffect, useState, useCallback } from 'react';
import clientLogger from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import cartService, { CartSummaryDTO } from '@/services/cart.service';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/helpers';
import { usePageTitle } from '@/hooks';
import { extractErrorMessage } from '@/utils/error-handler';
import ConfirmationModal from '@/components/common/ConfirmationModal';

const CartPage = () => {
  usePageTitle('Shopping Cart');
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [showClearCartModal, setShowClearCartModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cartService.getCart();
      setCart(data);
    } catch (e) {
      clientLogger.error('Failed to load cart:', e);
      toast.error(extractErrorMessage(e, 'Failed to load cart'));
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
      clientLogger.error('Failed to remove cart item:', e);
      toast.error(extractErrorMessage(e, 'Failed to remove'));
    } finally {
      setWorking(false);
    }
  };

  const handleClear = async () => {
    setWorking(true);
    try {
      await cartService.clear();
      toast.success('Cart cleared');
      await load();
      setShowClearCartModal(false);
    } catch (e) {
      clientLogger.error('Failed to clear cart:', e);
      toast.error(extractErrorMessage(e, 'Failed to clear'));
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div>
            </div>
            <p className="text-gray-600 font-medium">Loading your cart...</p>
        </div>
      </div>
    );
  }

  const items = cart?.items || [];
  const total = cart?.totalAmount || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      {/* Decorative Elements */}
      <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 left-[5%] w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              My <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Cart</span>
            </h1>
            <p className="text-gray-500 font-medium mt-1">Review your selected courses</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="card text-center py-20 shadow-2xl max-w-md mx-auto border border-gray-100 hover:shadow-3xl transition-all">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
              <ShoppingCart className="w-10 h-10 text-primary-600" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h3>
            <p className="text-gray-600 mb-8 text-lg">Start adding courses to your cart to continue learning!</p>
            <button type="button" className="btn-primary btn-lg" onClick={() => navigate('/courses')}>Browse Courses</button>
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
                      type="button"
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
                type="button"
                className="btn-outline hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all"
                onClick={() => setShowClearCartModal(true)}
                disabled={working}
              >
                Clear Cart
              </button>
              <button
                type="button"
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

      <ConfirmationModal
        isOpen={showClearCartModal}
        title="Clear cart"
        description="Remove all selected packages from your cart."
        confirmLabel="Clear Cart"
        tone="warning"
        isLoading={working}
        onClose={() => {
          if (!working) {
            setShowClearCartModal(false);
          }
        }}
        onConfirm={handleClear}
      />
    </div>
  );
};

export default CartPage;

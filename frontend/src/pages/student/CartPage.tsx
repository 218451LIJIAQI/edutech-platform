import { useEffect, useState, useCallback } from 'react';
import clientLogger from '@/utils/logger';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCcw, ShoppingCart, Trash2 } from 'lucide-react';
import cartService from '@/services/cart.service';
import type { CartSummary } from '@/types';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/helpers';
import { usePageTitle } from '@/hooks';
import { extractErrorMessage } from '@/utils/error-handler';
import ConfirmationModal from '@/components/common/ConfirmationModal';

const CartPage = () => {
  usePageTitle('Shopping Cart');
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [showClearCartModal, setShowClearCartModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await cartService.getCart();
      setCart(data);
    } catch (e) {
      clientLogger.error('Failed to load cart:', e);
      const message = extractErrorMessage(e, 'Failed to load cart');
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRemove = async (packageId: string) => {
    setWorking(true);
    try {
      await cartService.removeItem(packageId);
      toast.success('Removed from cart');
      await load();
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-600 font-medium">Loading your cart...</p>
        </div>
      </div>
    );
  }

  const items = cart?.items || [];
  const total = cart?.totalAmount || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              Shopping{' '}
              <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                Cart
              </span>
            </h1>
            <p className="text-slate-600 font-medium mt-0.5">
              Review selected course packages before enrollment checkout
            </p>
          </div>
        </div>

        {loadError ? (
          <div className="card max-w-lg mx-auto text-center space-y-4 py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Unable to load cart</h2>
            <p className="text-sm text-slate-600">{loadError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="btn-primary inline-flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="card text-center py-16 max-w-md mx-auto">
            <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-10 h-10 text-primary-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h3>
            <p className="text-slate-600 mb-6">
              Browse structured recorded, live, and hybrid courses to get started.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/courses')}
            >
              Browse Courses
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
              {items.map((it) => {
                const courseId = it.package?.course?.id;
                return (
                  <div key={it.id} className="card card-smooth">
                    <div className="flex items-center justify-between gap-6">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-lg text-slate-900 mb-1">
                          {it.package?.name || 'Course Package'}
                        </div>
                        {courseId ? (
                          <Link
                            to={`/courses/${courseId}`}
                            className="text-sm font-medium text-primary-700 hover:underline"
                          >
                            {it.package?.course?.title || 'View Course'}
                          </Link>
                        ) : (
                          <div className="text-sm text-slate-600">
                            {it.package?.course?.title || ''}
                          </div>
                        )}
                        {it.package?.duration ? (
                          <p className="text-xs text-slate-500 mt-1 tabular-nums">
                            {it.package.duration} days access
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500 mt-1">Lifetime access</p>
                        )}
                      </div>
                      <div className="flex items-center gap-5 shrink-0">
                        <div className="text-2xl font-bold text-primary-700 tabular-nums">
                          {formatCurrency(it.package?.finalPrice || 0)}
                        </div>
                        <button
                          type="button"
                          className="btn-sm btn-outline text-red-600 border-red-200 hover:bg-red-50"
                          disabled={working}
                          onClick={() => void handleRemove(it.packageId)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-1">
              <div className="card sticky top-20 space-y-5">
                <h2 className="text-xl font-bold text-slate-900">Order Summary</h2>
                <div className="flex items-center justify-between text-sm text-slate-600 tabular-nums">
                  <span>Selected packages</span>
                  <span className="font-semibold text-slate-900">{items.length}</span>
                </div>
                <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900">Total Amount</span>
                  <span className="text-3xl font-extrabold text-primary-700 tabular-nums">
                    {formatCurrency(total)}
                  </span>
                </div>
                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    className="btn-primary w-full"
                    onClick={() => navigate('/cart/checkout')}
                    disabled={items.length === 0 || working}
                  >
                    Proceed to Checkout
                  </button>
                  <button
                    type="button"
                    className="btn-secondary w-full"
                    onClick={() => setShowClearCartModal(true)}
                    disabled={working}
                  >
                    Clear Cart
                  </button>
                </div>
              </div>
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

import { useState, useEffect } from 'react';
import clientLogger from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Lock, CheckCircle, ShoppingCart } from 'lucide-react';
import { CartSummary } from '@/types';
import cartService from '@/services/cart.service';
import paymentService from '@/services/payment.service';
import SimulatedCheckoutForm from '@/components/student/SimulatedCheckoutForm';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/helpers';
import { extractErrorMessage } from '@/utils/error-handler';
import { usePageTitle, useTimeoutManager } from '@/hooks';

/**
 * Cart Checkout Page
 */
const CartCheckoutPage = () => {
  usePageTitle('Cart Checkout');
  const navigate = useNavigate();
  const { setManagedTimeout } = useTimeoutManager();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    let isActive = true;

    const fetchCart = async () => {
      setIsLoading(true);
      try {
        const cartData = await cartService.getCart();
        if (!isActive) {
          return;
        }
        if (!cartData || cartData.items.length === 0) {
          toast.error('Your cart is empty.');
          navigate('/cart');
          return;
        }
        setCart(cartData);
      } catch (error) {
        if (isActive) {
          clientLogger.error('Failed to load cart checkout data:', error);
          toast.error(extractErrorMessage(error, 'Failed to load cart information'));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };
    void fetchCart();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
    setManagedTimeout(() => navigate('/student/courses'), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center"><ShoppingCart className="w-8 h-8 text-white" /></div><div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div></div><p className="text-gray-600 font-medium">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="card max-w-md text-center shadow-lg-custom">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-6 mx-auto shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-3 text-gray-900">Enrollment Confirmed!</h2>
          <p className="text-gray-600 mb-8">You've successfully enrolled in your new courses.</p>
          <button type="button" onClick={() => navigate('/student/courses')} className="btn-primary w-full">Go to My Courses</button>
        </div>
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Could not load cart information.</p>
          <button type="button" className="btn-primary" onClick={() => navigate('/cart')}>Back to Cart</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900">
                  Cart <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Checkout</span>
                </h1>
                <p className="text-gray-500 font-medium">Confirm enrollment for {cart.items.length} item(s)</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="card shadow-xl border border-gray-100 rounded-2xl">
                <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900">
                  <div className="p-2 bg-primary-100 rounded-lg mr-3">
                    <CreditCard className="w-5 h-5 text-primary-600" />
                  </div>
                  Enrollment Confirmation
                </h2>
                <SimulatedCheckoutForm
                  amount={cart.totalAmount}
                  createPaymentIntent={() => paymentService.createCartPaymentIntent()}
                  onSuccess={handlePaymentSuccess}
                />
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="card sticky top-20 shadow-xl border border-gray-100 rounded-2xl">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Order Summary</h2>
                <div className="space-y-3 mb-6">
                  {cart.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700 truncate flex-1 pr-2 font-medium">{item.package?.course?.title}</span>
                      <span className="font-bold text-primary-600">{formatCurrency(item.package?.finalPrice || 0)}</span>
                    </div>
                  ))}
                </div>
                <hr className="my-6 border-gray-200" />
                <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl">
                  <span className="text-xl font-bold text-gray-900">Total</span>
                  <span className="text-3xl font-bold text-primary-600">{formatCurrency(cart.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartCheckoutPage;

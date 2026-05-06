import { useState, useEffect } from 'react';
import clientLogger from '@/utils/logger';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, Lock, CheckCircle, ShoppingCart, ShieldAlert } from 'lucide-react';
import { CartSummary } from '@/types';
import cartService from '@/services/cart.service';
import paymentService from '@/services/payment.service';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/helpers';
import { extractErrorMessage } from '@/utils/error-handler';
import { usePageTitle, useTimeoutManager } from '@/hooks';

/**
 * Cart Checkout Form Component
 */
const CartCheckoutForm = ({
  cart,
  onSuccess,
}: {
  cart: CartSummary;
  onSuccess: () => void;
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [acknowledgeSimulation, setAcknowledgeSimulation] = useState(false);
  const isSubmitDisabled = isProcessing || !agreeTerms || !acknowledgeSimulation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    if (!acknowledgeSimulation) {
      toast.error('Please confirm that this build uses simulated checkout');
      return;
    }

    setIsProcessing(true);
    try {
      const loadingToast = toast.loading('Preparing payment...');
      const paymentIntent = await paymentService.createCartPaymentIntent();

      toast.loading('Confirming simulated checkout...', { id: loadingToast });
      await new Promise((r) => setTimeout(r, 900));
      await paymentService.confirmPayment(paymentIntent.payment.id);

      toast.dismiss(loadingToast);
      toast.success('Enrollment confirmed');
      onSuccess();
    } catch (error) {
      clientLogger.error('Payment failed:', error);
      toast.error(extractErrorMessage(error, 'Payment failed. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-amber-100 p-3">
              <ShieldAlert className="h-6 w-6 text-amber-700" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-amber-900">
                Simulated checkout is enabled in this build
              </p>
              <p className="text-sm text-amber-800">
                No real payment gateway is connected here. This action will confirm enrollment without collecting, storing, or transmitting card details.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-start p-4 bg-gray-50 rounded-xl">
        <input type="checkbox" id="terms" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1 mr-3 w-5 h-5" required />
        <label htmlFor="terms" className="text-sm text-gray-700">I agree to the <Link to="/terms" className="text-primary-600 hover:underline font-semibold">Terms of Service</Link> and <Link to="/privacy" className="text-primary-600 hover:underline font-semibold">Privacy Policy</Link></label>
      </div>
      <div className="flex items-start p-4 bg-gray-50 rounded-xl">
        <input
          type="checkbox"
          id="simulation"
          checked={acknowledgeSimulation}
          onChange={(e) => setAcknowledgeSimulation(e.target.checked)}
          className="mt-1 mr-3 w-5 h-5"
          required
        />
        <label htmlFor="simulation" className="text-sm text-gray-700">
          I understand this is a development checkout simulation and no card information will be requested in this build.
        </label>
      </div>
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4 flex items-start space-x-3">
        <div className="p-2 bg-blue-200 rounded-lg flex-shrink-0">
          <Lock className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <p className="text-sm font-bold text-blue-900">Build Payment Mode</p>
          <p className="text-xs text-blue-700 mt-1">Enrollment is confirmed through the platform backend, but no third-party payment processor is configured in this build.</p>
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center">
            <div className="spinner mr-2"></div>
            Confirming...
          </span>
        ) : (
          `Confirm ${formatCurrency(cart.totalAmount)} Enrollment`
        )}
      </button>
    </form>
  );
};

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
                  <CartCheckoutForm cart={cart} onSuccess={handlePaymentSuccess} />
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

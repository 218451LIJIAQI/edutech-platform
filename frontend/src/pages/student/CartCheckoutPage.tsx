import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Lock, CheckCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { CartSummary } from '@/types';
import cartService from '@/services/cart.service';
import paymentService from '@/services/payment.service';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/helpers';

// Initialize Stripe
const { VITE_STRIPE_PUBLISHABLE_KEY, VITE_STRIPE_PUBLIC_KEY, VITE_ENABLE_PAYMENT_MOCK } = (import.meta as any).env || import.meta.env;
const stripePublicKey = VITE_STRIPE_PUBLISHABLE_KEY || VITE_STRIPE_PUBLIC_KEY || 'pk_test_placeholder';
const stripePromise = loadStripe(stripePublicKey);
const enableMockPayment = (String(VITE_ENABLE_PAYMENT_MOCK).toLowerCase() === 'true');

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
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardName, setCardName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardName.trim()) {
      toast.error('Please enter cardholder name');
      return;
    }

    if (!agreeTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    setIsProcessing(true);

    try {
      const loadingToast = toast.loading('Preparing payment...');
      const paymentIntent = await paymentService.createCartPaymentIntent();

      if (enableMockPayment || !paymentIntent.clientSecret) {
        toast.loading('Processing payment...', { id: loadingToast });
        await new Promise((r) => setTimeout(r, 1200));
        await paymentService.confirmPayment(paymentIntent.payment.id);
        toast.dismiss(loadingToast);
        toast.success('Payment successful!');
        onSuccess();
        return;
      }

      // Real Stripe flow
      if (!paymentIntent.clientSecret) {
        toast.dismiss(loadingToast);
        toast.error('Payment system is not properly configured. Please contact support.');
        setIsProcessing(false);
        return;
      }

      if (!stripe || !elements) {
        toast.dismiss(loadingToast);
        toast.error('Payment system is not available. Please refresh the page and try again.');
        setIsProcessing(false);
        return;
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        toast.dismiss(loadingToast);
        toast.error('Card information is missing');
        setIsProcessing(false);
        return;
      }

      toast.loading('Processing payment...', { id: loadingToast });
      const { error, paymentIntent: confirmedPayment } = await stripe.confirmCardPayment(paymentIntent.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name: cardName },
        },
      });

      if (error) {
        throw new Error(error.message || 'Card payment failed');
      }

      if (!confirmedPayment || confirmedPayment.status !== 'succeeded') {
        throw new Error('Payment was not successful. Please try again.');
      }

      await paymentService.confirmPayment(paymentIntent.payment.id, confirmedPayment.id);

      toast.dismiss(loadingToast);
      toast.success('Payment successful!');
      onSuccess();
    } catch (error: any) {
      console.error('Payment failed:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name *</label>
        <input type="text" value={cardName} onChange={(e) => setCardName(e.target.value)} className="input" placeholder="John Doe" required />
      </div>
      {/* Card Element (hidden in mock mode) */}
      {enableMockPayment ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
          Mock payment is enabled. No card details required.
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Card Information *</label>
          <div className="border border-gray-300 rounded-lg p-3 bg-white">
            <CardElement options={{ style: { base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } }, invalid: { color: '#9e2146' } } }} />
          </div>
        </div>
      )}
      <div className="flex items-start">
        <input type="checkbox" id="terms" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1 mr-2" required />
        <label htmlFor="terms" className="text-sm text-gray-600">I agree to the <a href="/terms" className="text-primary-600 hover:underline">Terms of Service</a> and <a href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</a></label>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
        <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">Secure Payment</p>
          <p className="text-xs text-blue-700 mt-1">Your payment information is encrypted and secure, powered by Stripe.</p>
        </div>
      </div>
      <button type="submit" disabled={(!enableMockPayment && !stripe) || isProcessing} className="btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed">
        {isProcessing ? <span className="flex items-center justify-center"><div className="spinner mr-2"></div>Processing...</span> : `Pay ${formatCurrency(cart.totalAmount)}`}
      </button>
    </form>
  );
};

/**
 * Cart Checkout Page
 */
const CartCheckoutPage = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const fetchCart = async () => {
      setIsLoading(true);
      try {
        const cartData = await cartService.getCart();
        if (!cartData || cartData.items.length === 0) {
          toast.error('Your cart is empty.');
          navigate('/cart');
          return;
        }
        setCart(cartData);
      } catch (error) {
        toast.error('Failed to load cart information');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCart();
  }, [navigate]);

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
    setTimeout(() => navigate('/student/courses'), 2000);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="spinner"></div></div>;
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">You've successfully enrolled in your new courses.</p>
          <button onClick={() => navigate('/student/courses')} className="btn-primary w-full">Go to My Courses</button>
        </div>
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">Could not load cart information.</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Secure Cart Checkout</h1>
              <p className="text-gray-600">Complete your purchase for {cart.items.length} item(s).</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="card">
                  <h2 className="text-xl font-bold mb-6 flex items-center"><CreditCard className="w-5 h-5 mr-2" />Payment Information</h2>
                  <CartCheckoutForm cart={cart} onSuccess={handlePaymentSuccess} />
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="card sticky top-4">
                  <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                  <div className="space-y-3 mb-4">
                    {cart.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 truncate flex-1 pr-2">{item.package?.course?.title}</span>
                        <span className="font-medium">{formatCurrency(item.package?.finalPrice || 0)}</span>
                      </div>
                    ))}
                  </div>
                  <hr className="my-4" />
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-bold text-primary-600">{formatCurrency(cart.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Elements>
  );
};

export default CartCheckoutPage;

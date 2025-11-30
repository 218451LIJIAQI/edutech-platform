import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Course, LessonPackage } from '@/types';
import courseService from '@/services/course.service';
import paymentService from '@/services/payment.service';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/helpers';

// Initialize Stripe
const { VITE_STRIPE_PUBLISHABLE_KEY, VITE_STRIPE_PUBLIC_KEY, VITE_ENABLE_PAYMENT_MOCK } = import.meta.env;
const stripePublicKey = VITE_STRIPE_PUBLISHABLE_KEY || VITE_STRIPE_PUBLIC_KEY || 'pk_test_placeholder';
const stripePromise = loadStripe(stripePublicKey);
const enableMockPayment = (String(VITE_ENABLE_PAYMENT_MOCK).toLowerCase() === 'true');

/**
 * Checkout Form Component - Handles the actual payment
 */
const CheckoutForm = ({
  selectedPackage,
  onSuccess,
}: {
  selectedPackage: LessonPackage;
  onSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardName, setCardName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  
  // Mock card state
  const [mockCard, setMockCard] = useState({
    number: '',
    expiry: '',
    cvc: '',
  });

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const validateMockCard = () => {
    const cardNum = mockCard.number.replace(/\s/g, '');
    if (cardNum.length < 13) {
      toast.error('Please enter a valid card number');
      return false;
    }
    if (mockCard.expiry.length < 5) {
      toast.error('Please enter a valid expiry date (MM/YY)');
      return false;
    }
    if (mockCard.cvc.length < 3) {
      toast.error('Please enter a valid CVC');
      return false;
    }
    return true;
  };

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
      const paymentIntent = await paymentService.createPaymentIntent(selectedPackage.id);

      // Handle mock payment mode
      if (enableMockPayment) {
        if (!validateMockCard()) {
          toast.dismiss(loadingToast);
          setIsProcessing(false);
          return;
        }
        toast.loading('Validating card...', { id: loadingToast });
        await new Promise((r) => setTimeout(r, 800));
        toast.loading('Processing payment...', { id: loadingToast });
        await new Promise((r) => setTimeout(r, 1000));
        await paymentService.confirmPayment(paymentIntent.payment.id);
        toast.dismiss(loadingToast);
        toast.success('Payment successful!');
        onSuccess();
        return;
      }

      // Real Stripe flow - validate client secret
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
      const { error, paymentIntent: confirmedPayment } = await stripe.confirmCardPayment(
        paymentIntent.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: { name: cardName },
          },
        }
      );

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
    } catch (error) {
      let errorMessage = 'Payment failed. Please try again.';
      
      if (error instanceof Error) {
        if ('response' in error) {
          const apiError = error as { response?: { data?: { message?: string } } };
          errorMessage = apiError.response?.data?.message || error.message || errorMessage;
        } else {
          errorMessage = error.message || errorMessage;
        }
      }
      
      console.error('Payment failed:', error);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cardholder Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Cardholder Name *
        </label>
        <input
          type="text"
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          className="input"
          placeholder="John Doe"
          required
        />
      </div>

      {/* Card Element */}
      {enableMockPayment ? (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Card Information * <span className="text-xs text-orange-500 font-normal">(Mock Mode)</span>
          </label>
          <div className="space-y-3">
            {/* Card Number */}
            <div className="relative">
              <input
                type="text"
                value={mockCard.number}
                onChange={(e) => setMockCard({ ...mockCard, number: formatCardNumber(e.target.value) })}
                className="input pr-12"
                placeholder="4242 4242 4242 4242"
                maxLength={19}
              />
              <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            {/* Expiry and CVC */}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={mockCard.expiry}
                onChange={(e) => setMockCard({ ...mockCard, expiry: formatExpiry(e.target.value) })}
                className="input"
                placeholder="MM/YY"
                maxLength={5}
              />
              <input
                type="text"
                value={mockCard.cvc}
                onChange={(e) => setMockCard({ ...mockCard, cvc: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })}
                className="input"
                placeholder="CVC"
                maxLength={4}
              />
            </div>
          </div>
          <p className="text-xs text-orange-600 mt-2">
            🧪 Mock mode: Enter any card info to simulate payment
          </p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Card Information *
          </label>
          <div className="border-2 border-gray-200 rounded-xl p-4 bg-white hover:border-gray-300 transition-colors">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Card information is securely processed by Stripe
          </p>
        </div>
      )}

      {/* Terms */}
      <div className="flex items-start p-4 bg-gray-50 rounded-xl">
        <input
          type="checkbox"
          id="terms"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="mt-1 mr-3 w-5 h-5"
          required
        />
        <label htmlFor="terms" className="text-sm text-gray-700">
          I agree to the{' '}
          <a href="/terms" className="text-primary-600 hover:underline font-semibold">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-primary-600 hover:underline font-semibold">
            Privacy Policy
          </a>
        </label>
      </div>

      {/* Security Notice */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-200 rounded-lg flex-shrink-0">
            <Lock className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-900">Secure Payment</p>
            <p className="text-xs text-blue-700 mt-1">
              Your payment information is encrypted and secure. We use
              industry-standard SSL encryption powered by Stripe.
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={(!enableMockPayment && !stripe) || isProcessing}
        className="btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center">
            <div className="spinner mr-2"></div>
            Processing...
          </span>
        ) : (
          `Pay ${formatCurrency(selectedPackage.finalPrice)}`
        )}
      </button>
    </form>
  );
};

/**
 * Checkout Page
 * Payment processing page with real Stripe integration
 */
const CheckoutPage = () => {
  const { courseId, packageId } = useParams<{
    courseId: string;
    packageId: string;
  }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<LessonPackage | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (courseId && packageId) {
      fetchCourseData();
    } else {
      toast.error('Missing course or package information');
      navigate('/courses');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, packageId, navigate]);

  const fetchCourseData = async () => {
    if (!courseId || !packageId) {
      return;
    }

    setIsLoading(true);
    try {
      const courseData = await courseService.getCourseById(courseId);
      setCourse(courseData);

      const pkg = courseData.packages?.find((p) => p.id === packageId);
      if (pkg) {
        setSelectedPackage(pkg);
      } else {
        toast.error('Package not found');
        navigate(`/courses/${courseId}`);
      }
    } catch (error) {
      console.error('Failed to fetch course:', error);
      toast.error('Failed to load course information');
      navigate('/courses');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
    setTimeout(() => {
      navigate(`/student/courses`);
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center"><span className="text-2xl">💳</span></div><div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div></div><p className="text-gray-600 font-medium">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!course || !selectedPackage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Course or package not found</p>
          <button className="btn-primary" onClick={() => navigate('/courses')}>Browse Courses</button>
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
          <h2 className="text-3xl font-bold mb-3 text-gray-900">Payment Successful!</h2>
          <p className="text-gray-600 mb-8">
            You've successfully enrolled in {course.title}
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate(`/courses/${courseId}/learn`)}
              className="btn-primary w-full"
            >
              Start Learning
            </button>
            <button
              type="button"
              onClick={() => navigate('/student/courses')}
              className="btn-outline w-full"
            >
              Go to My Courses
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-8 relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    Secure <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Checkout</span>
                  </h1>
                  <p className="text-gray-500 font-medium">Complete your purchase to start learning</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Payment Form */}
              <div className="lg:col-span-2">
                <div className="card shadow-xl border border-gray-100 rounded-2xl">
                  <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900">
                    <div className="p-2 bg-primary-100 rounded-lg mr-3">
                      <CreditCard className="w-5 h-5 text-primary-600" />
                    </div>
                    Payment Information
                  </h2>

                  <CheckoutForm
                    selectedPackage={selectedPackage}
                    onSuccess={handlePaymentSuccess}
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="card sticky top-20 shadow-lg">
                  <h2 className="text-2xl font-bold mb-6 text-gray-900">Order Summary</h2>

                  {/* Course Info */}
                  <div className="mb-6">
                    {course.thumbnail && (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-40 object-cover rounded-xl mb-4 shadow-md"
                      />
                    )}
                    <h3 className="font-bold text-lg mb-2 text-gray-900">{course.title}</h3>
                    <p className="text-sm text-gray-600">
                      by {course.teacherProfile?.user?.firstName}{' '}
                      {course.teacherProfile?.user?.lastName}
                    </p>
                  </div>

                  <hr className="my-6 border-gray-200" />

                  {/* Package Details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700 font-medium">
                        {selectedPackage.name}
                      </span>
                      <span className="font-bold text-gray-900">
                        ${selectedPackage.price}
                      </span>
                    </div>
                    {selectedPackage.discount && selectedPackage.discount > 0 && (
                      <div className="flex items-center justify-between text-green-600 p-3 bg-green-50 rounded-lg">
                        <span className="font-semibold">Discount</span>
                        <span className="font-bold">-${selectedPackage.discount}</span>
                      </div>
                    )}
                  </div>

                  <hr className="my-6 border-gray-200" />

                  {/* Total */}
                  <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl">
                    <span className="text-xl font-bold text-gray-900">Total</span>
                    <span className="text-3xl font-bold text-primary-600">
                      {formatCurrency(selectedPackage.finalPrice)}
                    </span>
                  </div>

                  {/* Features */}
                  {selectedPackage.features &&
                    selectedPackage.features.length > 0 && (
                      <>
                        <hr className="my-6 border-gray-200" />
                        <div>
                          <p className="font-bold mb-3 text-gray-900">Includes:</p>
                          <ul className="space-y-2">
                            {(selectedPackage.features as string[]).map(
                              (feature, index) => (
                                <li
                                  key={index}
                                  className="flex items-start text-sm p-2 bg-gray-50 rounded-lg"
                                >
                                  <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                                  <span className="text-gray-700 font-medium">
                                    {feature}
                                  </span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </>
                    )}

                  {/* Money Back Guarantee */}
                  <div className="mt-6 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-green-200 rounded-lg flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-green-700" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-green-900">
                          30-Day Money-Back Guarantee
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          If you're not satisfied, get a full refund within 30
                          days.
                        </p>
                      </div>
                    </div>
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

export default CheckoutPage;

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
const stripePublicKey =
  (import.meta as any).env?.VITE_STRIPE_PUBLIC_KEY || 'pk_test_placeholder';
const stripePromise = loadStripe(stripePublicKey);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error('Stripe has not loaded yet. Please try again.');
      return;
    }

    if (!cardName.trim()) {
      toast.error('Please enter cardholder name');
      return;
    }

    if (!agreeTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error('Card information is missing');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create payment intent on backend
      const loadingToast = toast.loading('Preparing payment...');
      const paymentIntent = await paymentService.createPaymentIntent(
        selectedPackage.id
      );

      if (!paymentIntent.clientSecret) {
        toast.dismiss(loadingToast);
        throw new Error('Failed to initialize payment');
      }

      // Step 2: Confirm payment with Stripe
      toast.loading('Processing payment...', { id: loadingToast });
      const { error, paymentIntent: confirmedPayment } =
        await stripe.confirmCardPayment(paymentIntent.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: cardName,
            },
          },
        });

      if (error) {
        throw new Error(error.message);
      }

      if (!confirmedPayment || confirmedPayment.status !== 'succeeded') {
        throw new Error('Payment was not successful');
      }

      // Step 3: Confirm payment on backend
      await paymentService.confirmPayment(
        paymentIntent.payment.id,
        confirmedPayment.id
      );

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
      {/* Cardholder Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information *
        </label>
        <div className="border border-gray-300 rounded-lg p-3 bg-white">
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
        <p className="text-xs text-gray-500 mt-1">
          Card information is securely processed by Stripe
        </p>
      </div>

      {/* Terms */}
      <div className="flex items-start">
        <input
          type="checkbox"
          id="terms"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="mt-1 mr-2"
          required
        />
        <label htmlFor="terms" className="text-sm text-gray-600">
          I agree to the{' '}
          <a href="/terms" className="text-primary-600 hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-primary-600 hover:underline">
            Privacy Policy
          </a>
        </label>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Secure Payment</p>
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
        disabled={!stripe || isProcessing}
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
    fetchCourseData();
  }, [courseId, packageId]);

  const fetchCourseData = async () => {
    setIsLoading(true);
    try {
      const courseData = await courseService.getCourseById(courseId!);
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!course || !selectedPackage) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">Course or package not found</p>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">
            You've successfully enrolled in {course.title}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => navigate(`/courses/${courseId}/learn`)}
              className="btn-primary w-full"
            >
              Start Learning
            </button>
            <button
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Secure Checkout</h1>
              <p className="text-gray-600">
                Complete your purchase to start learning
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Payment Form */}
              <div className="lg:col-span-2">
                <div className="card">
                  <h2 className="text-xl font-bold mb-6 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
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
                <div className="card sticky top-4">
                  <h2 className="text-xl font-bold mb-4">Order Summary</h2>

                  {/* Course Info */}
                  <div className="mb-6">
                    {course.thumbnail && (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    )}
                    <h3 className="font-semibold mb-1">{course.title}</h3>
                    <p className="text-sm text-gray-600">
                      by {course.teacherProfile?.user?.firstName}{' '}
                      {course.teacherProfile?.user?.lastName}
                    </p>
                  </div>

                  <hr className="my-4" />

                  {/* Package Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">
                        {selectedPackage.name}
                      </span>
                      <span className="font-medium">
                        ${selectedPackage.price}
                      </span>
                    </div>
                    {selectedPackage.discount && selectedPackage.discount > 0 && (
                      <div className="flex items-center justify-between text-green-600">
                        <span>Discount</span>
                        <span>-${selectedPackage.discount}</span>
                      </div>
                    )}
                  </div>

                  <hr className="my-4" />

                  {/* Total */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-bold text-primary-600">
                      {formatCurrency(selectedPackage.finalPrice)}
                    </span>
                  </div>

                  {/* Features */}
                  {selectedPackage.features &&
                    selectedPackage.features.length > 0 && (
                      <>
                        <hr className="my-4" />
                        <div>
                          <p className="font-medium mb-2">Includes:</p>
                          <ul className="space-y-2">
                            {(selectedPackage.features as string[]).map(
                              (feature, index) => (
                                <li
                                  key={index}
                                  className="flex items-start text-sm"
                                >
                                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                                  <span className="text-gray-700">
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
                  <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">
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

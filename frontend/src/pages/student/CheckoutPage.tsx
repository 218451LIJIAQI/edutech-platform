import { useState, useEffect, useRef } from 'react';
import clientLogger from '@/utils/logger';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { CreditCard, Lock, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import { Course, LessonPackage } from '@/types';
import courseService from '@/services/course.service';
import paymentService from '@/services/payment.service';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/helpers';
import { extractErrorMessage } from '@/utils/error-handler';
import { usePageTitle, useTimeoutManager } from '@/hooks';

/**
 * Checkout Form Component - Handles the current simulated payment flow
 */
const CheckoutForm = ({
  selectedPackage,
  onSuccess,
}: {
  selectedPackage: LessonPackage;
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
      const paymentIntent = await paymentService.createPaymentIntent(selectedPackage.id);
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
          <Link to="/terms" className="text-primary-600 hover:underline font-semibold">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-primary-600 hover:underline font-semibold">
            Privacy Policy
          </Link>
        </label>
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

      {/* Security Notice */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-200 rounded-lg flex-shrink-0">
            <Lock className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-900">Build Payment Mode</p>
            <p className="text-xs text-blue-700 mt-1">
              Enrollment is confirmed through the platform backend, but no third-party payment processor is configured in this build.
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
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
          `Confirm ${formatCurrency(selectedPackage.finalPrice)} Enrollment`
        )}
      </button>
    </form>
  );
};

/**
 * Checkout Page
 * Enrollment confirmation page using the current simulated checkout flow.
 */
const CheckoutPage = () => {
  const { courseId, packageId } = useParams<{
    courseId: string;
    packageId: string;
  }>();
  const navigate = useNavigate();
  const { setManagedTimeout, clearManagedTimeout } = useTimeoutManager();

  const [course, setCourse] = useState<Course | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<LessonPackage | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const redirectTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  usePageTitle(course ? `Checkout ${course.title}` : 'Checkout');

  useEffect(() => {
    let isActive = true;

    const loadCheckoutData = async () => {
      if (!courseId || !packageId) {
        toast.error('Missing course or package information');
        navigate('/courses');
        return;
      }

      setIsLoading(true);
      try {
        const courseData = await courseService.getCourseById(courseId);
        if (!isActive) {
          return;
        }

        if (courseData.isEnrolled) {
          toast.error('You already have active access to this course');
          navigate('/student/courses');
          return;
        }

        setCourse(courseData);

        const pkg = courseData.packages?.find((coursePackage) => coursePackage.id === packageId);
        if (pkg) {
          setSelectedPackage(pkg);
        } else {
          toast.error('Package not found');
          navigate(`/courses/${courseId}`);
        }
      } catch (error) {
        if (isActive) {
          clientLogger.error('Failed to fetch course:', error);
          toast.error(extractErrorMessage(error, 'Failed to load course information'));
          navigate('/courses');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadCheckoutData();

    return () => {
      isActive = false;
      clearManagedTimeout(redirectTimeoutRef.current);
    };
  }, [clearManagedTimeout, courseId, packageId, navigate]);

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
    // Auto-redirect to My Courses after 5 seconds if user doesn't click anything
    redirectTimeoutRef.current = setManagedTimeout(() => {
      navigate('/student/courses');
    }, 5000);
  };

  // Cancel auto-redirect and navigate to learning page
  const handleStartLearning = () => {
    clearManagedTimeout(redirectTimeoutRef.current);
    redirectTimeoutRef.current = null;
    navigate(`/courses/${courseId}/learn`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse flex items-center justify-center"><CreditCard className="w-8 h-8 text-white" /></div><div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping"></div></div><p className="text-gray-600 font-medium">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!course || !selectedPackage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Course or package not found</p>
          <button type="button" className="btn-primary" onClick={() => navigate('/courses')}>Browse Courses</button>
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
          <p className="text-gray-600 mb-8">
            You've successfully enrolled in {course.title}
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleStartLearning}
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
                  <h1 className="text-3xl font-extrabold text-gray-900">
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Checkout</span>
                  </h1>
                  <p className="text-gray-500 font-medium">Confirm your enrollment to start learning</p>
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
                    Enrollment Confirmation
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
                        {formatCurrency(selectedPackage.price)}
                      </span>
                    </div>
                    {selectedPackage.discount && selectedPackage.discount > 0 && (
                      <div className="flex items-center justify-between text-green-600 p-3 bg-green-50 rounded-lg">
                        <span className="font-semibold">Discount</span>
                        <span className="font-bold">-{formatCurrency(selectedPackage.discount)}</span>
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
  );
};

export default CheckoutPage;

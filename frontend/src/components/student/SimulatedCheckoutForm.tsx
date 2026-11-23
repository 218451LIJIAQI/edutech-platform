import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import clientLogger from '@/utils/logger';
import paymentService from '@/services/payment.service';
import { formatCurrency } from '@/utils/helpers';
import { extractErrorMessage } from '@/utils/error-handler';

interface SimulatedCheckoutFormProps {
  amount: number;
  createPaymentIntent: () => Promise<{ payment: { id: string } }>;
  onSuccess: () => void;
}

/**
 * Shared simulated-checkout confirmation form used by both single-course
 * checkout and shopping-cart checkout.
 */
export default function SimulatedCheckoutForm({
  amount,
  createPaymentIntent,
  onSuccess,
}: SimulatedCheckoutFormProps) {
  const idPrefix = useId();
  const termsCheckboxId = `${idPrefix}-terms`;
  const simulationCheckboxId = `${idPrefix}-simulation`;

  const [isProcessing, setIsProcessing] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [acknowledgeSimulation, setAcknowledgeSimulation] = useState(false);
  const isSubmitDisabled = isProcessing || !agreeTerms || !acknowledgeSimulation;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!agreeTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    if (!acknowledgeSimulation) {
      toast.error('Please confirm that this build uses simulated checkout');
      return;
    }

    setIsProcessing(true);
    let loadingToast: string | undefined;

    try {
      loadingToast = toast.loading('Preparing payment...');
      const paymentIntent = await createPaymentIntent();

      toast.loading('Confirming simulated checkout...', { id: loadingToast });
      await new Promise((resolve) => setTimeout(resolve, 900));
      await paymentService.confirmPayment(paymentIntent.payment.id);

      toast.dismiss(loadingToast);
      loadingToast = undefined;
      toast.success('Enrollment confirmed');
      onSuccess();
    } catch (error) {
      clientLogger.error('Payment failed:', error);
      toast.error(extractErrorMessage(error, 'Payment failed. Please try again.'));
    } finally {
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
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

      <div className="flex items-start p-4 bg-gray-50 rounded-xl">
        <input
          type="checkbox"
          id={termsCheckboxId}
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="mt-1 mr-3 w-5 h-5"
          required
        />
        <label htmlFor={termsCheckboxId} className="text-sm text-gray-700">
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
          id={simulationCheckboxId}
          checked={acknowledgeSimulation}
          onChange={(e) => setAcknowledgeSimulation(e.target.checked)}
          className="mt-1 mr-3 w-5 h-5"
          required
        />
        <label htmlFor={simulationCheckboxId} className="text-sm text-gray-700">
          I understand this is a development checkout simulation and no card information will be requested in this build.
        </label>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4 flex items-start space-x-3">
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
          `Confirm ${formatCurrency(amount)} Enrollment`
        )}
      </button>
    </form>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Wallet, X } from 'lucide-react';
import toast from 'react-hot-toast';

import ordersService from '@/services/orders.service';
import { Order, RefundMethod } from '@/types';
import { useOverlayAccessibility } from '@/hooks';
import { extractErrorMessage } from '@/utils/error-handler';
import clientLogger from '@/utils/logger';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  maxRefundAmount?: number;
  onRefundSubmitted?: () => void;
}

const STEPS = ['amount', 'reason', 'method', 'confirm'] as const;
type RefundStep = (typeof STEPS)[number];

const REASON_OPTIONS = [
  { value: 'QUALITY_ISSUE', label: 'Quality Issue' },
  { value: 'CHANGED_MIND', label: 'Changed My Mind' },
  { value: 'TECHNICAL_ISSUE', label: 'Technical Issue' },
  { value: 'NOT_AS_DESCRIBED', label: 'Not As Described' },
  { value: 'DUPLICATE_ORDER', label: 'Duplicate Order' },
  { value: 'OTHER', label: 'Other' },
];

const REFUND_METHOD_OPTIONS = [
  {
    value: RefundMethod.ORIGINAL_PAYMENT,
    label: 'Original Payment Method',
    description: 'Refund will be credited back to your original payment method.',
  },
  {
    value: RefundMethod.WALLET,
    label: 'Wallet',
    description: 'Refund will be credited to your platform wallet balance.',
  },
  {
    value: RefundMethod.BANK_TRANSFER,
    label: 'Bank Transfer',
    description: 'Refund will be transferred directly to your bank account.',
  },
];

const toMoneyNumber = (value: unknown): number => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const formatCurrency = (value: unknown): string => {
  return toMoneyNumber(value).toFixed(2);
};

/**
 * Enhanced Refund Modal Component
 *
 * Provides a complete refund request flow:
 * - Refund amount validation
 * - Refund reason category and details
 * - Refund method selection
 * - Bank transfer details when required
 * - Final confirmation before submission
 */
const RefundModal = ({
  isOpen,
  onClose,
  order,
  maxRefundAmount,
  onRefundSubmitted,
}: RefundModalProps) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const amountInputRef = useRef<HTMLInputElement | null>(null);

  const orderTotal = toMoneyNumber(order.totalAmount);

  const refundableAmount = useMemo(() => {
    if (typeof maxRefundAmount === 'number' && Number.isFinite(maxRefundAmount)) {
      return Math.min(Math.max(0, maxRefundAmount), orderTotal);
    }

    return Math.max(0, orderTotal);
  }, [maxRefundAmount, orderTotal]);

  const [step, setStep] = useState<RefundStep>('amount');
  const [working, setWorking] = useState(false);

  const [refundAmount, setRefundAmount] = useState(formatCurrency(refundableAmount));
  const [reasonCategory, setReasonCategory] = useState('QUALITY_ISSUE');
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<RefundMethod>(
    RefundMethod.ORIGINAL_PAYMENT
  );
  const [bankDetails, setBankDetails] = useState('');
  const [notes, setNotes] = useState('');

  const currentStepIndex = STEPS.indexOf(step);

  useEffect(() => {
    if (!isOpen) return;

    setStep('amount');
    setRefundAmount(formatCurrency(refundableAmount));
    setReasonCategory('QUALITY_ISSUE');
    setReason('');
    setRefundMethod(RefundMethod.ORIGINAL_PAYMENT);
    setBankDetails('');
    setNotes('');
    setWorking(false);
  }, [isOpen, order.id, refundableAmount]);

  useOverlayAccessibility({
    isOpen,
    containerRef: modalRef,
    initialFocusRef: amountInputRef,
    onClose,
    trapFocus: true,
    lockBodyScroll: true,
  });

  const validateAmount = (): boolean => {
    const amount = Number(refundAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter a valid refund amount.');
      return false;
    }

    if (amount > refundableAmount) {
      toast.error(`Refund amount cannot exceed $${refundableAmount.toFixed(2)}.`);
      return false;
    }

    return true;
  };

  const validateReason = (): boolean => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the refund.');
      return false;
    }

    return true;
  };

  const validateMethod = (): boolean => {
    if (refundMethod === RefundMethod.BANK_TRANSFER && !bankDetails.trim()) {
      toast.error('Please provide your bank account details.');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (working) return;

    if (step === 'amount') {
      if (!validateAmount()) return;
      setStep('reason');
      return;
    }

    if (step === 'reason') {
      if (!validateReason()) return;
      setStep('method');
      return;
    }

    if (step === 'method') {
      if (!validateMethod()) return;
      setStep('confirm');
    }
  };

  const handlePrevious = () => {
    if (working) return;

    if (step === 'reason') setStep('amount');
    else if (step === 'method') setStep('reason');
    else if (step === 'confirm') setStep('method');
  };

  const handleSubmit = async () => {
    if (working) return;

    if (!validateAmount() || !validateReason() || !validateMethod()) return;

    const normalizedAmount = Number(refundAmount);
    const normalizedReason = reason.trim();
    const normalizedBankDetails =
      refundMethod === RefundMethod.BANK_TRANSFER ? bankDetails.trim() : undefined;
    const normalizedNotes = notes.trim() || undefined;

    setWorking(true);

    try {
      await ordersService.requestRefund(
        order.id,
        normalizedAmount,
        normalizedReason,
        reasonCategory,
        refundMethod,
        normalizedBankDetails,
        normalizedNotes
      );

      toast.success('Refund request submitted successfully.');
      onRefundSubmitted?.();
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to submit refund request.'));
      clientLogger.error('Refund request error:', error);
    } finally {
      setWorking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-modal-title"
        aria-describedby="refund-modal-description"
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <Wallet className="h-7 w-7 text-blue-100" aria-hidden="true" />
            <div>
              <h2 id="refund-modal-title" className="text-2xl font-bold">
                Request Refund
              </h2>
              <p className="text-sm text-blue-100">Order: {order.orderNo}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={working}
            className="rounded-full p-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close refund modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p id="refund-modal-description" className="sr-only">
          Request a refund by reviewing the amount, reason, refund method, and
          confirmation details before submitting.
        </p>

        <div className="flex items-center justify-between px-6 pb-4 pt-6" aria-label="Refund request progress">
          {STEPS.map((stepName, index) => (
            <div key={stepName} className="flex flex-1 items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                  currentStepIndex >= index
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
                aria-current={step === stepName ? 'step' : undefined}
              >
                {index + 1}
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-1 flex-1 transition-all ${
                    currentStepIndex > index ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="max-h-[65vh] min-h-96 overflow-y-auto p-6">
          {step === 'amount' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Refund Amount</h3>

              <p className="text-gray-600">
                Order Total:{' '}
                <span className="text-lg font-bold">${formatCurrency(orderTotal)}</span>
              </p>

              <p className="text-gray-600">
                Remaining Refundable:{' '}
                <span className="text-lg font-bold text-blue-600">
                  ${formatCurrency(refundableAmount)}
                </span>
              </p>

              <div>
                <label
                  htmlFor="refund-amount"
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Refund Amount *
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-gray-600">$</span>
                  <input
                    ref={amountInputRef}
                    id="refund-amount"
                    type="number"
                    value={refundAmount}
                    onChange={(event) => setRefundAmount(event.target.value)}
                    step="0.01"
                    min="0.01"
                    max={refundableAmount.toFixed(2)}
                    className="input flex-1"
                    disabled={working || refundableAmount <= 0}
                    aria-describedby="refund-amount-help"
                  />
                </div>
              </div>

              <div
                id="refund-amount-help"
                className="rounded-lg border border-blue-200 bg-blue-50 p-4"
              >
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Note:</span> You can request a
                  partial or full refund. The maximum refund amount is $
                  {formatCurrency(refundableAmount)}.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRefundAmount(refundableAmount.toFixed(2))}
                  disabled={working || refundableAmount <= 0}
                  className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Full Refund
                </button>

                <button
                  type="button"
                  onClick={() => setRefundAmount((refundableAmount / 2).toFixed(2))}
                  disabled={working || refundableAmount <= 0}
                  className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Half Refund
                </button>
              </div>
            </div>
          )}

          {step === 'reason' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Refund Reason</h3>

              <div>
                <label
                  htmlFor="reason-category"
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Reason Category *
                </label>

                <select
                  id="reason-category"
                  value={reasonCategory}
                  onChange={(event) => setReasonCategory(event.target.value)}
                  className="input w-full"
                  disabled={working}
                >
                  {REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="refund-reason"
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Detailed Reason *
                </label>

                <textarea
                  id="refund-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Please explain why you want to request a refund..."
                  className="input h-32 w-full resize-none"
                  disabled={working}
                  maxLength={1000}
                />
              </div>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Tip:</span> Providing a detailed
                  reason helps us process your refund faster.
                </p>
              </div>
            </div>
          )}

          {step === 'method' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Refund Method</h3>

              <fieldset className="space-y-3">
                <legend className="sr-only">Choose refund method</legend>

                {REFUND_METHOD_OPTIONS.map((method) => (
                  <label
                    key={method.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors hover:border-blue-500 ${
                      refundMethod === method.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      value={method.value}
                      checked={refundMethod === method.value}
                      onChange={() => setRefundMethod(method.value)}
                      className="mt-1"
                      disabled={working}
                    />

                    <div>
                      <p className="font-semibold text-gray-900">{method.label}</p>
                      <p className="text-sm text-gray-600">{method.description}</p>
                    </div>
                  </label>
                ))}
              </fieldset>

              {refundMethod === RefundMethod.BANK_TRANSFER && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <label
                    htmlFor="bank-details"
                    className="mb-2 block text-sm font-semibold text-gray-900"
                  >
                    Bank Account Details *
                  </label>

                  <textarea
                    id="bank-details"
                    value={bankDetails}
                    onChange={(event) => setBankDetails(event.target.value)}
                    placeholder="Please provide your bank name, account holder name, and account number."
                    className="input h-24 w-full resize-none"
                    disabled={working}
                    maxLength={500}
                  />
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">
                Confirm Refund Request
              </h3>

              <div className="space-y-3 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-700">Refund Amount:</span>
                  <span className="text-lg font-bold text-blue-600">
                    ${formatCurrency(refundAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-700">Reason:</span>
                  <span className="font-semibold text-gray-900">
                    {REASON_OPTIONS.find((option) => option.value === reasonCategory)?.label ??
                      reasonCategory}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-700">Refund Method:</span>
                  <span className="font-semibold text-gray-900">
                    {REFUND_METHOD_OPTIONS.find((method) => method.value === refundMethod)
                      ?.label ?? refundMethod}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Reason Details:</h4>
                <p className="rounded-lg bg-gray-50 p-3 text-gray-700">
                  {reason.trim()}
                </p>
              </div>

              {refundMethod === RefundMethod.BANK_TRANSFER && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900">Bank Details:</h4>
                  <p className="rounded-lg bg-gray-50 p-3 text-gray-700">
                    {bankDetails.trim()}
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="refund-notes"
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Additional Notes (Optional)
                </label>

                <textarea
                  id="refund-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Any additional information that might help us process your refund..."
                  className="input h-20 w-full resize-none"
                  disabled={working}
                  maxLength={1000}
                />
              </div>

              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Processing Time:</span> Refunds
                  are typically processed within 3-5 business days.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={step === 'amount' ? onClose : handlePrevious}
            disabled={working}
            className="btn-outline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {step === 'amount' ? 'Cancel' : 'Back'}
          </button>

          <div className="text-sm text-gray-600">
            Step {currentStepIndex + 1} of {STEPS.length}
          </div>

          <button
            type="button"
            onClick={step === 'confirm' ? handleSubmit : handleNext}
            disabled={working || refundableAmount <= 0}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {working
              ? 'Processing...'
              : step === 'confirm'
                ? 'Submit Refund Request'
                : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefundModal;

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ordersService from '@/services/orders.service';
import { Order, RefundMethod } from '@/types';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onRefundSubmitted?: () => void;
}

/**
 * Enhanced Refund Modal Component
 * Provides comprehensive refund request functionality with:
 * - Refund reason categories
 * - Refund method selection
 * - Bank transfer details
 * - Additional notes
 * - Progress tracking
 */
const RefundModal = ({ isOpen, onClose, order, onRefundSubmitted }: RefundModalProps) => {
  const [step, setStep] = useState<'amount' | 'reason' | 'method' | 'confirm'>(
    'amount'
  );
  const [working, setWorking] = useState(false);

  // Form state
  const [refundAmount, setRefundAmount] = useState(order.totalAmount.toString());
  const [reasonCategory, setReasonCategory] = useState('QUALITY_ISSUE');
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<RefundMethod>(RefundMethod.ORIGINAL_PAYMENT);
  const [bankDetails, setBankDetails] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form when order changes
  useEffect(() => {
    if (isOpen && order) {
      setStep('amount');
      setRefundAmount(order.totalAmount.toString());
      setReasonCategory('QUALITY_ISSUE');
      setReason('');
      setRefundMethod(RefundMethod.ORIGINAL_PAYMENT);
      setBankDetails('');
      setNotes('');
      setWorking(false);
    }
  }, [isOpen, order]);

  /**
   * Validate refund amount
   */
  const validateAmount = (): boolean => {
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return false;
    }
    if (amount > order.totalAmount) {
      toast.error(`Refund amount cannot exceed $${order.totalAmount.toFixed(2)}`);
      return false;
    }
    return true;
  };

  /**
   * Handle next step
   */
  const handleNext = () => {
    if (step === 'amount') {
      if (!validateAmount()) return;
      setStep('reason');
    } else if (step === 'reason') {
      if (!reason.trim()) {
        toast.error('Please provide a reason for the refund');
        return;
      }
      setStep('method');
    } else if (step === 'method') {
      if (refundMethod === 'BANK_TRANSFER' && !bankDetails.trim()) {
        toast.error('Please provide bank details');
        return;
      }
      setStep('confirm');
    }
  };

  /**
   * Handle previous step
   */
  const handlePrevious = () => {
    if (step === 'reason') setStep('amount');
    else if (step === 'method') setStep('reason');
    else if (step === 'confirm') setStep('method');
  };

  /**
   * Submit refund request
   */
  const handleSubmit = async () => {
    setWorking(true);
    try {
      await ordersService.requestRefund(
        order.id,
        parseFloat(refundAmount),
        reason,
        reasonCategory,
        refundMethod,
        refundMethod === 'BANK_TRANSFER' ? bankDetails : undefined,
        notes || undefined
      );

      toast.success('Refund request submitted successfully');
      onRefundSubmitted?.();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : error instanceof Error
          ? error.message
          : undefined;
      toast.error(message || 'Failed to submit refund request');
      console.error('Refund request error:', error);
    } finally {
      setWorking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <h2 className="text-2xl font-bold">Request Refund</h2>
              <p className="text-sm text-blue-100">Order: {order.orderNo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-600 rounded-full p-2 transition-colors"
            aria-label="Close refund modal"
          >
            ✕
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          {['amount', 'reason', 'method', 'confirm'].map((s, idx) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  ['amount', 'reason', 'method', 'confirm'].indexOf(step) >= idx
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {idx + 1}
              </div>
              {idx < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 transition-all ${
                    ['amount', 'reason', 'method', 'confirm'].indexOf(step) > idx
                      ? 'bg-blue-600'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 min-h-96">
          {step === 'amount' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Refund Amount</h3>
              <p className="text-gray-600">
                Order Total: <span className="font-bold text-lg">${order.totalAmount.toFixed(2)}</span>
              </p>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Refund Amount *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-gray-600">$</span>
                  <input
                    type="number"
                    id="refund-amount"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    max={order.totalAmount}
                    className="input flex-1"
                    disabled={working}
                    aria-label="Refund amount"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Note:</span> You can request a partial or full
                  refund. The maximum refund amount is ${order.totalAmount.toFixed(2)}.
                </p>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setRefundAmount(order.totalAmount.toString())}
                  className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-sm transition-colors"
                >
                  Full Refund
                </button>
                <button
                  onClick={() => setRefundAmount((order.totalAmount / 2).toFixed(2))}
                  className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-sm transition-colors"
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
                <label htmlFor="reason-category" className="block text-sm font-semibold text-gray-900 mb-2">
                  Reason Category *
                </label>
                <select
                  id="reason-category"
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="input w-full"
                  disabled={working}
                  aria-label="Reason category"
                >
                  <option value="QUALITY_ISSUE">Quality Issue</option>
                  <option value="CHANGED_MIND">Changed My Mind</option>
                  <option value="TECHNICAL_ISSUE">Technical Issue</option>
                  <option value="NOT_AS_DESCRIBED">Not As Described</option>
                  <option value="DUPLICATE_ORDER">Duplicate Order</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Detailed Reason *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please explain why you want to request a refund..."
                  className="input w-full h-32 resize-none"
                  disabled={working}
                />
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Tip:</span> Providing a detailed reason helps us
                  process your refund faster.
                </p>
              </div>
            </div>
          )}

          {step === 'method' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Refund Method</h3>

              <div className="space-y-3">
                {/* Original Payment */}
                <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-blue-500 transition-colors ${
                  refundMethod === 'ORIGINAL_PAYMENT' 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200'
                }`}
                >
                  <input
                    type="radio"
                    name="refundMethod"
                    value="ORIGINAL_PAYMENT"
                    checked={refundMethod === 'ORIGINAL_PAYMENT'}
                    onChange={(e) => setRefundMethod(e.target.value as RefundMethod)}
                    className="mt-1"
                    disabled={working}
                  />
                  <div>
                    <p className="font-semibold text-gray-900">Original Payment Method</p>
                    <p className="text-sm text-gray-600">
                      Refund will be credited back to your original payment method
                    </p>
                  </div>
                </label>

                {/* Wallet */}
                <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-blue-500 transition-colors ${
                  refundMethod === 'WALLET' 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200'
                }`}
                >
                  <input
                    type="radio"
                    name="refundMethod"
                    value="WALLET"
                    checked={refundMethod === 'WALLET'}
                    onChange={(e) => setRefundMethod(e.target.value as RefundMethod)}
                    className="mt-1"
                    disabled={working}
                  />
                  <div>
                    <p className="font-semibold text-gray-900">Platform Wallet</p>
                    <p className="text-sm text-gray-600">
                      Refund will be added to your platform wallet for future purchases
                    </p>
                  </div>
                </label>

                {/* Bank Transfer */}
                <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-blue-500 transition-colors ${
                  refundMethod === 'BANK_TRANSFER' 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200'
                }`}
                >
                  <input
                    type="radio"
                    name="refundMethod"
                    value="BANK_TRANSFER"
                    checked={refundMethod === 'BANK_TRANSFER'}
                    onChange={(e) => setRefundMethod(e.target.value as RefundMethod)}
                    className="mt-1"
                    disabled={working}
                  />
                  <div>
                    <p className="font-semibold text-gray-900">Bank Transfer</p>
                    <p className="text-sm text-gray-600">
                      Refund will be transferred directly to your bank account
                    </p>
                  </div>
                </label>
              </div>

              {/* Bank Details Input */}
              {refundMethod === 'BANK_TRANSFER' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Bank Account Details *
                  </label>
                  <textarea
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    placeholder="Please provide your bank account details (Account Number, Bank Name, Account Holder Name, etc.)"
                    className="input w-full h-24 resize-none"
                    disabled={working}
                  />
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Confirm Refund Request</h3>

              {/* Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Refund Amount:</span>
                  <span className="font-bold text-lg text-blue-600">
                    ${(isNaN(parseFloat(refundAmount)) ? 0 : parseFloat(refundAmount)).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Reason:</span>
                  <span className="font-semibold text-gray-900">{reasonCategory}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Refund Method:</span>
                  <span className="font-semibold text-gray-900">
                    {refundMethod === 'ORIGINAL_PAYMENT'
                      ? 'Original Payment'
                      : refundMethod === 'WALLET'
                        ? 'Platform Wallet'
                        : 'Bank Transfer'}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Reason Details:</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{reason}</p>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information that might help us process your refund..."
                  className="input w-full h-20 resize-none"
                  disabled={working}
                />
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">✓ Processing Time:</span> Refunds are typically
                  processed within 3-5 business days.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
          <button
            onClick={step === 'amount' ? onClose : handlePrevious}
            disabled={working}
            className="btn-outline"
          >
            {step === 'amount' ? 'Cancel' : 'Back'}
          </button>

          <div className="text-sm text-gray-600">
            Step {['amount', 'reason', 'method', 'confirm'].indexOf(step) + 1} of 4
          </div>

          <button
            onClick={step === 'confirm' ? handleSubmit : handleNext}
            disabled={working}
            className="btn-primary"
          >
            {working ? 'Processing...' : step === 'confirm' ? 'Submit Refund Request' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefundModal;


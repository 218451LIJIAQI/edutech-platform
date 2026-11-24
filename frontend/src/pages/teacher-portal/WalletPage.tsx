import { useEffect, useRef, useState } from 'react';
import clientLogger from '@/utils/logger';
import {
  Wallet as WalletIcon,
  DollarSign,
  ArrowDownToLine,
  ArrowUpRight,
  Settings,
  Plus,
  CheckCircle,
  XCircle,
  CreditCard,
  Building2,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import walletService from '@/services/wallet.service';
import {
  PayoutMethod,
  PayoutMethodType,
  PayoutRequest,
  PayoutRequestStatus,
  WalletSummary,
  WalletTransactionSource,
  WalletTransactionType,
} from '@/types';
import { useOverlayAccessibility, usePageTitle } from '@/hooks';
import toast from 'react-hot-toast';
import type {
  PayoutMethodDetails,
  WalletPayoutListResponse,
  WalletTransactionListResponse,
} from '@/services/wallet.service';
import { extractErrorMessage } from '@/utils/error-handler';
import { resolveWalletDisputeSummary } from '@/utils/enrollment';
import ConfirmationModal from '@/components/common/ConfirmationModal';

const currency = (v: number, ccy = 'USD') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy }).format(v || 0);
const emptyTransactions: WalletTransactionListResponse = {
  items: [],
  total: 0,
  limit: 20,
  offset: 0,
};
const emptyPayouts: WalletPayoutListResponse = {
  items: [],
  total: 0,
  limit: 20,
  offset: 0,
};

const typeOptions = Object.values(WalletTransactionType);
const sourceOptions = Object.values(WalletTransactionSource);
const emptyMethodDetails: PayoutMethodDetails = {};

const getTransactionAmountPresentation = (
  type: WalletTransactionType
): { amountPrefix: '+' | '-'; amountClassName: string } => {
  switch (type) {
    case WalletTransactionType.CREDIT:
    case WalletTransactionType.UNFREEZE:
    case WalletTransactionType.ADJUSTMENT:
      return {
        amountPrefix: '+',
        amountClassName: 'text-emerald-700',
      };
    case WalletTransactionType.DEBIT:
    case WalletTransactionType.FREEZE:
      return {
        amountPrefix: '-',
        amountClassName: 'text-red-600',
      };
    default:
      return {
        amountPrefix: '+',
        amountClassName: 'text-slate-700',
      };
  }
};

const getPayoutStatusBadgeClass = (status: PayoutRequestStatus) => {
  switch (status) {
    case PayoutRequestStatus.PAID:
      return 'badge-success';
    case PayoutRequestStatus.APPROVED:
    case PayoutRequestStatus.PROCESSING:
      return 'badge-info';
    case PayoutRequestStatus.REJECTED:
      return 'badge-danger';
    case PayoutRequestStatus.CANCELLED:
      return 'badge';
    default:
      return 'badge-warning';
  }
};

const getPayoutReviewText = (payout: PayoutRequest) => {
  if (payout.processedAt) {
    return `Updated ${new Date(payout.processedAt).toLocaleString()}`;
  }

  if (payout.status === 'APPROVED') {
    return 'Approved and waiting for transfer processing';
  }

  if (payout.status === 'PROCESSING') {
    return 'Transfer in progress';
  }

  if (payout.status === 'PENDING') {
    return 'Awaiting admin review';
  }

  return 'Status updated';
};

const WalletPage = () => {
  usePageTitle('Wallet & Payouts');
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [txns, setTxns] = useState<WalletTransactionListResponse>(emptyTransactions);
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [payouts, setPayouts] = useState<WalletPayoutListResponse>(emptyPayouts);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isTransactionsRefreshing, setIsTransactionsRefreshing] = useState(false);

  const [txnType, setTxnType] = useState<string>('');
  const [txnSource, setTxnSource] = useState<string>('');

  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);

  const [methodType, setMethodType] = useState<PayoutMethodType>(PayoutMethodType.BANK_TRANSFER);
  const [methodLabel, setMethodLabel] = useState('');
  const [methodDetails, setMethodDetails] = useState<PayoutMethodDetails>(emptyMethodDetails);
  const [methodIsDefault, setMethodIsDefault] = useState(false);

  const [payoutAmountInput, setPayoutAmountInput] = useState<string>('');
  const [payoutMethodId, setPayoutMethodId] = useState<string>('');
  const [payoutNote, setPayoutNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMethodActionLoading, setIsMethodActionLoading] = useState(false);
  const [methodPendingDelete, setMethodPendingDelete] = useState<PayoutMethod | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const methodModalRef = useRef<HTMLDivElement | null>(null);
  const methodLabelInputRef = useRef<HTMLInputElement | null>(null);
  const payoutModalRef = useRef<HTMLDivElement | null>(null);
  const payoutAmountInputRef = useRef<HTMLInputElement | null>(null);
  const hasLoadedWalletRef = useRef(false);

  const { reservedForRefunds, withdrawableBalance } =
    resolveWalletDisputeSummary(summary);
  const hasWithdrawableBalance = withdrawableBalance > 0;

  const updateMethodDetails = (field: string, value: string) => {
    setMethodDetails((details) => ({ ...details, [field]: value }));
  };

  const getMethodDetailValue = (field: string) => {
    const value = methodDetails[field];
    return typeof value === 'string' ? value : '';
  };

  const resetMethodForm = () => {
    setMethodType(PayoutMethodType.BANK_TRANSFER);
    setMethodLabel('');
    setMethodDetails(emptyMethodDetails);
    setMethodIsDefault(false);
  };

  const openMethodModal = () => {
    resetMethodForm();
    setMethodModalOpen(true);
  };

  const closeMethodModal = () => {
    if (isSubmitting) return;
    resetMethodForm();
    setMethodModalOpen(false);
  };

  const resetPayoutForm = () => {
    setPayoutAmountInput('');
    setPayoutMethodId('');
    setPayoutNote('');
  };

  const openPayoutModal = () => {
    resetPayoutForm();
    setPayoutModalOpen(true);
  };

  const closePayoutModal = () => {
    if (isSubmitting) return;
    resetPayoutForm();
    setPayoutModalOpen(false);
  };

  const validateMethodForm = () => {
    if (!methodLabel.trim()) {
      toast.error('Please provide a label');
      return false;
    }

    if (methodType === PayoutMethodType.BANK_TRANSFER) {
      if (!getMethodDetailValue('bankName').trim()) {
        toast.error('Please provide the bank name');
        return false;
      }
      if (!getMethodDetailValue('accountName').trim()) {
        toast.error('Please provide the account name');
        return false;
      }
      if (!getMethodDetailValue('accountNo').trim()) {
        toast.error('Please provide the account number');
        return false;
      }
      return true;
    }

    if (!getMethodDetailValue('walletId').trim()) {
      toast.error('Please provide the wallet ID or destination handle');
      return false;
    }

    return true;
  };

  useOverlayAccessibility({
    isOpen: methodModalOpen,
    containerRef: methodModalRef,
    initialFocusRef: methodLabelInputRef,
    onClose: closeMethodModal,
    trapFocus: true,
    lockBodyScroll: true,
  });

  useOverlayAccessibility({
    isOpen: payoutModalOpen,
    containerRef: payoutModalRef,
    initialFocusRef: payoutAmountInputRef,
    onClose: closePayoutModal,
    trapFocus: true,
    lockBodyScroll: true,
  });

  useEffect(() => {
    let isActive = true;

    const loadWalletData = async () => {
      const isInitialLoad = !hasLoadedWalletRef.current;
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setIsTransactionsRefreshing(true);
      }
      setLoadError(null);

      try {
        const [summaryData, transactionData, payoutMethods, payoutRequestData] =
          await Promise.all([
            walletService.getMySummary(),
            walletService.getMyTransactions({
              limit: 20,
              type: txnType ? (txnType as WalletTransactionType) : undefined,
              source: txnSource ? (txnSource as WalletTransactionSource) : undefined,
            }),
            walletService.listPayoutMethods(),
            walletService.listMyPayouts({ limit: 20 }),
          ]);

        if (!isActive) {
          return;
        }

        setSummary(summaryData);
        setTxns(transactionData);
        setMethods(payoutMethods);
        setPayouts(payoutRequestData);
      } catch (error) {
        if (isActive) {
          clientLogger.error('Failed to load wallet:', error);
          const message = extractErrorMessage(error, 'Failed to load wallet');
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (isActive) {
          hasLoadedWalletRef.current = true;
          if (isInitialLoad) {
            setLoading(false);
          }
          setIsTransactionsRefreshing(false);
        }
      }
    };

    void loadWalletData();

    return () => {
      isActive = false;
    };
  }, [reloadKey, txnType, txnSource]);

  const submitPayout = async () => {
    if (!summary) return;
    if (methods.length === 0) {
      toast.error('Add a payout method before requesting a payout');
      return;
    }

    const parsedAmount = Number(payoutAmountInput);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Enter a valid payout amount greater than $0.00');
      return;
    }
    const roundedAmount = Math.round(parsedAmount * 100) / 100;

    if (roundedAmount > withdrawableBalance) {
      if (reservedForRefunds > 0) {
        toast.error(
          `Amount exceeds withdrawable balance (${currency(
            withdrawableBalance,
            summary.currency
          )} available after ${currency(
            reservedForRefunds,
            summary.currency
          )} refund dispute hold)`
        );
      } else {
        toast.error('Amount exceeds withdrawable balance');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await walletService.requestPayout({
        amount: roundedAmount,
        methodId: payoutMethodId || undefined,
        note: payoutNote.trim() || undefined,
      });
      toast.success('Payout request submitted');
      resetPayoutForm();
      setPayoutModalOpen(false);
      setReloadKey((currentKey) => currentKey + 1);
    } catch (error: unknown) {
      clientLogger.error('Failed to request payout:', error);
      toast.error(extractErrorMessage(error, 'Failed to request payout'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMethod = async () => {
    if (isSubmitting || !validateMethodForm()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await walletService.addPayoutMethod({
        type: methodType,
        label: methodLabel,
        details: methodDetails,
        isDefault: methodIsDefault,
      });
      toast.success('Payout method added');
      resetMethodForm();
      setMethodModalOpen(false);
      setReloadKey((currentKey) => currentKey + 1);
    } catch (error: unknown) {
      clientLogger.error('Failed to add payout method:', error);
      toast.error(extractErrorMessage(error, 'Failed to add method'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const setDefaultMethod = async (method: PayoutMethod) => {
    if (method.isDefault) {
      return;
    }
    setIsMethodActionLoading(true);
    try {
      await walletService.updatePayoutMethod(method.id, { isDefault: true });
      toast.success('Default payout method updated');
      setReloadKey((currentKey) => currentKey + 1);
    } catch (error: unknown) {
      clientLogger.error('Failed to update default payout method:', error);
      toast.error(extractErrorMessage(error, 'Failed to update default payout method'));
    } finally {
      setIsMethodActionLoading(false);
    }
  };

  const deleteMethod = async () => {
    if (!methodPendingDelete) {
      return;
    }
    setIsMethodActionLoading(true);
    try {
      await walletService.deletePayoutMethod(methodPendingDelete.id);
      toast.success('Payout method deleted');
      setMethodPendingDelete(null);
      setReloadKey((currentKey) => currentKey + 1);
    } catch (error: unknown) {
      clientLogger.error('Failed to delete payout method:', error);
      toast.error(extractErrorMessage(error, 'Failed to delete payout method'));
    } finally {
      setIsMethodActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 animate-pulse flex items-center justify-center">
            <WalletIcon className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-600 font-medium">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <WalletIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">
                Teacher{' '}
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Wallet &amp; Payouts
                </span>
              </h1>
              <p className="text-slate-600 font-medium">
                Track net course earnings, refund dispute holds, and payout transfers
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={openPayoutModal}
              disabled={methods.length === 0 || !hasWithdrawableBalance}
            >
              <ArrowUpRight className="w-4 h-4" /> Request Payout
            </button>
            <button type="button" className="btn-outline" onClick={openMethodModal}>
              <Plus className="w-4 h-4" /> Add Payout Method
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between gap-4">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="btn-outline btn-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="card bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">
                Withdrawable Now
              </span>
              <div className="p-2 bg-white/15 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold tabular-nums">
              {currency(withdrawableBalance, summary?.currency)}
            </div>
            <p className="mt-2 text-xs text-emerald-100 tabular-nums">
              Ledger balance: {currency(summary?.availableBalance || 0, summary?.currency)}
            </p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-600 text-xs font-bold uppercase tracking-wider">
                Reserved for Refunds
              </span>
              <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 tabular-nums">
              {currency(reservedForRefunds, summary?.currency)}
            </div>
            <p className="mt-2 text-xs text-slate-600">
              {reservedForRefunds > 0
                ? 'Temporarily frozen while student refund disputes are reviewed'
                : 'No active refund disputes holding your balance'}
            </p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-600 text-xs font-bold uppercase tracking-wider">
                Pending Payout
              </span>
              <div className="p-2 bg-sky-50 text-sky-700 rounded-xl">
                <ArrowDownToLine className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 tabular-nums">
              {currency(summary?.pendingPayout || 0, summary?.currency)}
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Awaiting admin approval or bank settlement
            </p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-600 text-xs font-bold uppercase tracking-wider">
                Payout Methods
              </span>
              <div className="p-2 bg-primary-50 text-primary-700 rounded-xl">
                <Settings className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 tabular-nums">
              {methods.length}
            </div>
            <p className="mt-2 text-xs text-slate-600">
              {methods.find((m) => m.isDefault)?.label
                ? `Default: ${methods.find((m) => m.isDefault)?.label}`
                : 'Add a destination account to withdraw'}
            </p>
          </div>
        </div>

        {methods.length === 0 ? (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Add at least one payout method before requesting withdrawals.
          </div>
        ) : !hasWithdrawableBalance ? (
          <div className="mb-8 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            {reservedForRefunds > 0
              ? `Your available ledger balance has ${currency(
                  reservedForRefunds,
                  summary?.currency
                )} reserved for active refund requests. Funds unlock automatically once disputes resolve.`
              : 'Withdrawable balance must be greater than $0.00 before requesting a payout.'}
          </div>
        ) : null}

        {/* Methods & Payouts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="card lg:col-span-1">
            <h2 className="text-lg font-bold mb-4 text-slate-900">Payout Methods</h2>
            {methods.length === 0 ? (
              <div className="text-sm text-slate-600 py-4">
                No payout methods saved yet. Click &ldquo;Add Payout Method&rdquo; above to add a bank account or e-wallet.
              </div>
            ) : (
              <div className="space-y-3">
                {methods.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{m.label}</div>
                        <div className="text-xs text-slate-600 mt-1.5 flex flex-wrap items-center gap-1.5">
                          {m.type === PayoutMethodType.BANK_TRANSFER ? (
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> Bank Transfer
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <CreditCard className="w-3 h-3" /> {m.type}
                            </span>
                          )}
                          {m.isDefault ? <span className="badge-success">Default</span> : null}
                          {m.isVerified ? (
                            <span className="badge-success">
                              <CheckCircle className="w-3 h-3" /> Verified
                            </span>
                          ) : (
                            <span className="badge-warning">
                              <XCircle className="w-3 h-3" /> Unverified
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!m.isDefault && (
                          <button
                            type="button"
                            className="btn-outline btn-sm"
                            onClick={() => void setDefaultMethod(m)}
                            disabled={isMethodActionLoading}
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setMethodPendingDelete(m)}
                          disabled={isMethodActionLoading}
                          aria-label={`Delete payout method ${m.label}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Payout Requests */}
          <div className="card lg:col-span-2">
            <h2 className="text-lg font-bold mb-4 text-slate-900">Payout Requests</h2>
            {payouts.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Requested</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-600">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Review</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payouts.items.map((p: PayoutRequest) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap tabular-nums">
                          {new Date(p.requestedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 text-right whitespace-nowrap tabular-nums">
                          {currency(p.amount, summary?.currency)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={getPayoutStatusBadgeClass(p.status)}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          <div>{getPayoutReviewText(p)}</div>
                          {p.adminNote ? (
                            <div className="mt-1 text-xs text-slate-500 break-words">
                              Note: {p.adminNote}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 font-mono">
                          {p.externalReference || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-slate-600 py-6 text-center">
                No payout requests submitted yet.
              </div>
            )}
          </div>
        </div>

        {/* Transactions */}
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-bold text-slate-900">Wallet Ledger Transactions</h2>
            <div className="flex flex-wrap items-center gap-2">
              {isTransactionsRefreshing ? (
                <span className="text-xs font-medium text-slate-500">Refreshing...</span>
              ) : null}
              <select
                value={txnType}
                onChange={(e) => setTxnType(e.target.value)}
                className="input py-2 w-40"
                aria-label="Filter by transaction type"
              >
                <option value="">All Types</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={txnSource}
                onChange={(e) => setTxnSource(e.target.value)}
                className="input py-2 w-44"
                aria-label="Filter by source"
              >
                <option value="">All Sources</option>
                {sourceOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {(txnType || txnSource) && (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    setTxnType('');
                    setTxnSource('');
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {txns.items.length === 0 ? (
            <div className="text-sm text-slate-600 py-8 text-center">
              {txnType || txnSource
                ? 'No ledger transactions match the selected filters.'
                : 'No wallet ledger transactions recorded yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600">Source</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-600">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {txns.items.map((i) => {
                    const presentation = getTransactionAmountPresentation(i.type);
                    return (
                      <tr key={i.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-600 tabular-nums">
                          {new Date(i.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{i.type}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{i.source}</td>
                        <td
                          className={`px-4 py-3 font-bold text-right tabular-nums ${presentation.amountClassName}`}
                        >
                          {presentation.amountPrefix}
                          {currency(i.amount, summary?.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Method Modal */}
      {methodModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/55 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeMethodModal();
            }
          }}
        >
          <div
            ref={methodModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-method-modal-title"
            aria-describedby="wallet-method-modal-description"
            className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="wallet-method-modal-title" className="text-xl font-bold text-slate-900">
                Add Payout Method
              </h3>
              <button type="button" className="btn-secondary btn-sm" onClick={closeMethodModal}>
                Close
              </button>
            </div>

            <div className="space-y-4">
              <p id="wallet-method-modal-description" className="sr-only">
                Add a payout destination for future wallet withdrawals.
              </p>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type</label>
                <select
                  value={methodType}
                  onChange={(e) => setMethodType(e.target.value as PayoutMethodType)}
                  className="input"
                  aria-label="Payout method type"
                >
                  {Object.values(PayoutMethodType).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Label</label>
                <input
                  ref={methodLabelInputRef}
                  className="input"
                  value={methodLabel}
                  onChange={(e) => setMethodLabel(e.target.value)}
                  placeholder="e.g. Primary Maybank Account, GrabPay Wallet"
                />
              </div>

              {methodType === PayoutMethodType.BANK_TRANSFER ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    className="input"
                    value={getMethodDetailValue('bankName')}
                    placeholder="Bank name"
                    onChange={(e) => updateMethodDetails('bankName', e.target.value)}
                  />
                  <input
                    className="input"
                    value={getMethodDetailValue('accountName')}
                    placeholder="Account holder name"
                    onChange={(e) => updateMethodDetails('accountName', e.target.value)}
                  />
                  <input
                    className="input md:col-span-2"
                    value={getMethodDetailValue('accountNo')}
                    placeholder="Account number"
                    onChange={(e) => updateMethodDetails('accountNo', e.target.value)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    className="input"
                    value={getMethodDetailValue('walletId')}
                    placeholder="Wallet ID or destination handle"
                    onChange={(e) => updateMethodDetails('walletId', e.target.value)}
                  />
                  <input
                    className="input"
                    value={getMethodDetailValue('holder')}
                    placeholder="Holder name (optional)"
                    onChange={(e) => updateMethodDetails('holder', e.target.value)}
                  />
                </div>
              )}

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={methodIsDefault}
                  onChange={(e) => setMethodIsDefault(e.target.checked)}
                />
                Set as default payout method
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={closeMethodModal}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void addMethod()}
                  disabled={isSubmitting}
                >
                  <Plus className="w-4 h-4" /> {isSubmitting ? 'Saving...' : 'Add Method'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout Modal */}
      {payoutModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/55 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePayoutModal();
            }
          }}
        >
          <div
            ref={payoutModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-payout-modal-title"
            aria-describedby="wallet-payout-modal-description"
            className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="wallet-payout-modal-title" className="text-xl font-bold text-slate-900">
                Request Payout
              </h3>
              <button type="button" className="btn-secondary btn-sm" onClick={closePayoutModal}>
                Close
              </button>
            </div>

            <div className="space-y-4">
              <p id="wallet-payout-modal-description" className="sr-only">
                Request a payout within your withdrawable balance after any active refund holds.
              </p>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="payout-amount-input" className="text-sm font-semibold text-slate-700">
                    Withdrawal Amount ({summary?.currency || 'USD'})
                  </label>
                  <button
                    type="button"
                    onClick={() => setPayoutAmountInput(withdrawableBalance.toFixed(2))}
                    className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                  >
                    Max Withdrawable ({currency(withdrawableBalance, summary?.currency)})
                  </button>
                </div>
                <input
                  id="payout-amount-input"
                  ref={payoutAmountInputRef}
                  type="number"
                  min={0.01}
                  step="0.01"
                  max={withdrawableBalance}
                  value={payoutAmountInput}
                  onChange={(e) => setPayoutAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="input tabular-nums"
                  aria-label="Payout amount"
                />
                <p className="text-xs text-slate-600 mt-1.5 tabular-nums">
                  Withdrawable now: <strong>{currency(withdrawableBalance, summary?.currency)}</strong>
                  {reservedForRefunds > 0
                    ? ` (${currency(reservedForRefunds, summary?.currency)} held for active refund requests)`
                    : ''}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Payout Method
                </label>
                <select
                  value={payoutMethodId}
                  onChange={(e) => setPayoutMethodId(e.target.value)}
                  className="input"
                  aria-label="Select payout method"
                >
                  <option value="">Use current default method</option>
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} ({m.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Note (optional)
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Optional note for the finance settlement team"
                  value={payoutNote}
                  onChange={(e) => setPayoutNote(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={closePayoutModal}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void submitPayout()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(methodPendingDelete)}
        title="Delete payout method"
        description="Remove this payout method from your wallet settings."
        details={
          methodPendingDelete
            ? [
                `Label: ${methodPendingDelete.label}`,
                `Type: ${methodPendingDelete.type}`,
                methodPendingDelete.isDefault
                  ? 'This is currently the default payout method and another method will be promoted if available.'
                  : 'Existing active payout requests may block deletion.',
              ]
            : []
        }
        confirmLabel="Delete Method"
        tone="danger"
        isLoading={isMethodActionLoading}
        onClose={() => {
          if (!isMethodActionLoading) {
            setMethodPendingDelete(null);
          }
        }}
        onConfirm={deleteMethod}
      />
    </div>
  );
};

export default WalletPage;

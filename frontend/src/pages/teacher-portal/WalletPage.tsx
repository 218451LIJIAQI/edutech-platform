import { useEffect, useRef, useState } from 'react';
import clientLogger from '@/utils/logger';
import { Wallet as WalletIcon, DollarSign, ArrowDownToLine, ArrowUpRight, Settings, Plus, CheckCircle, XCircle, CreditCard, Building2, Trash2 } from 'lucide-react';
import walletService from '@/services/wallet.service';
import { PayoutMethod, PayoutMethodType, PayoutRequest, WalletSummary, WalletTransactionSource, WalletTransactionType } from '@/types';
import { useOverlayAccessibility, usePageTitle } from '@/hooks';
import toast from 'react-hot-toast';
import type { PayoutMethodDetails, WalletPayoutListResponse, WalletTransactionListResponse } from '@/services/wallet.service';
import { extractErrorMessage } from '@/utils/error-handler';
import ConfirmationModal from '@/components/common/ConfirmationModal';

const currency = (v: number, ccy = 'USD') => new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy }).format(v || 0);
const emptyTransactions: WalletTransactionListResponse = { items: [], total: 0, limit: 20, offset: 0 };
const emptyPayouts: WalletPayoutListResponse = { items: [], total: 0, limit: 20, offset: 0 };

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
        amountClassName: 'text-green-600',
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
        amountClassName: 'text-gray-700',
      };
  }
};

const getPayoutReviewText = (payout: PayoutRequest) => {
  if (payout.processedAt) {
    return `Updated ${new Date(payout.processedAt).toLocaleString()}`;
  }

  if (payout.status === 'APPROVED') {
    return 'Approved and waiting for transfer processing';
  }

  if (payout.status === 'PENDING') {
    return 'Awaiting admin review';
  }

  return 'Status updated';
};

const WalletPage = () => {
  usePageTitle('Wallet');
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [txns, setTxns] = useState<WalletTransactionListResponse>(emptyTransactions);
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [payouts, setPayouts] = useState<WalletPayoutListResponse>(emptyPayouts);
  const [loading, setLoading] = useState(true);
  const [isTransactionsRefreshing, setIsTransactionsRefreshing] = useState(false);

  // Filters
  const [txnType, setTxnType] = useState<string>('');
  const [txnSource, setTxnSource] = useState<string>('');

  // Modals
  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);

  // New method form
  const [methodType, setMethodType] = useState<PayoutMethodType>(PayoutMethodType.BANK_TRANSFER);
  const [methodLabel, setMethodLabel] = useState('');
  const [methodDetails, setMethodDetails] = useState<PayoutMethodDetails>(emptyMethodDetails);
  const [methodIsDefault, setMethodIsDefault] = useState(false);

  // Payout form
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
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
  const hasAvailableBalance = (summary?.availableBalance || 0) > 0;

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
    resetMethodForm();
    setMethodModalOpen(false);
  };

  const resetPayoutForm = () => {
    setPayoutAmount(0);
    setPayoutMethodId('');
    setPayoutNote('');
  };

  const openPayoutModal = () => {
    resetPayoutForm();
    setPayoutModalOpen(true);
  };

  const closePayoutModal = () => {
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
      try {
        const [summaryData, transactionData, payoutMethods, payoutRequestData] = await Promise.all([
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
          toast.error(extractErrorMessage(error, 'Failed to load wallet'));
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
    if (methods.length === 0) { toast.error('Add a payout method before requesting a payout'); return; }
    if (payoutAmount <= 0) { toast.error('Enter a valid amount'); return; }
    if (payoutAmount > summary.availableBalance) { toast.error('Amount exceeds available balance'); return; }
    setIsSubmitting(true);
    try {
      await walletService.requestPayout({ amount: payoutAmount, methodId: payoutMethodId || undefined, note: payoutNote || undefined });
      toast.success('Payout requested');
      closePayoutModal();
      setReloadKey((currentKey) => currentKey + 1);
    } catch (error: unknown) {
      clientLogger.error('Failed to request payout:', error);
      toast.error(extractErrorMessage(error, 'Failed to request payout'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMethod = async () => {
    if (!validateMethodForm()) {
      return;
    }
    try {
      await walletService.addPayoutMethod({ type: methodType, label: methodLabel, details: methodDetails, isDefault: methodIsDefault });
      toast.success('Payout method added');
      closeMethodModal();
      setReloadKey((currentKey) => currentKey + 1);
    } catch (error: unknown) {
      clientLogger.error('Failed to add payout method:', error);
      toast.error(extractErrorMessage(error, 'Failed to add method'));
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
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 animate-pulse flex items-center justify-center">
              <WalletIcon className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-green-500/20 animate-ping"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Header */}
        <div className="mb-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
            <WalletIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Teacher <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Wallet</span>
            </h1>
            <p className="text-gray-500 font-medium">Manage your earnings, payouts and withdrawals</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 rounded-xl"><DollarSign className="w-6 h-6" /></div>
            </div>
            <p className="text-green-100 text-sm font-bold uppercase mb-2">Available Balance</p>
            <div className="text-4xl font-bold">{currency(summary?.availableBalance || 0, summary?.currency)}</div>
          </div>

          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 rounded-xl"><ArrowDownToLine className="w-6 h-6" /></div>
            </div>
            <p className="text-blue-100 text-sm font-bold uppercase mb-2">Pending Payout</p>
            <div className="text-4xl font-bold">{currency(summary?.pendingPayout || 0, summary?.currency)}</div>
          </div>

          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 rounded-xl"><Settings className="w-6 h-6" /></div>
            </div>
            <p className="text-purple-100 text-sm font-bold uppercase mb-2">Payout Methods</p>
            <div className="text-4xl font-bold">{methods.length}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={openPayoutModal}
            disabled={methods.length === 0 || !hasAvailableBalance}
          >
            <ArrowUpRight className="w-5 h-5" /> Request Payout
          </button>
          <button type="button" className="btn-outline flex items-center gap-2" onClick={openMethodModal}>
            <Plus className="w-5 h-5" /> Add Payout Method
          </button>
        </div>

        {methods.length === 0 ? (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Add a payout method before requesting withdrawals.
          </div>
        ) : !hasAvailableBalance ? (
          <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Available balance must be greater than zero before you can request a payout.
          </div>
        ) : null}

        {/* Methods & Payouts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Methods */}
          <div className="card lg:col-span-1 shadow-xl border border-gray-100 rounded-2xl">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Payout Methods</h2>
            {methods.length === 0 ? (
              <div className="text-gray-600">No payout methods yet</div>
            ) : (
              <div className="space-y-3">
                {methods.map(m => (
                  <div key={m.id} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-bold text-gray-900">{m.label}</div>
                        <div className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                          {m.type === PayoutMethodType.BANK_TRANSFER && (<span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" /> Bank</span>)}
                          {m.type !== PayoutMethodType.BANK_TRANSFER && (<span className="inline-flex items-center gap-1"><CreditCard className="w-3 h-3" /> {m.type}</span>)}
                          {m.isDefault ? (<span className="badge-success">Default</span>) : null}
                          {m.isVerified ? (
                            <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-[11px]"><CheckCircle className="w-3 h-3" /> Verified</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full text-[11px]"><XCircle className="w-3 h-3" /> Unverified</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-outline btn-sm"
                          onClick={() => void setDefaultMethod(m)}
                          disabled={m.isDefault || isMethodActionLoading}
                        >
                          {m.isDefault ? 'Default' : 'Set Default'}
                        </button>
                        <button
                          type="button"
                          className="btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setMethodPendingDelete(m)}
                          disabled={isMethodActionLoading}
                          aria-label={`Delete payout method ${m.label}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Payout Requests */}
          <div className="card lg:col-span-2 shadow-xl border border-gray-100 rounded-2xl">
            <h2 className="text-xl font-bold mb-4 text-gray-900">My Payout Requests</h2>
            {payouts.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left">Requested</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Review</th>
                      <th className="px-4 py-3 text-left">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payouts.items.map((p: PayoutRequest) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(p.requestedAt).toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">{currency(p.amount, summary?.currency)}</td>
                        <td className="px-4 py-3">
                          <span className="badge">
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div>{getPayoutReviewText(p)}</div>
                          {p.adminNote ? (
                            <div className="mt-1 text-xs text-gray-500 break-words">{p.adminNote}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{p.externalReference || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-gray-600">No payout requests found</div>
            )}
          </div>
        </div>

        {/* Transactions */}
        <div className="card shadow-xl border border-gray-100 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Transactions</h2>
            <div className="flex items-center gap-2">
              {isTransactionsRefreshing ? (
                <span className="text-xs font-medium text-gray-500">Refreshing...</span>
              ) : null}
              <select value={txnType} onChange={(e) => setTxnType(e.target.value)} className="input py-2" aria-label="Filter by transaction type">
                <option value="">All Types</option>
                {typeOptions.map(t => (<option key={t} value={t}>{t}</option>))}
              </select>
              <select value={txnSource} onChange={(e) => setTxnSource(e.target.value)} className="input py-2" aria-label="Filter by source">
                <option value="">All Sources</option>
                {sourceOptions.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
          </div>

          {txns.items.length === 0 ? (
            <div className="text-gray-600">
              {txnType || txnSource ? 'No transactions match the current filters' : 'No transactions yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Source</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {txns.items.map(i => (
                    <tr key={i.id}>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(i.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{i.type}</td>
                      <td className="px-4 py-3 text-sm">{i.source}</td>
                      <td className={`px-4 py-3 font-bold text-right ${getTransactionAmountPresentation(i.type).amountClassName}`}>
                        {getTransactionAmountPresentation(i.type).amountPrefix}{currency(i.amount, summary?.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Method Modal */}
      {methodModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            ref={methodModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-method-modal-title"
            aria-describedby="wallet-method-modal-description"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="wallet-method-modal-title" className="text-xl font-bold text-gray-900">Add Payout Method</h3>
              <button type="button" className="btn-outline btn-sm" onClick={closeMethodModal}>Close</button>
            </div>

            <div className="space-y-4">
              <p id="wallet-method-modal-description" className="sr-only">
                Add a payout destination for future wallet withdrawals.
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                <select value={methodType} onChange={(e) => setMethodType(e.target.value as PayoutMethodType)} className="input" aria-label="Payout method type">
                  {Object.values(PayoutMethodType).map(t => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Label</label>
                <input ref={methodLabelInputRef} className="input" value={methodLabel} onChange={(e) => setMethodLabel(e.target.value)} placeholder="e.g. Primary Bank Account, GrabPay Wallet" />
              </div>

              {/* Simple dynamic detail fields */}
              {methodType === PayoutMethodType.BANK_TRANSFER ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="input" value={getMethodDetailValue('bankName')} placeholder="Bank name" onChange={(e) => updateMethodDetails('bankName', e.target.value)} />
                  <input className="input" value={getMethodDetailValue('accountName')} placeholder="Account holder name" onChange={(e) => updateMethodDetails('accountName', e.target.value)} />
                  <input className="input md:col-span-2" value={getMethodDetailValue('accountNo')} placeholder="Account number" onChange={(e) => updateMethodDetails('accountNo', e.target.value)} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="input" value={getMethodDetailValue('walletId')} placeholder="Wallet ID or destination handle" onChange={(e) => updateMethodDetails('walletId', e.target.value)} />
                  <input className="input" value={getMethodDetailValue('holder')} placeholder="Holder name (optional)" onChange={(e) => updateMethodDetails('holder', e.target.value)} />
                </div>
              )}

              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={methodIsDefault} onChange={(e) => setMethodIsDefault(e.target.checked)} /> Set as default
              </label>

              <div className="flex items-center justify-end gap-3">
                <button type="button" className="btn-outline" onClick={closeMethodModal}>Cancel</button>
                <button type="button" className="btn-primary" onClick={addMethod}><Plus className="w-4 h-4 mr-1" /> Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout Modal */}
      {payoutModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            ref={payoutModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-payout-modal-title"
            aria-describedby="wallet-payout-modal-description"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="wallet-payout-modal-title" className="text-xl font-bold text-gray-900">Request Payout</h3>
              <button type="button" className="btn-outline btn-sm" onClick={closePayoutModal}>Close</button>
            </div>

            <div className="space-y-4">
              <p id="wallet-payout-modal-description" className="sr-only">
                Request a payout by choosing an amount, payout method, and optional note.
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
                <input ref={payoutAmountInputRef} type="number" min={0} max={summary?.availableBalance || 0} value={payoutAmount}
                       onChange={(e) => setPayoutAmount(Number(e.target.value))} className="input" aria-label="Payout amount" />
                <p className="text-xs text-gray-500 mt-1">Available: {currency(summary?.availableBalance || 0, summary?.currency)}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payout Method</label>
                <select value={payoutMethodId} onChange={(e) => setPayoutMethodId(e.target.value)} className="input" aria-label="Select payout method">
                  <option value="">Use current default method</option>
                  {methods.map(m => (<option key={m.id} value={m.id}>{m.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Note (optional)</label>
                <textarea className="input" rows={3} placeholder="Optional note for the payout review team" value={payoutNote} onChange={(e) => setPayoutNote(e.target.value)} />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button type="button" className="btn-outline" onClick={closePayoutModal}>Cancel</button>
                <button type="button" className="btn-primary" onClick={submitPayout} disabled={isSubmitting}>
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
        details={methodPendingDelete ? [
          `Label: ${methodPendingDelete.label}`,
          `Type: ${methodPendingDelete.type}`,
          methodPendingDelete.isDefault
            ? 'This is currently the default payout method and another method will be promoted if available.'
            : 'Existing active payout requests may block deletion.',
        ] : []}
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

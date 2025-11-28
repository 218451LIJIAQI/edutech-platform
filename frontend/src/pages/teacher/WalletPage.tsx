import { useEffect, useMemo, useState } from 'react';
import { Wallet as WalletIcon, DollarSign, ArrowDownToLine, ArrowUpRight, Settings, Plus, CheckCircle, XCircle, CreditCard, Building2 } from 'lucide-react';
import walletService from '@/services/wallet.service';
import { PayoutMethod, PayoutMethodType, PayoutRequest, PayoutRequestStatus, WalletSummary, WalletTransaction, WalletTransactionSource, WalletTransactionType } from '@/types';
import toast from 'react-hot-toast';

const currency = (v: number, ccy = 'USD') => new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy }).format(v || 0);

const typeOptions = Object.values(WalletTransactionType);
const sourceOptions = Object.values(WalletTransactionSource);

const WalletPage = () => {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [txns, setTxns] = useState<{ items?: WalletTransaction[]; pagination?: any }>({});
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [payouts, setPayouts] = useState<{ items?: PayoutRequest[]; pagination?: any }>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [txnType, setTxnType] = useState<string>('');
  const [txnSource, setTxnSource] = useState<string>('');

  // Modals
  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);

  // New method form
  const [methodType, setMethodType] = useState<PayoutMethodType>(PayoutMethodType.BANK_TRANSFER);
  const [methodLabel, setMethodLabel] = useState('');
  const [methodDetails, setMethodDetails] = useState<any>({});
  const [methodIsDefault, setMethodIsDefault] = useState(false);

  // Payout form
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutMethodId, setPayoutMethodId] = useState<string>('');
  const [payoutNote, setPayoutNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, t, m, pr] = await Promise.all([
        walletService.getMySummary(),
        walletService.getMyTransactions({ limit: 20 }),
        walletService.listPayoutMethods(),
        walletService.listMyPayouts({ limit: 20 }),
      ]);
      setSummary(s);
      setTxns({ items: t.items, pagination: t });
      setMethods(m);
      setPayouts({ items: pr.items, pagination: pr });
    } catch (e) {
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const filteredTxns = useMemo(() => {
    let items = txns.items || [];
    if (txnType) items = items.filter(i => i.type === txnType);
    if (txnSource) items = items.filter(i => i.source === txnSource);
    return items;
  }, [txns.items, txnType, txnSource]);

  const submitPayout = async () => {
    if (!summary) return;
    if (payoutAmount <= 0) { toast.error('Enter a valid amount'); return; }
    if (payoutAmount > summary.availableBalance) { toast.error('Amount exceeds available balance'); return; }
    setIsSubmitting(true);
    try {
      await walletService.requestPayout({ amount: payoutAmount, methodId: payoutMethodId || undefined, note: payoutNote || undefined });
      toast.success('Payout requested');
      setPayoutModalOpen(false);
      setPayoutAmount(0);
      setPayoutMethodId('');
      setPayoutNote('');
      await loadAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to request payout');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMethod = async () => {
    if (!methodLabel.trim()) { toast.error('Please provide a label'); return; }
    try {
      await walletService.addPayoutMethod({ type: methodType, label: methodLabel, details: methodDetails, isDefault: methodIsDefault });
      toast.success('Payout method added');
      setMethodModalOpen(false);
      setMethodLabel(''); setMethodDetails({}); setMethodIsDefault(false);
      await loadAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to add method');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="section-title mb-2 flex items-center gap-3">
            <WalletIcon className="w-8 h-8 text-primary-600" /> Teacher Wallet
          </h1>
          <p className="section-subtitle">Manage your course earnings, payout methods, and withdrawals</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 rounded-xl"><DollarSign className="w-6 h-6" /></div>
            </div>
            <p className="text-green-100 text-sm font-bold uppercase tracking-wide mb-2">Available Balance</p>
            <div className="text-4xl font-bold">{currency(summary?.availableBalance || 0, summary?.currency)}</div>
          </div>

          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 rounded-xl"><ArrowDownToLine className="w-6 h-6" /></div>
            </div>
            <p className="text-blue-100 text-sm font-bold uppercase tracking-wide mb-2">Pending Payout</p>
            <div className="text-4xl font-bold">{currency(summary?.pendingPayout || 0, summary?.currency)}</div>
          </div>

          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white/20 rounded-xl"><Settings className="w-6 h-6" /></div>
            </div>
            <p className="text-purple-100 text-sm font-bold uppercase tracking-wide mb-2">Payout Methods</p>
            <div className="text-4xl font-bold">{methods.length}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button className="btn-primary flex items-center gap-2" onClick={() => setPayoutModalOpen(true)}>
            <ArrowUpRight className="w-5 h-5" /> Request Payout
          </button>
          <button className="btn-outline flex items-center gap-2" onClick={() => setMethodModalOpen(true)}>
            <Plus className="w-5 h-5" /> Add Payout Method
          </button>
        </div>

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
                    <div className="flex items-center justify-between">
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Payout Requests */}
          <div className="card lg:col-span-2 shadow-xl border border-gray-100 rounded-2xl">
            <h2 className="text-xl font-bold mb-4 text-gray-900">My Payout Requests</h2>
            {payouts.items && payouts.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left">Requested</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payouts.items!.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(p.requestedAt).toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">{currency(p.amount, summary?.currency)}</td>
                        <td className="px-4 py-3">
                          <span className="badge">
                            {p.status}
                          </span>
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
              <select value={txnType} onChange={(e) => setTxnType(e.target.value)} className="input py-2">
                <option value="">All Types</option>
                {typeOptions.map(t => (<option key={t} value={t}>{t}</option>))}
              </select>
              <select value={txnSource} onChange={(e) => setTxnSource(e.target.value)} className="input py-2">
                <option value="">All Sources</option>
                {sourceOptions.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
          </div>

          {filteredTxns.length === 0 ? (
            <div className="text-gray-600">No transactions yet</div>
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
                  {filteredTxns.map(i => (
                    <tr key={i.id}>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(i.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{i.type}</td>
                      <td className="px-4 py-3 text-sm">{i.source}</td>
                      <td className={`px-4 py-3 font-bold text-right ${i.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>
                        {i.type === 'DEBIT' ? '-' : '+'}{currency(i.amount, summary?.currency)}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add Payout Method</h3>
              <button className="btn-outline btn-sm" onClick={() => setMethodModalOpen(false)}>Close</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                <select value={methodType} onChange={e=>setMethodType(e.target.value as any)} className="input">
                  {Object.values(PayoutMethodType).map(t => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Label</label>
                <input className="input" value={methodLabel} onChange={e=>setMethodLabel(e.target.value)} placeholder="e.g. HSBC Personal, Grab Wallet" />
              </div>

              {/* Simple dynamic detail fields */}
              {methodType === PayoutMethodType.BANK_TRANSFER ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="input" placeholder="Bank Name" onChange={e=>setMethodDetails((d:any)=>({ ...d, bankName: e.target.value }))} />
                  <input className="input" placeholder="Account Name" onChange={e=>setMethodDetails((d:any)=>({ ...d, accountName: e.target.value }))} />
                  <input className="input md:col-span-2" placeholder="Account Number" onChange={e=>setMethodDetails((d:any)=>({ ...d, accountNo: e.target.value }))} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="input" placeholder="Wallet ID / Phone" onChange={e=>setMethodDetails((d:any)=>({ ...d, walletId: e.target.value }))} />
                  <input className="input" placeholder="Holder Name (optional)" onChange={e=>setMethodDetails((d:any)=>({ ...d, holder: e.target.value }))} />
                </div>
              )}

              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={methodIsDefault} onChange={e=>setMethodIsDefault(e.target.checked)} /> Set as default
              </label>

              <div className="flex items-center justify-end gap-3">
                <button className="btn-outline" onClick={()=>setMethodModalOpen(false)}>Cancel</button>
                <button className="btn-primary" onClick={addMethod}><Plus className="w-4 h-4 mr-1" /> Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout Modal */}
      {payoutModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Request Payout</h3>
              <button className="btn-outline btn-sm" onClick={() => setPayoutModalOpen(false)}>Close</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
                <input type="number" min={0} max={summary?.availableBalance || 0} value={payoutAmount}
                       onChange={e=>setPayoutAmount(Number(e.target.value))} className="input" />
                <p className="text-xs text-gray-500 mt-1">Available: {currency(summary?.availableBalance || 0, summary?.currency)}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payout Method</label>
                <select value={payoutMethodId} onChange={e=>setPayoutMethodId(e.target.value)} className="input">
                  <option value="">Default Method</option>
                  {methods.map(m => (<option key={m.id} value={m.id}>{m.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Note (optional)</label>
                <textarea className="input" rows={3} placeholder="Anything we should know?" value={payoutNote} onChange={e=>setPayoutNote(e.target.value)} />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button className="btn-outline" onClick={()=>setPayoutModalOpen(false)}>Cancel</button>
                <button className="btn-primary" onClick={submitPayout} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPage;


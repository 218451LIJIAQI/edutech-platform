import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Clock, DollarSign, XCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import walletService, { AdminPayoutReviewAction } from '@/services/wallet.service';
import { PayoutRequest, PayoutRequestStatus } from '@/types';
import { extractErrorMessage } from '@/utils/error-handler';
import { useOverlayAccessibility } from '@/hooks';
import clientLogger from '@/utils/logger';

interface AdminPayoutsPanelProps {
  refreshKey: number;
}

const STATUS_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: PayoutRequestStatus.PENDING },
  { label: 'Approved', value: PayoutRequestStatus.APPROVED },
  { label: 'Processing', value: PayoutRequestStatus.PROCESSING },
  { label: 'Paid', value: PayoutRequestStatus.PAID },
  { label: 'Rejected', value: PayoutRequestStatus.REJECTED },
  { label: 'Cancelled', value: PayoutRequestStatus.CANCELLED },
];

const formatMoney = (amount: number) =>
  (amount ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

const getPayoutBadgeClass = (status: PayoutRequestStatus) => {
  switch (status) {
    case PayoutRequestStatus.PAID:
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case PayoutRequestStatus.APPROVED:
      return 'bg-blue-100 text-blue-700 border border-blue-200';
    case PayoutRequestStatus.PROCESSING:
      return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
    case PayoutRequestStatus.REJECTED:
      return 'bg-red-100 text-red-700 border border-red-200';
    case PayoutRequestStatus.CANCELLED:
      return 'bg-gray-100 text-gray-600 border border-gray-200';
    default:
      return 'bg-amber-100 text-amber-700 border border-amber-200';
  }
};

export default function AdminPayoutsPanel({ refreshKey }: AdminPayoutsPanelProps) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [items, setItems] = useState<PayoutRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const [modalAction, setModalAction] = useState<{
    payout: PayoutRequest;
    action: 'paid' | 'reject';
  } | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const closeModal = useCallback(() => {
    if (submittingId) return;
    setModalAction(null);
    setAdminNote('');
    setExternalReference('');
  }, [submittingId]);

  useOverlayAccessibility({
    isOpen: Boolean(modalAction),
    containerRef: modalRef,
    initialFocusRef: firstInputRef,
    onClose: closeModal,
    trapFocus: true,
    lockBodyScroll: true,
  });

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await walletService.listAdminPayouts({
        status: statusFilter || undefined,
        limit: 50,
        offset: 0,
      });
      setItems(response.items);
      setTotal(response.total);
    } catch (error) {
      clientLogger.error('Failed to load admin payouts:', error);
      const message = extractErrorMessage(error, 'Failed to load teacher payout requests');
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadPayouts();
  }, [loadPayouts, refreshKey]);

  const executeReview = async (
    payoutId: string,
    action: AdminPayoutReviewAction,
    opts?: { adminNote?: string; externalReference?: string }
  ) => {
    if (submittingId) return;
    setSubmittingId(payoutId);
    try {
      await walletService.reviewAdminPayout(payoutId, {
        action,
        adminNote: opts?.adminNote,
        externalReference: opts?.externalReference,
      });
      toast.success(`Payout ${action === 'paid' ? 'marked as paid' : `${action}d`} successfully`);
      setModalAction(null);
      setAdminNote('');
      setExternalReference('');
      await loadPayouts();
    } catch (error) {
      clientLogger.error('Failed to review payout:', error);
      toast.error(extractErrorMessage(error, 'Failed to update payout status'));
    } finally {
      setSubmittingId(null);
    }
  };

  const handleModalSubmit = async () => {
    if (!modalAction || submittingId) return;
    if (modalAction.action === 'reject' && !adminNote.trim()) {
      toast.error('Please enter an admin note explaining why the payout was rejected');
      return;
    }
    if (modalAction.action === 'paid' && !externalReference.trim()) {
      toast.error('Please enter the bank/payment transfer reference number');
      return;
    }

    await executeReview(modalAction.payout.id, modalAction.action, {
      adminNote: adminNote.trim() || undefined,
      externalReference: externalReference.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="payout-status-filter" className="text-sm font-semibold text-gray-700">
            Status:
          </label>
          <select
            id="payout-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input py-2 w-48"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-gray-500">
          Showing {items.length} of {total} payout request(s)
        </p>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between gap-4">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadPayouts()}
            className="btn-outline btn-sm"
          >
            Retry
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Teacher</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Amount</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Method</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Requested</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center">
                  <div className="spinner mx-auto" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No teacher payout requests found.
                </td>
              </tr>
            ) : (
              items.map((payout) => {
                const teacherUser = payout.wallet?.user;
                const teacherName = teacherUser
                  ? `${teacherUser.firstName} ${teacherUser.lastName}`.trim() || teacherUser.email
                  : 'Teacher';
                const isBusy = submittingId === payout.id;

                return (
                  <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">{teacherName}</p>
                      {teacherUser?.email ? (
                        <p className="text-xs text-gray-500">{teacherUser.email}</p>
                      ) : null}
                      {payout.note ? (
                        <p className="mt-1 text-xs text-gray-600">Note: {payout.note}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {formatMoney(payout.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <p className="font-medium">{payout.method?.label || payout.method?.type || '-'}</p>
                      {payout.externalReference ? (
                        <p className="text-xs text-gray-500">Ref: {payout.externalReference}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(payout.requestedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getPayoutBadgeClass(
                          payout.status
                        )}`}
                      >
                        {payout.status}
                      </span>
                      {payout.adminNote ? (
                        <p className="mt-1 text-xs text-gray-500 max-w-xs">{payout.adminNote}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {payout.status === PayoutRequestStatus.PENDING && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void executeReview(payout.id, 'approve')}
                            className="btn-primary btn-sm inline-flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        )}
                        {payout.status === PayoutRequestStatus.APPROVED && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void executeReview(payout.id, 'processing')}
                            className="btn-outline btn-sm inline-flex items-center gap-1"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Mark Processing
                          </button>
                        )}
                        {payout.status === PayoutRequestStatus.PROCESSING && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setModalAction({ payout, action: 'paid' });
                              setAdminNote('');
                              setExternalReference('');
                            }}
                            className="btn-primary btn-sm inline-flex items-center gap-1"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Mark Paid
                          </button>
                        )}
                        {(payout.status === PayoutRequestStatus.PENDING ||
                          payout.status === PayoutRequestStatus.APPROVED ||
                          payout.status === PayoutRequestStatus.PROCESSING) && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setModalAction({ payout, action: 'reject' });
                              setAdminNote('');
                              setExternalReference('');
                            }}
                            className="btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50 inline-flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payout-review-modal-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 id="payout-review-modal-title" className="text-lg font-bold text-gray-900">
                {modalAction.action === 'paid' ? 'Confirm Payout Transfer' : 'Reject Payout Request'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={Boolean(submittingId)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600">
              Amount: <strong>{formatMoney(modalAction.payout.amount)}</strong>
            </p>

            {modalAction.action === 'paid' && (
              <div>
                <label htmlFor="payout-ext-ref" className="block text-sm font-semibold text-gray-700 mb-1">
                  Transfer Reference Number *
                </label>
                <input
                  ref={(el) => {
                    firstInputRef.current = el;
                  }}
                  id="payout-ext-ref"
                  type="text"
                  value={externalReference}
                  onChange={(e) => setExternalReference(e.target.value)}
                  placeholder="e.g. TXN-20261123-98231"
                  className="input"
                  maxLength={255}
                  disabled={Boolean(submittingId)}
                />
              </div>
            )}

            <div>
              <label htmlFor="payout-admin-note" className="block text-sm font-semibold text-gray-700 mb-1">
                Admin Note {modalAction.action === 'reject' ? '*' : '(optional)'}
              </label>
              <textarea
                ref={(el) => {
                  if (modalAction.action === 'reject') {
                    firstInputRef.current = el;
                  }
                }}
                id="payout-admin-note"
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={
                  modalAction.action === 'reject'
                    ? 'Provide a clear reason for rejecting this payout...'
                    : 'Optional settlement note...'
                }
                className="input resize-none"
                maxLength={2000}
                disabled={Boolean(submittingId)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={Boolean(submittingId)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleModalSubmit()}
                disabled={Boolean(submittingId)}
                className="btn-primary"
              >
                {submittingId
                  ? 'Saving...'
                  : modalAction.action === 'paid'
                    ? 'Confirm Paid'
                    : 'Reject Payout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, Clock, DollarSign, Download, XCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import walletService, { AdminPayoutReviewAction } from '@/services/wallet.service';
import { PayoutMethod, PayoutRequest, PayoutRequestStatus } from '@/types';
import { extractErrorMessage } from '@/utils/error-handler';
import { buildCsvContent, downloadCsvFile } from '@/utils/download';
import { formatCurrency as formatMoney } from '@/utils/helpers';
import { useOverlayAccessibility } from '@/hooks';
import clientLogger from '@/utils/logger';

interface AdminPayoutsPanelProps {
  refreshKey: number;
  onPayoutUpdated?: () => void;
}

const PAGE_LIMIT = 20;

const STATUS_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: PayoutRequestStatus.PENDING },
  { label: 'Approved', value: PayoutRequestStatus.APPROVED },
  { label: 'Processing', value: PayoutRequestStatus.PROCESSING },
  { label: 'Paid', value: PayoutRequestStatus.PAID },
  { label: 'Rejected', value: PayoutRequestStatus.REJECTED },
  { label: 'Cancelled', value: PayoutRequestStatus.CANCELLED },
];

const maskAccountNumber = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.length <= 4) return trimmed;
  return `•••• ${trimmed.slice(-4)}`;
};

const formatPayoutDestination = (method?: PayoutMethod): string => {
  if (!method?.details) return '';
  const bankName =
    typeof method.details.bankName === 'string' ? method.details.bankName : '';
  const accountNo =
    typeof method.details.accountNo === 'string' ? method.details.accountNo : '';
  const walletId =
    typeof method.details.walletId === 'string' ? method.details.walletId : '';

  if (bankName || accountNo) {
    return [bankName, accountNo ? maskAccountNumber(accountNo) : '']
      .filter(Boolean)
      .join(' · ');
  }
  return walletId;
};

const getPayoutBadgeClass = (status: PayoutRequestStatus) => {
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

export default function AdminPayoutsPanel({
  refreshKey,
  onPayoutUpdated,
}: AdminPayoutsPanelProps) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [offset, setOffset] = useState(0);
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
  const [modalError, setModalError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const requestIdRef = useRef(0);

  const closeModal = useCallback(() => {
    if (submittingId) return;
    setModalAction(null);
    setAdminNote('');
    setExternalReference('');
    setModalError(null);
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
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await walletService.listAdminPayouts({
        status: statusFilter || undefined,
        limit: PAGE_LIMIT,
        offset,
      });
      if (requestId !== requestIdRef.current) return;
      setItems(response.items);
      setTotal(response.total);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      clientLogger.error('Failed to load admin payouts:', error);
      const message = extractErrorMessage(error, 'Failed to load teacher payout requests');
      setLoadError(message);
      toast.error(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [offset, statusFilter]);

  useEffect(() => {
    void loadPayouts();
    return () => {
      requestIdRef.current += 1;
    };
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
      toast.success(
        action === 'paid'
          ? 'Payout marked as paid and ledger updated'
          : action === 'reject'
            ? 'Payout rejected and frozen funds returned to teacher wallet'
            : action === 'processing'
              ? 'Payout marked as processing'
              : 'Payout approved'
      );
      setModalAction(null);
      setAdminNote('');
      setExternalReference('');
      setModalError(null);
      await loadPayouts();
      onPayoutUpdated?.();
    } catch (error) {
      clientLogger.error('Failed to review payout:', error);
      const message = extractErrorMessage(error, 'Failed to update payout status');
      setModalError(message);
      toast.error(message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleModalSubmit = async () => {
    if (!modalAction || submittingId) return;
    if (modalAction.action === 'reject' && !adminNote.trim()) {
      const message = 'Please enter an admin note explaining why the payout was rejected';
      setModalError(message);
      toast.error(message);
      return;
    }
    if (modalAction.action === 'paid' && !externalReference.trim()) {
      const message = 'Please enter the bank or payment transfer reference number';
      setModalError(message);
      toast.error(message);
      return;
    }

    setModalError(null);
    await executeReview(modalAction.payout.id, modalAction.action, {
      adminNote: adminNote.trim() || undefined,
      externalReference: externalReference.trim() || undefined,
    });
  };

  const handleExportCsv = () => {
    if (items.length === 0) {
      toast.error('No payout rows to export');
      return;
    }
    const headers = [
      'Payout ID',
      'Teacher',
      'Email',
      'Amount (USD)',
      'Method',
      'Destination',
      'Requested At',
      'Processed At',
      'Status',
      'External Reference',
      'Admin Note',
    ];
    const rows = items.map((payout) => {
      const user = payout.wallet?.user;
      const teacherName = user
        ? `${user.firstName} ${user.lastName}`.trim() || user.email
        : 'Teacher';
      return [
        payout.id,
        teacherName,
        user?.email || '',
        payout.amount.toFixed(2),
        payout.method?.label || payout.method?.type || '',
        formatPayoutDestination(payout.method),
        payout.requestedAt,
        payout.processedAt || '',
        payout.status,
        payout.externalReference || '',
        payout.adminNote || '',
      ];
    });
    const csv = buildCsvContent([headers, ...rows]);
    downloadCsvFile(csv, `teacher-payouts-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Payouts CSV exported');
  };

  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="payout-status-filter" className="text-sm font-semibold text-slate-700">
            Status:
          </label>
          <select
            id="payout-status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
            className="input py-2 w-48"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {statusFilter && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('');
                setOffset(0);
              }}
              className="btn-secondary btn-sm"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-600 tabular-nums">
            Showing {items.length} of {total} request(s)
          </p>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={items.length === 0}
            className="btn-outline btn-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
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

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 uppercase">
                Teacher
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-600 uppercase">
                Amount
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 uppercase">
                Method &amp; Destination
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 uppercase">
                Requested
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 uppercase">
                Status
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-600 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="spinner mx-auto" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-600 text-sm">
                  {statusFilter ? (
                    <div className="space-y-2">
                      <p>No teacher payout requests match status &ldquo;{statusFilter}&rdquo;.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter('');
                          setOffset(0);
                        }}
                        className="btn-secondary btn-sm"
                      >
                        Show All Payouts
                      </button>
                    </div>
                  ) : (
                    'No teacher payout requests have been submitted yet.'
                  )}
                </td>
              </tr>
            ) : (
              items.map((payout) => {
                const teacherUser = payout.wallet?.user;
                const teacherName = teacherUser
                  ? `${teacherUser.firstName} ${teacherUser.lastName}`.trim() ||
                    teacherUser.email
                  : 'Teacher';
                const destination = formatPayoutDestination(payout.method);
                const isBusy = submittingId === payout.id;

                return (
                  <tr key={payout.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">{teacherName}</p>
                      {teacherUser?.email ? (
                        <p className="text-xs text-slate-500">{teacherUser.email}</p>
                      ) : null}
                      {payout.note ? (
                        <p className="mt-1 text-xs text-slate-600">Note: {payout.note}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right whitespace-nowrap tabular-nums">
                      {formatMoney(payout.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <p className="font-medium">
                        {payout.method?.label || payout.method?.type || '-'}
                      </p>
                      {destination ? (
                        <p className="text-xs text-slate-500 mt-0.5">{destination}</p>
                      ) : null}
                      {payout.externalReference ? (
                        <p className="text-xs text-emerald-700 font-mono mt-0.5">
                          Ref: {payout.externalReference}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap tabular-nums">
                      {new Date(payout.requestedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={getPayoutBadgeClass(payout.status)}>
                        {payout.status}
                      </span>
                      {payout.adminNote ? (
                        <p className="mt-1 text-xs text-slate-500 max-w-xs">{payout.adminNote}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {payout.status === PayoutRequestStatus.PENDING && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void executeReview(payout.id, 'approve')}
                            className="btn-primary btn-sm"
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
                            className="btn-outline btn-sm"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Mark Processing
                          </button>
                        )}
                        {(payout.status === PayoutRequestStatus.APPROVED ||
                          payout.status === PayoutRequestStatus.PROCESSING) && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setModalAction({ payout, action: 'paid' });
                              setAdminNote('');
                              setExternalReference('');
                              setModalError(null);
                            }}
                            className="btn-primary btn-sm"
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
                              setModalError(null);
                            }}
                            className="btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50"
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

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm text-slate-600 tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={offset <= 0 || loading}
                onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_LIMIT))}
                className="btn-secondary btn-sm"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={offset + PAGE_LIMIT >= total || loading}
                onClick={() => setOffset((prev) => prev + PAGE_LIMIT)}
                className="btn-primary btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {modalAction &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-modal flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payout-review-modal-title"
            className="bg-white rounded-2xl shadow-modal w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 id="payout-review-modal-title" className="text-lg font-bold text-slate-900">
                {modalAction.action === 'paid'
                  ? 'Confirm Payout Transfer'
                  : 'Reject Payout & Unfreeze Balance'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={Boolean(submittingId)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {modalError}
              </div>
            ) : null}

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 space-y-1">
              <p className="tabular-nums">
                Amount: <strong>{formatMoney(modalAction.payout.amount)}</strong>
              </p>
              {modalAction.payout.method && (
                <p className="text-xs text-slate-600">
                  Destination: {modalAction.payout.method.label} (
                  {formatPayoutDestination(modalAction.payout.method) ||
                    modalAction.payout.method.type}
                  )
                </p>
              )}
            </div>

            {modalAction.action === 'paid' && (
              <div>
                <label
                  htmlFor="payout-ext-ref"
                  className="block text-sm font-semibold text-slate-700 mb-1"
                >
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
                  className="input font-mono"
                  maxLength={255}
                  disabled={Boolean(submittingId)}
                />
              </div>
            )}

            <div>
              <label
                htmlFor="payout-admin-note"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
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
                    ? 'Explain why this payout is rejected (funds return to withdrawable balance)...'
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
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleModalSubmit()}
                disabled={Boolean(submittingId)}
                className={modalAction.action === 'reject' ? 'btn-danger' : 'btn-primary'}
              >
                {submittingId
                  ? 'Saving...'
                  : modalAction.action === 'paid'
                    ? 'Confirm Paid'
                    : 'Reject & Unfreeze'}
              </button>
            </div>
          </div>
        </div>,
          document.body
        )}
    </div>
  );
}

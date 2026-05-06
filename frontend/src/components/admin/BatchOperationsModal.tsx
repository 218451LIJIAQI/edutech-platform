import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '@/services/admin.service';
import { extractErrorMessage } from '@/utils/error-handler';
import { useOverlayAccessibility } from '@/hooks';

type BatchOperation = 'activate' | 'deactivate' | 'delete';
type ColorKey = 'red' | 'yellow' | 'green';

interface BatchOperationsModalProps {
  isOpen: boolean;
  selectedUserIds: string[];
  selectedUserNames: string[];
  operation: BatchOperation | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface OperationDetails {
  title: string;
  description: string;
  confirmText: string;
  successMessage: string;
  color: ColorKey;
}

const colorClasses: Record<ColorKey, string> = {
  red: 'text-red-700 bg-red-50 border-red-200',
  yellow: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  green: 'text-green-700 bg-green-50 border-green-200',
};

const buttonClasses: Record<ColorKey, string> = {
  red: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  yellow: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
  green: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
};

/**
 * BatchOperationsModal
 *
 * Displays a confirmation modal for performing batch user operations.
 * The user must type the required confirmation keyword before the action can run.
 */
const BatchOperationsModal = ({
  isOpen,
  selectedUserIds,
  selectedUserNames,
  operation,
  onClose,
  onSuccess,
}: BatchOperationsModalProps) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const confirmInputRef = useRef<HTMLInputElement | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const selectedCount = selectedUserIds.length;
  const selectedUserKey = selectedUserIds.join('|');

  const details = useMemo<OperationDetails | null>(() => {
    if (!operation) return null;

    switch (operation) {
      case 'activate':
        return {
          title: 'Activate Users',
          description: `You are about to activate ${selectedCount} user(s).`,
          confirmText: 'ACTIVATE',
          successMessage: `${selectedCount} user(s) activated successfully`,
          color: 'green',
        };

      case 'deactivate':
        return {
          title: 'Deactivate Users',
          description: `You are about to deactivate ${selectedCount} user(s).`,
          confirmText: 'DEACTIVATE',
          successMessage: `${selectedCount} user(s) deactivated successfully`,
          color: 'yellow',
        };

      case 'delete':
        return {
          title: 'Safe Delete Users',
          description: `You are about to safely remove ${selectedCount} user(s) by deactivating their accounts while preserving audit, financial, support, and learning records.`,
          confirmText: 'SAFE DELETE',
          successMessage: `${selectedCount} user(s) safely deactivated`,
          color: 'yellow',
        };

      default:
        return null;
    }
  }, [operation, selectedCount]);

  const normalizedConfirmText = confirmText.trim().toUpperCase();

  const selectedUsersPreview = useMemo(() => {
    if (selectedUserNames.length === 0) {
      return 'No users selected';
    }

    const visibleNames = selectedUserNames.slice(0, 3).join(', ');
    const remainingCount = selectedUserNames.length - 3;

    return remainingCount > 0
      ? `${visibleNames} +${remainingCount} more`
      : visibleNames;
  }, [selectedUserNames]);

  const handleClose = useCallback(() => {
    if (isLoading) return;

    setConfirmText('');
    onClose();
  }, [isLoading, onClose]);

  useOverlayAccessibility({
    isOpen: isOpen && Boolean(details),
    containerRef: modalRef,
    initialFocusRef: confirmInputRef,
    onClose: handleClose,
    trapFocus: true,
    lockBodyScroll: true,
  });

  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
    }
  }, [isOpen, operation, selectedUserKey]);

  const handleConfirm = async () => {
    if (!details || !operation || isLoading) return;

    if (selectedCount === 0) {
      toast.error('Please select at least one user.');
      return;
    }

    if (normalizedConfirmText !== details.confirmText) {
      toast.error(`Please type "${details.confirmText}" to confirm.`);
      return;
    }

    setIsLoading(true);

    try {
      if (operation === 'activate' || operation === 'deactivate') {
        await adminService.batchUpdateUserStatus(
          selectedUserIds,
          operation === 'activate'
        );
      }

      if (operation === 'delete') {
        await adminService.batchDeleteUsers(selectedUserIds);
      }

      toast.success(details.successMessage);
      setConfirmText('');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, 'Operation failed'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !details) return null;

  const isConfirmDisabled =
    isLoading ||
    selectedCount === 0 ||
    normalizedConfirmText !== details.confirmText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-operation-title"
        aria-describedby="batch-operation-summary batch-operation-instruction"
        aria-busy={isLoading}
        className="w-full max-w-md rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b p-6">
          <h2
            id="batch-operation-title"
            className="text-xl font-bold text-gray-900"
          >
            {details.title}
          </h2>

          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-md text-gray-500 transition-colors hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <p id="batch-operation-instruction" className="sr-only">
            Review the selected users and type the confirmation keyword before
            completing this batch action.
          </p>

          <div
            id="batch-operation-summary"
            role="alert"
            aria-live="polite"
            className={`flex gap-3 rounded-lg border p-4 ${colorClasses[details.color]}`}
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">{details.description}</p>
              <p className="mt-1 text-sm opacity-80">
                Selected users: {selectedUsersPreview}
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="batch-operation-confirm-input"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Type{' '}
              <span className="font-bold text-red-600">
                {details.confirmText}
              </span>{' '}
              to confirm:
            </label>

            <input
              id="batch-operation-confirm-input"
              ref={confirmInputRef}
              type="text"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value.toUpperCase())}
              placeholder={`Type ${details.confirmText} here`}
              disabled={isLoading || selectedCount === 0}
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className={`flex-1 rounded-lg px-4 py-2 font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                buttonClasses[details.color]
              }`}
            >
              {isLoading ? 'Processing...' : details.title}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchOperationsModal;

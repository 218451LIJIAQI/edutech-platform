import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import adminService from '@/services/admin.service';
import { extractErrorMessage } from '@/utils/error-handler';

type BatchOperation = 'activate' | 'deactivate' | 'delete';

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
  actionPastTense: string;
  tone: 'primary' | 'warning' | 'danger';
}

const BatchOperationsModal = ({
  isOpen,
  selectedUserIds,
  selectedUserNames,
  operation,
  onClose,
  onSuccess,
}: BatchOperationsModalProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const selectedCount = selectedUserIds.length;
  const selectedUserKey = selectedUserIds.join('|');

  const details = useMemo<OperationDetails | null>(() => {
    switch (operation) {
      case 'activate':
        return {
          title: 'Activate Users',
          description: `You are about to activate ${selectedCount} user(s).`,
          confirmText: 'ACTIVATE',
          actionPastTense: 'activated',
          tone: 'primary',
        };
      case 'deactivate':
        return {
          title: 'Deactivate Users',
          description: `You are about to deactivate ${selectedCount} user(s).`,
          confirmText: 'DEACTIVATE',
          actionPastTense: 'deactivated',
          tone: 'warning',
        };
      case 'delete':
        return {
          title: 'Safe Delete Users',
          description: `You are about to safely remove ${selectedCount} user(s) by deactivating their accounts while preserving audit, financial, support, and learning records.`,
          confirmText: 'SAFE DELETE',
          actionPastTense: 'safely deactivated',
          tone: 'warning',
        };
      default:
        return null;
    }
  }, [operation, selectedCount]);

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
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  const handleConfirm = useCallback(async () => {
    if (!details || !operation || isLoading) {
      return;
    }

    if (selectedCount === 0) {
      toast.error('Please select at least one user.');
      return;
    }

    setIsLoading(true);
    try {
      const result =
        operation === 'delete'
          ? await adminService.batchDeleteUsers(selectedUserIds)
          : await adminService.batchUpdateUserStatus(
              selectedUserIds,
              operation === 'activate'
            );

      const succeededCount =
        result?.succeeded?.length ??
        result?.affected ??
        result?.count ??
        selectedCount;
      const failedItems = result?.failed ?? [];

      if (failedItems.length > 0 && succeededCount === 0) {
        toast.error(
          `No users were ${details.actionPastTense}: ${failedItems[0].reason}`
        );
        return;
      }

      if (failedItems.length > 0) {
        toast(
          `${succeededCount} user(s) ${details.actionPastTense}; ${failedItems.length} skipped (${failedItems[0].reason})`,
          { duration: 5000 }
        );
      } else {
        toast.success(`${succeededCount} user(s) ${details.actionPastTense} successfully`);
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, 'Operation failed'));
    } finally {
      setIsLoading(false);
    }
  }, [details, isLoading, onClose, onSuccess, operation, selectedCount, selectedUserIds]);

  if (!isOpen || !details) {
    return null;
  }

  return (
    <ConfirmationModal
      key={`${operation}-${selectedUserKey}`}
      isOpen={isOpen}
      title={details.title}
      description={details.description}
      details={[`Selected users: ${selectedUsersPreview}`]}
      confirmationText={details.confirmText}
      confirmationHint={`Type ${details.confirmText} here`}
      confirmLabel={details.title}
      tone={details.tone}
      isLoading={isLoading}
      onClose={handleClose}
      onConfirm={handleConfirm}
    />
  );
};

export default BatchOperationsModal;

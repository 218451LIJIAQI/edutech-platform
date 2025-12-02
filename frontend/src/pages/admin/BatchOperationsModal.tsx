import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '@/services/admin.service';

interface BatchOperationsModalProps {
  isOpen: boolean;
  selectedUserIds: string[];
  selectedUserNames: string[];
  operation: 'activate' | 'deactivate' | 'delete' | null;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Batch Operations Modal Component
 * For performing batch operations on multiple users
 */
const BatchOperationsModal = ({
  isOpen,
  selectedUserIds,
  selectedUserNames,
  operation,
  onClose,
  onSuccess,
}: BatchOperationsModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const getOperationDetails = () => {
    switch (operation) {
      case 'activate':
        return {
          title: 'Activate Users',
          description: `You are about to activate ${selectedUserIds.length} user(s).`,
          confirmText: 'ACTIVATE',
          action: 'activate',
          color: 'green',
        };
      case 'deactivate':
        return {
          title: 'Deactivate Users',
          description: `You are about to deactivate ${selectedUserIds.length} user(s).`,
          confirmText: 'DEACTIVATE',
          action: 'deactivate',
          color: 'yellow',
        };
      case 'delete':
        return {
          title: 'Delete Users',
          description: `You are about to permanently delete ${selectedUserIds.length} user(s). This action cannot be undone.`,
          confirmText: 'DELETE',
          action: 'delete',
          color: 'red',
        };
      default:
        return null;
    }
  };

  const details = getOperationDetails();

  const handleConfirm = async () => {
    if (!details) return;
    
    if (confirmText !== details.confirmText) {
      toast.error(`Please type "${details.confirmText}" to confirm`);
      return;
    }

    setIsLoading(true);
    try {
      if (operation === 'activate' || operation === 'deactivate') {
        await adminService.batchUpdateUserStatus(
          selectedUserIds,
          operation === 'activate'
        );
        toast.success(
          `${selectedUserIds.length} user(s) ${operation === 'activate' ? 'activated' : 'deactivated'} successfully`
        );
      } else if (operation === 'delete') {
        await adminService.batchDeleteUsers(selectedUserIds);
        toast.success(`${selectedUserIds.length} user(s) deleted successfully`);
      }
      onSuccess();
      onClose();
      setConfirmText('');
    } catch (error: unknown) {
      let errorMessage = 'Operation failed';
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) {
          errorMessage = response.data.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !details) return null;

  type ColorKey = 'red' | 'yellow' | 'green';
  
  const colorClasses: Record<ColorKey, string> = {
    red: 'text-red-600 bg-red-50 border-red-200',
    yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    green: 'text-green-600 bg-green-50 border-green-200',
  };

  const buttonClasses: Record<ColorKey, string> = {
    red: 'bg-red-600 hover:bg-red-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
    green: 'bg-green-600 hover:bg-green-700',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">{details.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning */}
          <div className={`p-4 rounded-lg border flex gap-3 ${colorClasses[details.color as ColorKey]}`}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{details.description}</p>
              <p className="text-sm mt-1 opacity-75">
                Selected users: {selectedUserNames.slice(0, 3).join(', ')}
                {selectedUserNames.length > 3 && ` +${selectedUserNames.length - 3} more`}
              </p>
            </div>
          </div>

          {/* Confirmation Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-bold text-red-600">{details.confirmText}</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder={`Type ${details.confirmText} here`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || confirmText !== details.confirmText}
              className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                buttonClasses[details.color as ColorKey]
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

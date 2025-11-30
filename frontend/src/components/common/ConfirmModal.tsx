import { ReactNode } from 'react';
import { AlertTriangle, Trash2, X, Info, CheckCircle } from 'lucide-react';

type ModalVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ModalVariant;
  isLoading?: boolean;
}

const variantConfig: Record<ModalVariant, {
  icon: typeof AlertTriangle;
  iconBg: string;
  iconColor: string;
  confirmBg: string;
}> = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-danger-100',
    iconColor: 'text-danger-600',
    confirmBg: 'bg-gradient-to-r from-danger-500 to-danger-600 hover:from-danger-600 hover:to-danger-700 shadow-danger-500/25',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-warning-100',
    iconColor: 'text-warning-600',
    confirmBg: 'bg-gradient-to-r from-warning-500 to-warning-600 hover:from-warning-600 hover:to-warning-700 shadow-warning-500/25',
  },
  info: {
    icon: Info,
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
    confirmBg: 'bg-gradient-to-r from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 shadow-primary-500/25',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-success-100',
    iconColor: 'text-success-600',
    confirmBg: 'bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 shadow-success-500/25',
  },
};

/**
 * Confirm Modal Component
 * A reusable confirmation dialog for destructive or important actions
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scaleIn overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-0">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${config.iconBg} rounded-xl flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <h3 id="modal-title" className="text-xl font-bold text-gray-900">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-gray-600 leading-relaxed">
            {message}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 ${config.confirmBg}`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

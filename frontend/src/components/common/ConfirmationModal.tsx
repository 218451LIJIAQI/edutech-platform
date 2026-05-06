import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { useOverlayAccessibility } from '@/hooks';
import clientLogger from '@/utils/logger';

type ConfirmationTone = 'danger' | 'warning' | 'primary';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  cancelLabel?: string;
  details?: string[];
  confirmationText?: string;
  confirmationHint?: string;
  isLoading?: boolean;
  tone?: ConfirmationTone;
}

const toneClasses: Record<
  ConfirmationTone,
  { icon: string; button: string; border: string; confirmationText: string }
> = {
  danger: {
    icon: 'bg-red-100 text-red-600',
    button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    border: 'border-red-200',
    confirmationText: 'text-red-600',
  },
  warning: {
    icon: 'bg-yellow-100 text-yellow-700',
    button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    border: 'border-yellow-200',
    confirmationText: 'text-yellow-700',
  },
  primary: {
    icon: 'bg-primary-100 text-primary-600',
    button: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
    border: 'border-primary-200',
    confirmationText: 'text-primary-600',
  },
};

/**
 * Reusable confirmation modal for sensitive or irreversible actions.
 * Supports optional details, loading state, and phrase confirmation.
 */
const ConfirmationModal = ({
  isOpen,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  cancelLabel = 'Cancel',
  details = [],
  confirmationText,
  confirmationHint,
  isLoading = false,
  tone = 'danger',
}: ConfirmationModalProps) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleId = useId();
  const descriptionId = useId();
  const confirmationInputId = useId();

  const modalPanelRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmationInputRef = useRef<HTMLInputElement | null>(null);

  const toneConfig = toneClasses[tone];
  const normalizedConfirmationText = confirmationText?.trim() ?? '';
  const requiresPhrase = normalizedConfirmationText.length > 0;
  const isBusy = isLoading || isSubmitting;

  useEffect(() => {
    if (isOpen) {
      setTypedConfirmation('');
      setIsSubmitting(false);
    }
  }, [isOpen, normalizedConfirmationText]);

  useOverlayAccessibility({
    isOpen,
    containerRef: modalPanelRef,
    initialFocusRef: requiresPhrase ? confirmationInputRef : cancelButtonRef,
    onClose: isBusy ? undefined : onClose,
    trapFocus: true,
    lockBodyScroll: true,
  });

  const isPhraseValid = useMemo(() => {
    if (!requiresPhrase) {
      return true;
    }

    return (
      typedConfirmation.trim().toUpperCase() ===
      normalizedConfirmationText.toUpperCase()
    );
  }, [requiresPhrase, typedConfirmation, normalizedConfirmationText]);

  const handleConfirm = useCallback(async () => {
    if (isBusy || !isPhraseValid) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm();
    } catch (error) {
      clientLogger.error('Confirmation action failed unexpectedly:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [isBusy, isPhraseValid, onConfirm]);

  const handleClose = useCallback(() => {
    if (!isBusy) {
      onClose();
    }
  }, [isBusy, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        ref={modalPanelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`w-full max-w-lg rounded-2xl border bg-white shadow-2xl ${toneConfig.border}`}
      >
        <div className="border-b border-gray-100 p-6">
          <div className="flex items-start gap-4">
            <div className={`rounded-2xl p-3 ${toneConfig.icon}`} aria-hidden="true">
              {tone === 'danger' ? (
                <ShieldAlert className="h-6 w-6" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </div>

            <div className="min-w-0">
              <h2 id={titleId} className="text-xl font-bold text-gray-900">
                {title}
              </h2>
              <p id={descriptionId} className="mt-2 text-sm leading-6 text-gray-600">
                {description}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {details.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="mb-3 text-sm font-semibold text-gray-900">
                This action will affect:
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                {details.map((detail, index) => (
                  <li key={`${detail}-${index}`} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-500" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {requiresPhrase ? (
            <div>
              <label
                htmlFor={confirmationInputId}
                className="mb-2 block text-sm font-semibold text-gray-900"
              >
                Type{' '}
                <span className={`font-mono ${toneConfig.confirmationText}`}>
                  {normalizedConfirmationText}
                </span>{' '}
                to continue
              </label>

              <input
                id={confirmationInputId}
                ref={confirmationInputRef}
                type="text"
                value={typedConfirmation}
                onChange={(event) => setTypedConfirmation(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleConfirm();
                  }
                }}
                placeholder={confirmationHint || normalizedConfirmationText}
                className="input w-full"
                disabled={isBusy}
                autoComplete="off"
              />
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 pt-0">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            className="btn-outline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isBusy || !isPhraseValid}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${toneConfig.button}`}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{isBusy ? 'Processing...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

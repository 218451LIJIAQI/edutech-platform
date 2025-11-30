import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { useOnClickOutside } from '@/hooks';

interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal description */
  description?: string;
  /** Modal content */
  children: ReactNode;
  /** Footer content (buttons, etc.) */
  footer?: ReactNode;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether to close on overlay click */
  closeOnOverlayClick?: boolean;
  /** Whether to close on Escape key */
  closeOnEscape?: boolean;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Additional className for modal content */
  className?: string;
}

/**
 * Modal Component
 * Accessible modal dialog with animations
 * 
 * @example
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Confirm Action"
 *   description="Are you sure you want to continue?"
 *   footer={
 *     <>
 *       <button className="btn-secondary" onClick={onClose}>Cancel</button>
 *       <button className="btn-primary" onClick={onConfirm}>Confirm</button>
 *     </>
 *   }
 * >
 *   <p>Modal content here...</p>
 * </Modal>
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useOnClickOutside(modalRef, () => {
    if (closeOnOverlayClick) onClose();
  }, isOpen);

  // Close on Escape key
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] h-[90vh]',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={clsx(
          'relative w-full bg-white rounded-2xl shadow-2xl',
          'animate-zoomIn',
          sizeClasses[size],
          size === 'full' ? 'flex flex-col' : 'max-h-[90vh]',
          className
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-6 border-b border-gray-100">
            <div>
              {title && (
                <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={clsx(
          'p-6 overflow-y-auto',
          size === 'full' && 'flex-1'
        )}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;

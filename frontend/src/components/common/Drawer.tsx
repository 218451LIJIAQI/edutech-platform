import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface DrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Drawer title */
  title?: string;
  /** Drawer description */
  description?: string;
  /** Drawer content */
  children: ReactNode;
  /** Footer content */
  footer?: ReactNode;
  /** Position of the drawer */
  position?: 'left' | 'right' | 'top' | 'bottom';
  /** Size of the drawer */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether to show overlay */
  overlay?: boolean;
  /** Whether to close on overlay click */
  closeOnOverlayClick?: boolean;
  /** Whether to close on Escape key */
  closeOnEscape?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Drawer Component
 * Slide-in panel from any edge of the screen
 * 
 * @example
 * <Drawer
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Filters"
 *   position="right"
 *   size="md"
 * >
 *   <FilterForm />
 * </Drawer>
 */
const Drawer = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  position = 'right',
  size = 'md',
  overlay = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
}: DrawerProps) => {
  const drawerRef = useRef<HTMLDivElement>(null);

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

  const isHorizontal = position === 'left' || position === 'right';

  const sizeClasses = {
    sm: isHorizontal ? 'w-80' : 'h-64',
    md: isHorizontal ? 'w-96' : 'h-96',
    lg: isHorizontal ? 'w-[480px]' : 'h-[480px]',
    xl: isHorizontal ? 'w-[640px]' : 'h-[640px]',
    full: isHorizontal ? 'w-screen' : 'h-screen',
  };

  const positionClasses = {
    left: 'left-0 top-0 h-full animate-slideInRight',
    right: 'right-0 top-0 h-full animate-slideInLeft',
    top: 'top-0 left-0 w-full animate-fadeInDown',
    bottom: 'bottom-0 left-0 w-full animate-fadeInUp',
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      {overlay && (
        <div
          className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-fadeIn"
          onClick={closeOnOverlayClick ? onClose : undefined}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={clsx(
          'fixed bg-white shadow-2xl flex flex-col',
          positionClasses[position],
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-6 border-b border-gray-100 flex-shrink-0">
            <div>
              {title && (
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Drawer;

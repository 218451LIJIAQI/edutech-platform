import { ReactNode, useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface CollapsibleProps {
  /** Trigger element or content */
  trigger: ReactNode | ((props: { isOpen: boolean }) => ReactNode);
  /** Collapsible content */
  children: ReactNode;
  /** Whether initially open */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Whether to show the default chevron icon */
  showIcon?: boolean;
  /** Custom icon */
  icon?: ReactNode;
  /** Animation duration in ms */
  duration?: number;
  /** Container className */
  className?: string;
  /** Trigger className */
  triggerClassName?: string;
  /** Content className */
  contentClassName?: string;
  /** Whether trigger should be disabled */
  disabled?: boolean;
}

/**
 * Collapsible Component
 * Animated collapsible/expandable content section
 * 
 * @example
 * <Collapsible trigger="Click to expand">
 *   <p>Hidden content here...</p>
 * </Collapsible>
 * 
 * @example
 * <Collapsible
 *   trigger={({ isOpen }) => (
 *     <div className="flex items-center gap-2">
 *       <span>Section Title</span>
 *       {isOpen ? 'Close' : 'Open'}
 *     </div>
 *   )}
 *   defaultOpen
 * >
 *   <ExpandedContent />
 * </Collapsible>
 */
const Collapsible = ({
  trigger,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  showIcon = true,
  icon,
  duration = 300,
  className,
  triggerClassName,
  contentClassName,
  disabled = false,
}: CollapsibleProps) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);

  // Determine if controlled or uncontrolled
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  // Update height when content changes or open state changes
  useEffect(() => {
    if (!contentRef.current) return;

    if (isOpen) {
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(contentHeight);
      
      // After animation completes, remove fixed height for dynamic content
      const timer = setTimeout(() => {
        setHeight(undefined);
      }, duration);
      
      return () => clearTimeout(timer);
    } else {
      // First set the current height, then animate to 0
      setHeight(contentRef.current.scrollHeight);
      requestAnimationFrame(() => {
        setHeight(0);
      });
    }
  }, [isOpen, duration]);

  const handleToggle = () => {
    if (disabled) return;

    if (isControlled) {
      onOpenChange?.(!controlledOpen);
    } else {
      setInternalOpen(!internalOpen);
      onOpenChange?.(!internalOpen);
    }
  };

  const triggerContent = typeof trigger === 'function' ? trigger({ isOpen }) : trigger;

  return (
    <div className={clsx('w-full', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-expanded={isOpen}
        className={clsx(
          'w-full flex items-center justify-between',
          'transition-colors duration-200',
          disabled && 'opacity-50 cursor-not-allowed',
          triggerClassName
        )}
      >
        <span className="flex-1 text-left">{triggerContent}</span>
        
        {showIcon && (
          <span
            className={clsx(
              'transition-transform duration-200 ml-2 flex-shrink-0',
              isOpen && 'rotate-180'
            )}
          >
            {icon || <ChevronDown className="w-5 h-5" />}
          </span>
        )}
      </button>

      {/* Collapsible content */}
      <div
        ref={contentRef}
        className={clsx(
          'overflow-hidden transition-all',
          contentClassName
        )}
        style={{
          height: height === undefined ? 'auto' : height,
          transitionDuration: `${duration}ms`,
        }}
        aria-hidden={!isOpen}
      >
        <div className={clsx(!isOpen && 'invisible')}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Collapsible;

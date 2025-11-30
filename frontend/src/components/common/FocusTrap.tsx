import { ReactNode, useEffect, useRef, useCallback } from 'react';

interface FocusTrapProps {
  /** Content to trap focus within */
  children: ReactNode;
  /** Whether the focus trap is active */
  active?: boolean;
  /** Whether to auto-focus the first focusable element */
  autoFocus?: boolean;
  /** Whether to restore focus to the previously focused element on unmount */
  restoreFocus?: boolean;
  /** Optional initial focus element selector */
  initialFocus?: string;
}

// Focusable element selectors
const FOCUSABLE_SELECTORS = [
  'a[href]:not([disabled])',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
  'audio[controls]',
  'video[controls]',
  'details > summary:first-of-type',
].join(', ');

/**
 * FocusTrap Component
 * Traps keyboard focus within its children for accessibility
 * Essential for modal dialogs, dropdown menus, and similar UI patterns
 * 
 * @example
 * <FocusTrap active={isModalOpen}>
 *   <Modal>
 *     <button>First focusable</button>
 *     <input placeholder="Input field" />
 *     <button>Last focusable</button>
 *   </Modal>
 * </FocusTrap>
 */
const FocusTrap = ({
  children,
  active = true,
  autoFocus = true,
  restoreFocus = true,
  initialFocus,
}: FocusTrapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    
    const elements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    return Array.from(elements).filter(
      (el) => !el.hasAttribute('disabled') && 
              el.tabIndex !== -1 &&
              !el.getAttribute('aria-hidden')
    );
  }, []);

  // Focus the first element or initial focus target
  const focusFirstElement = useCallback(() => {
    if (!containerRef.current) return;

    // Try initial focus selector first
    if (initialFocus) {
      const initialElement = containerRef.current.querySelector<HTMLElement>(initialFocus);
      if (initialElement) {
        initialElement.focus();
        return;
      }
    }

    // Focus first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      // If no focusable elements, focus the container itself
      containerRef.current.tabIndex = -1;
      containerRef.current.focus();
    }
  }, [getFocusableElements, initialFocus]);

  // Handle Tab key to trap focus
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!active || event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      // Shift + Tab (backwards)
      if (event.shiftKey) {
        if (activeElement === firstElement || !containerRef.current?.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
      }
      // Tab (forwards)
      else {
        if (activeElement === lastElement || !containerRef.current?.contains(activeElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [active, getFocusableElements]
  );

  // Store previous active element and setup focus trap
  useEffect(() => {
    if (!active) return;

    // Store current active element
    previousActiveElement.current = document.activeElement;

    // Auto-focus first element
    if (autoFocus) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        focusFirstElement();
      });
    }

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to previous element
      if (restoreFocus && previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [active, autoFocus, restoreFocus, focusFirstElement, handleKeyDown]);

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="focus-trap-container">
      {children}
    </div>
  );
};

export default FocusTrap;

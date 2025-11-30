import { useRef, useCallback, useEffect } from 'react';

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

interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  active?: boolean;
  /** Whether to auto-focus the first element */
  autoFocus?: boolean;
  /** Whether to restore focus on deactivation */
  restoreFocus?: boolean;
  /** Initial focus element selector */
  initialFocus?: string;
}

/**
 * Hook for programmatic focus trap management
 * Traps keyboard focus within a container for accessibility
 * 
 * @example
 * const { containerRef } = useFocusTrap({ active: isModalOpen });
 * return <div ref={containerRef}>{children}</div>;
 */
const useFocusTrap = (options: UseFocusTrapOptions = {}) => {
  const {
    active = true,
    autoFocus = true,
    restoreFocus = true,
    initialFocus,
  } = options;

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

  // Focus the first element
  const focusFirst = useCallback(() => {
    if (!containerRef.current) return;

    // Try initial focus selector first
    if (initialFocus) {
      const initialElement = containerRef.current.querySelector<HTMLElement>(initialFocus);
      if (initialElement) {
        initialElement.focus();
        return;
      }
    }

    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    } else {
      // If no focusable elements, focus the container itself
      containerRef.current.tabIndex = -1;
      containerRef.current.focus();
    }
  }, [getFocusableElements, initialFocus]);

  // Focus the last element
  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
    }
  }, [getFocusableElements]);

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

  // Setup and cleanup focus trap
  useEffect(() => {
    if (!active) return;

    // Store current active element
    previousActiveElement.current = document.activeElement;

    // Auto-focus first element
    if (autoFocus) {
      requestAnimationFrame(() => {
        focusFirst();
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
  }, [active, autoFocus, restoreFocus, focusFirst, handleKeyDown]);

  return { 
    containerRef, 
    getFocusableElements, 
    focusFirst, 
    focusLast 
  };
};

export default useFocusTrap;

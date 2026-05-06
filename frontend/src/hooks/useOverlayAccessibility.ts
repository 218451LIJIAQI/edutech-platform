import { RefObject, useEffect } from 'react';

interface UseOverlayAccessibilityOptions {
  isOpen: boolean;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onClose?: () => void;
  closeOnEscape?: boolean;
  trapFocus?: boolean;
  lockBodyScroll?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const getFocusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('disabled') && element.getClientRects().length > 0
  );

const useOverlayAccessibility = ({
  isOpen,
  containerRef,
  initialFocusRef,
  returnFocusRef,
  onClose,
  closeOnEscape = true,
  trapFocus = true,
  lockBodyScroll = false,
}: UseOverlayAccessibilityOptions) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;

    if (lockBodyScroll) {
      document.body.style.overflow = 'hidden';
    }

    const focusTarget =
      initialFocusRef?.current ?? getFocusableElements(container)[0] ?? container;

    requestAnimationFrame(() => {
      focusTarget.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape && onClose) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !trapFocus) {
        return;
      }

      const focusableElements = getFocusableElements(container);

      if (focusableElements.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !container.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (activeElement === lastElement || !container.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      if (lockBodyScroll) {
        document.body.style.overflow = previousOverflow;
      }

      const returnFocusTarget = returnFocusRef?.current ?? previousActiveElement;
      requestAnimationFrame(() => {
        returnFocusTarget?.focus();
      });
    };
  }, [
    closeOnEscape,
    containerRef,
    initialFocusRef,
    isOpen,
    lockBodyScroll,
    onClose,
    returnFocusRef,
    trapFocus,
  ]);
};

export default useOverlayAccessibility;

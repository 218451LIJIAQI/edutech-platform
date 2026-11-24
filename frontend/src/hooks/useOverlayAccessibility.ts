import { RefObject, useEffect, useRef } from 'react';

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
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  const trapFocusRef = useRef(trapFocus);
  const initialFocusTargetRef = useRef(initialFocusRef);
  const returnFocusTargetRef = useRef(returnFocusRef);

  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
    trapFocusRef.current = trapFocus;
    initialFocusTargetRef.current = initialFocusRef;
    returnFocusTargetRef.current = returnFocusRef;
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;

    if (lockBodyScroll) {
      document.body.style.overflow = 'hidden';
    }

    const focusFrame = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      if (container.contains(document.activeElement) && document.activeElement !== document.body) {
        return;
      }

      const focusTarget =
        initialFocusTargetRef.current?.current ??
        getFocusableElements(container)[0] ??
        container;
      focusTarget.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      if (event.key === 'Escape' && closeOnEscapeRef.current && onCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !trapFocusRef.current) {
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
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);

      if (lockBodyScroll) {
        document.body.style.overflow = previousOverflow;
      }

      const returnTarget = returnFocusTargetRef.current?.current ?? previousActiveElement;
      requestAnimationFrame(() => {
        if (returnTarget && document.contains(returnTarget)) {
          returnTarget.focus();
        }
      });
    };
  }, [containerRef, isOpen, lockBodyScroll]);
};

export default useOverlayAccessibility;

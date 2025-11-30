import { useEffect, useRef } from 'react';

type EventMap = WindowEventMap & DocumentEventMap & HTMLElementEventMap;

/**
 * Hook to attach event listeners with automatic cleanup
 * Handles adding and removing event listeners safely
 * 
 * @param eventName - The event to listen for
 * @param handler - Event handler function
 * @param element - Target element (defaults to window)
 * @param options - Event listener options
 * 
 * @example
 * // Listen to window resize
 * useEventListener('resize', handleResize);
 * 
 * @example
 * // Listen to element scroll
 * useEventListener('scroll', handleScroll, containerRef);
 * 
 * @example
 * // With options
 * useEventListener('scroll', handleScroll, window, { passive: true });
 */
function useEventListener<K extends keyof EventMap>(
  eventName: K,
  handler: (event: EventMap[K]) => void,
  element?: React.RefObject<HTMLElement> | Window | Document | null,
  options?: boolean | AddEventListenerOptions
): void {
  // Store the handler in a ref to avoid recreating the listener
  const savedHandler = useRef(handler);

  // Update ref when handler changes
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    // Get the target element
    const targetElement: Window | Document | HTMLElement | null = 
      element === undefined 
        ? window 
        : element instanceof Window || element instanceof Document
          ? element
          : element?.current ?? null;

    if (!targetElement?.addEventListener) {
      return;
    }

    // Create event listener that calls handler
    const eventListener = (event: Event) => {
      savedHandler.current(event as EventMap[K]);
    };

    targetElement.addEventListener(eventName, eventListener, options);

    // Cleanup
    return () => {
      targetElement.removeEventListener(eventName, eventListener, options);
    };
  }, [eventName, element, options]);
}

export default useEventListener;

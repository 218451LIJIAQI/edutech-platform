import { useState, useEffect, useRef, RefObject } from 'react';

interface IntersectionObserverOptions {
  /** Root element for intersection (default: viewport) */
  root?: Element | null;
  /** Margin around the root element */
  rootMargin?: string;
  /** Visibility threshold(s) to trigger callback */
  threshold?: number | number[];
  /** Whether to disconnect observer after first intersection */
  triggerOnce?: boolean;
  /** Whether the observer is enabled */
  enabled?: boolean;
}

interface IntersectionObserverReturn<T extends Element> {
  /** Ref to attach to the target element */
  ref: RefObject<T>;
  /** Whether the element is currently intersecting */
  isIntersecting: boolean;
  /** The IntersectionObserverEntry object */
  entry: IntersectionObserverEntry | null;
}

/**
 * useIntersectionObserver Hook
 * Detects when an element enters or leaves the viewport
 * 
 * @param options - IntersectionObserver configuration options
 * @returns Object containing ref, isIntersecting flag, and entry
 * 
 * @example
 * // Lazy load component when visible
 * const { ref, isIntersecting } = useIntersectionObserver({ triggerOnce: true });
 * 
 * return (
 *   <div ref={ref}>
 *     {isIntersecting && <HeavyComponent />}
 *   </div>
 * );
 * 
 * @example
 * // Infinite scroll
 * const { ref, isIntersecting } = useIntersectionObserver({ rootMargin: '100px' });
 * 
 * useEffect(() => {
 *   if (isIntersecting && hasMore) {
 *     loadMoreItems();
 *   }
 * }, [isIntersecting]);
 */
function useIntersectionObserver<T extends Element = HTMLDivElement>(
  options: IntersectionObserverOptions = {}
): IntersectionObserverReturn<T> {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    triggerOnce = false,
    enabled = true,
  } = options;

  const ref = useRef<T>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const observer = new IntersectionObserver(
      ([observerEntry]) => {
        setEntry(observerEntry);
        setIsIntersecting(observerEntry.isIntersecting);

        // Disconnect if triggerOnce and element is intersecting
        if (triggerOnce && observerEntry.isIntersecting) {
          observer.disconnect();
        }
      },
      { root, rootMargin, threshold }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [root, rootMargin, threshold, triggerOnce, enabled]);

  return { ref, isIntersecting, entry };
}

/**
 * useInView Hook
 * Simplified version that just returns a boolean
 */
export function useInView(options?: IntersectionObserverOptions) {
  const { ref, isIntersecting } = useIntersectionObserver(options);
  return { ref, inView: isIntersecting };
}

export default useIntersectionObserver;

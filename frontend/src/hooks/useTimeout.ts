import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for declarative setTimeout with automatic cleanup
 * 
 * @param callback - Function to call after delay
 * @param delay - Delay in milliseconds (null to disable)
 * 
 * @example
 * // Simple timeout
 * useTimeout(() => {
 *   console.log('Called after 1 second');
 * }, 1000);
 * 
 * @example
 * // Conditional timeout (pass null to disable)
 * useTimeout(
 *   () => console.log('Timeout!'),
 *   isActive ? 5000 : null
 * );
 */
const useTimeout = (callback: () => void, delay: number | null): void => {
  const savedCallback = useRef(callback);

  // Update ref when callback changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the timeout
  useEffect(() => {
    // Don't schedule if no delay is specified
    if (delay === null) return;

    const id = setTimeout(() => {
      savedCallback.current();
    }, delay);

    return () => clearTimeout(id);
  }, [delay]);
};

export default useTimeout;

/**
 * Hook for setTimeout with reset capability
 * 
 * @example
 * const { reset, clear } = useTimeoutFn(() => {
 *   setShowMessage(false);
 * }, 3000);
 * 
 * // Reset the timeout (restart from 0)
 * reset();
 * 
 * // Cancel the timeout
 * clear();
 */
export const useTimeoutFn = (
  callback: () => void,
  delay: number
): { reset: () => void; clear: () => void } => {
  const savedCallback = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Update ref when callback changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const reset = useCallback(() => {
    clear();
    timeoutRef.current = setTimeout(() => {
      savedCallback.current();
    }, delay);
  }, [delay, clear]);

  // Start timeout on mount
  useEffect(() => {
    reset();
    return clear;
  }, [reset, clear]);

  return { reset, clear };
};

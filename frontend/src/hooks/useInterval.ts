import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for declarative setInterval with automatic cleanup
 * 
 * @param callback - Function to call at each interval
 * @param delay - Interval delay in milliseconds (null to stop)
 * 
 * @example
 * // Simple interval
 * useInterval(() => {
 *   setCount(c => c + 1);
 * }, 1000);
 * 
 * @example
 * // Conditional interval (pass null to pause)
 * useInterval(
 *   () => setSeconds(s => s + 1),
 *   isRunning ? 1000 : null
 * );
 */
const useInterval = (callback: () => void, delay: number | null): void => {
  const savedCallback = useRef(callback);

  // Update ref when callback changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    // Don't schedule if no delay is specified
    if (delay === null) return;

    const id = setInterval(() => {
      savedCallback.current();
    }, delay);

    return () => clearInterval(id);
  }, [delay]);
};

export default useInterval;

/**
 * Hook for setInterval with control functions
 * 
 * @example
 * const { start, stop, isRunning, toggle } = useIntervalFn(() => {
 *   fetchData();
 * }, 5000);
 */
export const useIntervalFn = (
  callback: () => void,
  delay: number
): {
  start: () => void;
  stop: () => void;
  toggle: () => void;
  isRunning: boolean;
} => {
  const savedCallback = useRef(callback);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const isRunningRef = useRef(false);

  // Update ref when callback changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
      isRunningRef.current = false;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    intervalRef.current = setInterval(() => {
      savedCallback.current();
    }, delay);
    isRunningRef.current = true;
  }, [delay, stop]);

  const toggle = useCallback(() => {
    if (isRunningRef.current) {
      stop();
    } else {
      start();
    }
  }, [start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return stop;
  }, [stop]);

  return { 
    start, 
    stop, 
    toggle,
    isRunning: isRunningRef.current 
  };
};

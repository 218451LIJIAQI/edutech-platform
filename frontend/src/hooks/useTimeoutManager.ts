import { useCallback, useEffect, useRef } from 'react';

type TimeoutId = ReturnType<typeof setTimeout>;

const useTimeoutManager = () => {
  const timeoutsRef = useRef<Set<TimeoutId>>(new Set());

  const clearManagedTimeout = useCallback((timeoutId: TimeoutId | null | undefined) => {
    if (timeoutId === null || timeoutId === undefined) {
      return;
    }

    clearTimeout(timeoutId);
    timeoutsRef.current.delete(timeoutId);
  }, []);

  const setManagedTimeout = useCallback(
    (callback: () => void, delay: number): TimeoutId => {
      const timeoutId = setTimeout(() => {
        timeoutsRef.current.delete(timeoutId);
        callback();
      }, delay);

      timeoutsRef.current.add(timeoutId);
      return timeoutId;
    },
    []
  );

  const clearAllManagedTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    timeoutsRef.current.clear();
  }, []);

  useEffect(() => clearAllManagedTimeouts, [clearAllManagedTimeouts]);

  return {
    setManagedTimeout,
    clearManagedTimeout,
    clearAllManagedTimeouts,
  };
};

export default useTimeoutManager;

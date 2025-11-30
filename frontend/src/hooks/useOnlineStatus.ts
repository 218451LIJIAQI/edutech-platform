import { useState, useEffect, useCallback } from 'react';

interface OnlineStatus {
  /** Whether the browser is online */
  isOnline: boolean;
  /** Whether the status is being determined */
  isLoading: boolean;
  /** Timestamp of the last status change */
  lastChanged: Date | null;
  /** Time since last online (in ms), null if currently online */
  offlineDuration: number | null;
}

/**
 * useOnlineStatus Hook
 * Monitors the browser's online/offline status with additional metadata
 * 
 * @returns OnlineStatus object with isOnline, isLoading, lastChanged, and offlineDuration
 * 
 * @example
 * const { isOnline, offlineDuration } = useOnlineStatus();
 * 
 * if (!isOnline) {
 *   return <OfflineBanner duration={offlineDuration} />;
 * }
 */
function useOnlineStatus(): OnlineStatus {
  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isLoading: true,
    lastChanged: null,
    offlineDuration: null,
  });

  const updateOnlineStatus = useCallback((online: boolean) => {
    setStatus(prev => ({
      isOnline: online,
      isLoading: false,
      lastChanged: new Date(),
      offlineDuration: online ? null : (prev.lastChanged ? Date.now() - prev.lastChanged.getTime() : 0),
    }));
  }, []);

  useEffect(() => {
    // Set initial state
    setStatus(prev => ({
      ...prev,
      isOnline: navigator.onLine,
      isLoading: false,
    }));

    const handleOnline = () => updateOnlineStatus(true);
    const handleOffline = () => updateOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateOnlineStatus]);

  // Update offline duration periodically when offline
  useEffect(() => {
    if (!status.isOnline && status.lastChanged) {
      const interval = setInterval(() => {
        setStatus(prev => ({
          ...prev,
          offlineDuration: prev.lastChanged ? Date.now() - prev.lastChanged.getTime() : null,
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [status.isOnline, status.lastChanged]);

  return status;
}

export default useOnlineStatus;

import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '@/utils/runtime';

const API_BASE_URL = getApiBaseUrl().replace(/\/$/, '');
const HEALTH_CHECK_URL = `${API_BASE_URL}/health`;
const HEALTH_CHECK_TIMEOUT_MS = 4000;

interface OnlineStatus {
  /** Whether the browser is online */
  isOnline: boolean;
  /** Whether the status is being determined */
  isLoading: boolean;
  /** Whether an active connectivity check is running */
  isChecking: boolean;
  /** Timestamp of the last status change */
  lastChanged: Date | null;
  /** Time since last online (in ms), null if currently online */
  offlineDuration: number | null;
  /** Re-check browser and API connectivity */
  checkConnection: () => Promise<boolean>;
}

/**
 * useOnlineStatus Hook
 * Monitors the browser's online/offline status with additional metadata
 *
 * @returns OnlineStatus object with isOnline, isLoading, isChecking, lastChanged,
 * offlineDuration, and checkConnection()
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
    isChecking: false,
    lastChanged: null,
    offlineDuration: null,
    checkConnection: async () => true,
  });

  const updateOnlineStatus = useCallback((online: boolean, isChecking = false) => {
    setStatus(prev => ({
      isOnline: online,
      isLoading: false,
      isChecking,
      lastChanged: prev.isOnline === online ? prev.lastChanged : new Date(),
      offlineDuration: online
        ? null
        : (prev.lastChanged ? Date.now() - prev.lastChanged.getTime() : 0),
      checkConnection: prev.checkConnection,
    }));
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      updateOnlineStatus(false);
      return false;
    }

    setStatus(prev => ({
      ...prev,
      isLoading: false,
      isChecking: true,
    }));

    if (typeof window === 'undefined') {
      updateOnlineStatus(true);
      return true;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    try {
      const response = await fetch(HEALTH_CHECK_URL, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });
      const online = response.ok || response.status < 500;
      updateOnlineStatus(online);
      return online;
    } catch {
      updateOnlineStatus(false);
      return false;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, [updateOnlineStatus]);

  useEffect(() => {
    // Set initial state
    setStatus(prev => ({
      ...prev,
      isOnline: navigator.onLine,
      isLoading: false,
      isChecking: false,
      checkConnection,
    }));

    const handleOnline = () => {
      void checkConnection();
    };
    const handleOffline = () => updateOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      void checkConnection();
    } else {
      updateOnlineStatus(false);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection, updateOnlineStatus]);

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

  return {
    ...status,
    checkConnection,
  };
}

export default useOnlineStatus;

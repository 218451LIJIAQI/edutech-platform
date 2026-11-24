import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '@/utils/runtime';

const API_BASE_URL = getApiBaseUrl().replace(/\/$/, '');
const HEALTH_CHECK_URL = `${API_BASE_URL}/health`;
const HEALTH_CHECK_TIMEOUT_MS = 4000;

interface OnlineStatusState {
  isOnline: boolean;
  isLoading: boolean;
  isChecking: boolean;
  lastChanged: Date | null;
  offlineDuration: number | null;
}

interface OnlineStatus extends OnlineStatusState {
  /** Re-check browser and API connectivity */
  checkConnection: () => Promise<boolean>;
}

/**
 * Monitors browser and backend API reachability without false-offline lockups on LAN/localhost setups.
 */
function useOnlineStatus(): OnlineStatus {
  const [status, setStatus] = useState<OnlineStatusState>(() => ({
    isOnline: true,
    isLoading: true,
    isChecking: false,
    lastChanged: null,
    offlineDuration: null,
  }));

  const updateOnlineStatus = useCallback((online: boolean, isChecking = false) => {
    setStatus((prev) => {
      const changedAt = prev.isOnline === online ? prev.lastChanged : new Date();
      return {
        isOnline: online,
        isLoading: false,
        isChecking,
        lastChanged: changedAt,
        offlineDuration: online
          ? null
          : changedAt
            ? Math.max(0, Date.now() - changedAt.getTime())
            : 0,
      };
    });
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') {
      updateOnlineStatus(true);
      return true;
    }

    setStatus((prev) => ({
      ...prev,
      isLoading: false,
      isChecking: true,
    }));

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
    const handleOnline = () => {
      void checkConnection();
    };
    const handleOffline = () => updateOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    void checkConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection, updateOnlineStatus]);

  useEffect(() => {
    if (!status.isOnline && status.lastChanged) {
      const interval = window.setInterval(() => {
        setStatus((prev) => ({
          ...prev,
          offlineDuration: prev.lastChanged
            ? Math.max(0, Date.now() - prev.lastChanged.getTime())
            : null,
        }));
      }, 1000);

      return () => window.clearInterval(interval);
    }
  }, [status.isOnline, status.lastChanged]);

  return {
    ...status,
    checkConnection,
  };
}

export default useOnlineStatus;

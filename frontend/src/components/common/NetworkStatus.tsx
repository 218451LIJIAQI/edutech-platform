import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks';
import clientLogger from '@/utils/logger';

const ONLINE_CONFIRMATION_DURATION_MS = 3000;

const formatOfflineDuration = (durationMs: number | null): string | null => {
  if (durationMs === null) {
    return null;
  }

  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `Offline for ${minutes}m ${seconds}s`;
  }

  return `Offline for ${seconds}s`;
};

/**
 * NetworkStatus Component
 * Displays a fixed banner when the user is offline and briefly confirms when the connection is restored.
 */
const NetworkStatus = () => {
  const {
    isOnline,
    isLoading,
    isChecking,
    lastChanged,
    offlineDuration,
    checkConnection,
  } = useOnlineStatus();

  const [showBanner, setShowBanner] = useState(false);
  const hasShownOfflineStateRef = useRef(false);

  const offlineLabel = useMemo(
    () => formatOfflineDuration(offlineDuration),
    [offlineDuration]
  );

  useEffect(() => {
    if (!isOnline) {
      hasShownOfflineStateRef.current = true;
      setShowBanner(true);
      return;
    }

    if (hasShownOfflineStateRef.current && lastChanged) {
      setShowBanner(true);

      const timerId = window.setTimeout(() => {
        setShowBanner(false);
        hasShownOfflineStateRef.current = false;
      }, ONLINE_CONFIRMATION_DURATION_MS);

      return () => {
        window.clearTimeout(timerId);
      };
    }

    setShowBanner(false);
  }, [isOnline, lastChanged]);

  const handleRetry = useCallback(async () => {
    try {
      await checkConnection();
    } catch (error) {
      clientLogger.error('Manual network connection check failed:', error);
    }
  }, [checkConnection]);

  if (!showBanner || (isLoading && lastChanged === null)) {
    return null;
  }

  return (
    <div
      role={isOnline ? 'status' : 'alert'}
      aria-live={isOnline ? 'polite' : 'assertive'}
      aria-atomic="true"
      className={`fixed inset-x-0 top-0 z-[100] transition-colors duration-300 ${
        isOnline ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 py-2">
        <div className="flex flex-wrap items-center justify-center gap-3 text-center text-sm font-medium text-white">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Back online. Your connection has been restored.</span>
            </>
          ) : (
            <>
              <WifiOff
                className="h-4 w-4 shrink-0 motion-safe:animate-pulse"
                aria-hidden="true"
              />

              <span>
                {isChecking
                  ? 'Checking your connection...'
                  : "You're offline. Some features may not be available."}
              </span>

              {offlineLabel ? (
                <span className="whitespace-nowrap text-white/85">
                  {offlineLabel}
                </span>
              ) : null}

              <button
                type="button"
                onClick={() => void handleRetry()}
                disabled={isChecking}
                className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/80 disabled:cursor-not-allowed disabled:opacity-70"
                aria-label="Retry network connection check"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    isChecking ? 'motion-safe:animate-spin' : ''
                  }`}
                  aria-hidden="true"
                />
                {isChecking ? 'Checking...' : 'Retry'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkStatus;

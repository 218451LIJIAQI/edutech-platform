import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '@/hooks';

/**
 * NetworkStatus Component
 * Displays a banner when the user goes offline and shows reconnection status
 */
const NetworkStatus = () => {
  const { isOnline, lastChanged } = useOnlineStatus();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Show banner when offline
    if (!isOnline) {
      setShowBanner(true);
    } else if (lastChanged) {
      // Show "Back online" message briefly when reconnecting
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, lastChanged]);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        isOnline ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-3 text-white text-sm font-medium">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              <span>Back online! Your connection has been restored.</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 animate-pulse" />
              <span>You're offline. Some features may not be available.</span>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkStatus;

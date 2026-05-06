import { useEffect, Suspense, useRef } from 'react';
import clientLogger from '@/utils/logger';
import { useAuthStore } from './store/auth-store';
import PageLoader from './components/common/PageLoader';
import {
  AUTH_STORAGE_KEY,
  getAccessToken,
  hasRecoverableAuthState,
  hasRecoverablePersistedAuthStateValue,
  subscribeToAuthSessionSync,
} from './utils/auth-storage';
import AppRoutes from './app/app-routes';
import { UserRole } from './types';

/**
 * Main App Component
 * Handles routing and authentication initialization
 */
function App() {
  const { isAuthenticated, user, fetchProfile, logout } = useAuthStore();
  const attemptedTeacherProfileHydrationRef = useRef<string | null>(null);

  // Initialize authentication on app load
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const hasRecoverableSession = hasRecoverableAuthState();
      if (!hasRecoverableSession) {
        attemptedTeacherProfileHydrationRef.current = null;
        if ((isAuthenticated || user) && isMounted) {
          try {
            await logout({ silent: true, skipServer: true });
          } catch (error) {
            if (isMounted) {
              clientLogger.error('Failed to reset stale auth state:', error);
            }
          }
        }
        return;
      }

      const isTeacherMissingProfile =
        user?.role === UserRole.TEACHER && !user.teacherProfile;
      const teacherProfileHydrationUserId = isTeacherMissingProfile
        ? user?.id
        : undefined;
      const shouldRetryTeacherProfileHydration =
        Boolean(teacherProfileHydrationUserId) &&
        attemptedTeacherProfileHydrationRef.current !== teacherProfileHydrationUserId;

      if (user?.role === UserRole.TEACHER && user.teacherProfile) {
        attemptedTeacherProfileHydrationRef.current = null;
      }

      if (shouldRetryTeacherProfileHydration && teacherProfileHydrationUserId) {
        attemptedTeacherProfileHydrationRef.current = teacherProfileHydrationUserId;
      }

      const hasAccessToken = Boolean(getAccessToken());

      if ((!hasAccessToken || !isAuthenticated || !user || shouldRetryTeacherProfileHydration) && isMounted) {
        try {
          await fetchProfile();
        } catch (error) {
          if (isMounted) {
            clientLogger.error('Failed to fetch profile:', error);
          }
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [fetchProfile, isAuthenticated, logout, user]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const synchronizeSessionState = (hasRecoverableSession: boolean) => {
      const hasInMemoryAccessToken = Boolean(getAccessToken());
      const hasLocalSession = Boolean(hasInMemoryAccessToken || isAuthenticated || user);

      if (!hasRecoverableSession) {
        attemptedTeacherProfileHydrationRef.current = null;
        if (hasLocalSession) {
          void logout({ silent: true, skipServer: true, skipBroadcast: true }).catch((error) => {
            clientLogger.error('Failed to synchronize logged-out session across tabs:', error);
          });
        }
        return;
      }

      if (!hasInMemoryAccessToken) {
        void fetchProfile().catch((error) => {
          clientLogger.error('Failed to synchronize restored session across tabs:', error);
        });
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage || event.key !== AUTH_STORAGE_KEY) {
        return;
      }

      synchronizeSessionState(hasRecoverablePersistedAuthStateValue(event.newValue));
    };

    window.addEventListener('storage', handleStorage);
    const unsubscribeAuthSessionSync = subscribeToAuthSessionSync((eventType) => {
      synchronizeSessionState(eventType === 'session-available');
    });

    return () => {
      window.removeEventListener('storage', handleStorage);
      unsubscribeAuthSessionSync();
    };
  }, [fetchProfile, isAuthenticated, logout, user]);

  return (
    <Suspense fallback={<PageLoader message="Loading page..." />}>
      <AppRoutes />
    </Suspense>
  );
}

export default App;

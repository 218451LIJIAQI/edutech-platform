import clientLogger from '@/utils/logger';

export const AUTH_STORAGE_KEY = 'auth-storage';
const AUTH_SESSION_HINT_COOKIE_NAME = 'refreshSession';
const AUTH_SESSION_SYNC_CHANNEL_NAME = 'auth-session-sync';
let inMemoryAccessToken: string | null = null;

type AuthSessionSyncEvent = 'session-available' | 'session-cleared';

let authSessionSyncChannel: BroadcastChannel | null | undefined;

interface PersistedAuthState {
  state?: {
    isAuthenticated?: boolean;
    user?: unknown;
    accessToken?: string | null;
    refreshToken?: string | null;
  };
  version?: number;
}

function hasRecoverablePersistedState(
  persistedState?: PersistedAuthState['state'] | null
): boolean {
  return Boolean(persistedState?.isAuthenticated || persistedState?.user);
}

function getPersistedAuthState(): PersistedAuthState | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PersistedAuthState;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    clientLogger.warn('Failed to read persisted auth state:', error);
    return null;
  }
}

function removeAuthStorageKey(key: string, warningMessage: string) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    clientLogger.warn(warningMessage, error);
  }
}

function hasAuthSessionHintCookie() {
  if (typeof document === 'undefined') {
    return false;
  }

  try {
    return document.cookie
      .split(';')
      .map((part) => part.trim())
      .some((part) => part === `${AUTH_SESSION_HINT_COOKIE_NAME}=1`);
  } catch (error) {
    clientLogger.warn('Failed to read auth session hint cookie:', error);
    return false;
  }
}

function clearAuthSessionHintCookie() {
  if (typeof document === 'undefined') {
    return;
  }

  try {
    document.cookie = `${AUTH_SESSION_HINT_COOKIE_NAME}=; Max-Age=0; path=/; SameSite=Lax${
      typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
    }`;
  } catch (error) {
    clientLogger.warn('Failed to clear auth session hint cookie:', error);
  }
}

function getAuthSessionSyncChannel() {
  if (authSessionSyncChannel !== undefined) {
    return authSessionSyncChannel;
  }

  if (typeof BroadcastChannel === 'undefined') {
    authSessionSyncChannel = null;
    return authSessionSyncChannel;
  }

  try {
    authSessionSyncChannel = new BroadcastChannel(AUTH_SESSION_SYNC_CHANNEL_NAME);
  } catch (error) {
    clientLogger.warn('Failed to initialize auth session sync channel:', error);
    authSessionSyncChannel = null;
  }

  return authSessionSyncChannel;
}

function emitAuthSessionSyncEvent(type: AuthSessionSyncEvent) {
  try {
    getAuthSessionSyncChannel()?.postMessage({ type });
  } catch (error) {
    clientLogger.warn('Failed to broadcast auth session state:', error);
  }
}

function patchPersistedAuthState(
  patch: Pick<NonNullable<PersistedAuthState['state']>, 'isAuthenticated' | 'user'>
) {
  try {
    const parsed = getPersistedAuthState();
    if (!parsed) {
      return;
    }

    const nextState = {
      ...(parsed.state || {}),
      ...patch,
    };
    delete nextState.accessToken;
    delete nextState.refreshToken;

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        ...parsed,
        state: nextState,
      })
    );
  } catch (error) {
    clientLogger.warn('Failed to update persisted auth state:', error);
  }
}

function hydrateLegacyAccessToken() {
  try {
    const legacyAccessToken = localStorage.getItem('accessToken');
    if (legacyAccessToken) {
      inMemoryAccessToken = legacyAccessToken;
      removeAuthStorageKey('accessToken', 'Failed to remove legacy access token from storage:');
    }
  } catch (error) {
    clientLogger.warn('Failed to migrate legacy auth tokens:', error);
  }

  removeAuthStorageKey('refreshToken', 'Failed to remove legacy refresh token from storage:');
}

function removeLegacyPersistedTokenCopies() {
  patchPersistedAuthState({});
}

hydrateLegacyAccessToken();
removeLegacyPersistedTokenCopies();

export function storeAccessToken(accessToken: string) {
  inMemoryAccessToken = accessToken;
  removeAuthStorageKey('accessToken', 'Failed to clear legacy access token copy from storage:');
  removeAuthStorageKey('refreshToken', 'Failed to clear legacy refresh token copy from storage:');
  patchPersistedAuthState({
    isAuthenticated: true,
  });
}

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function hasRecoverableAuthState() {
  if (inMemoryAccessToken) {
    return true;
  }

  return hasAuthSessionHintCookie();
}

export function hasRecoverablePersistedAuthStateValue(rawValue?: string | null) {
  if (!rawValue) {
    return false;
  }

  try {
    const parsed = JSON.parse(rawValue) as PersistedAuthState;
    return hasAuthSessionHintCookie() && hasRecoverablePersistedState(parsed?.state);
  } catch (error) {
    clientLogger.warn('Failed to parse persisted auth state snapshot:', error);
    return false;
  }
}

export function clearAuthStorage() {
  inMemoryAccessToken = null;
  removeAuthStorageKey('accessToken', 'Failed to clear legacy access token from storage:');
  removeAuthStorageKey('refreshToken', 'Failed to clear legacy refresh token from storage:');
  removeAuthStorageKey('user', 'Failed to clear legacy user snapshot from storage:');
  removeAuthStorageKey(AUTH_STORAGE_KEY, 'Failed to clear persisted auth state from storage:');
  clearAuthSessionHintCookie();
}

export function broadcastRecoverableAuthSession() {
  emitAuthSessionSyncEvent('session-available');
}

export function broadcastClearedAuthSession() {
  emitAuthSessionSyncEvent('session-cleared');
}

export function subscribeToAuthSessionSync(
  listener: (event: AuthSessionSyncEvent) => void
) {
  const channel = getAuthSessionSyncChannel();
  if (!channel) {
    return () => {};
  }

  const handleMessage = (event: MessageEvent<{ type?: AuthSessionSyncEvent }>) => {
    const eventType = event.data?.type;
    if (eventType === 'session-available' || eventType === 'session-cleared') {
      listener(eventType);
    }
  };

  channel.addEventListener('message', handleMessage);

  return () => {
    channel.removeEventListener('message', handleMessage);
  };
}

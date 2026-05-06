import { create } from 'zustand';
import clientLogger from '@/utils/logger';
import { persist } from 'zustand/middleware';
import { User, LoginCredentials, RegisterData } from '@/types';
import authService from '@/services/auth.service';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import {
  AUTH_STORAGE_KEY,
  broadcastClearedAuthSession,
  broadcastRecoverableAuthSession,
  clearAuthStorage,
  hasRecoverableAuthState,
  storeAccessToken,
} from '@/utils/auth-storage';

/**
 * Authentication Store
 * Manages authentication state and user session
 */

/**
 * Authentication state interface
 */
interface AuthState {
  /** Current authenticated user */
  user: User | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether the app is actively hydrating the current profile from the server */
  isProfileHydrating: boolean;
  /** Unique key for the current successful login session */
  loginSessionKey: string | null;
  /** Loading state for async operations */
  isLoading: boolean;

  // Actions
  /** Authenticate user with credentials */
  login: (credentials: LoginCredentials) => Promise<void>;
  /** Register a new user */
  register: (data: RegisterData) => Promise<void>;
  /** Logout current user */
  logout: (options?: { silent?: boolean; skipServer?: boolean; skipBroadcast?: boolean }) => Promise<void>;
  /** Update user profile */
  updateProfile: (
    data: Omit<Partial<User>, 'avatar'> & { avatar?: string | null }
  ) => Promise<void>;
  /** Fetch current user profile from server */
  fetchProfile: () => Promise<void>;
  /** Set user directly (for internal use) */
  setUser: (user: User) => void;
}

type PersistedAuthState = Pick<
  AuthState,
  'user' | 'isAuthenticated'
>;

const createLoginSessionKey = (userId: string) =>
  `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let profileHydrationPromise: Promise<void> | null = null;
let authSessionGeneration = 0;

const invalidateProfileHydration = () => {
  authSessionGeneration += 1;
  profileHydrationPromise = null;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isProfileHydrating: false,
      loginSessionKey: null,
      isLoading: false,

      login: async (credentials: LoginCredentials) => {
        try {
          invalidateProfileHydration();
          set({ isLoading: true });
          const { user, tokens } = await authService.login(credentials);

          // Store the short-lived access token in memory; refresh stays in an httpOnly cookie.
          try {
            storeAccessToken(tokens.accessToken);
          } catch (storageError) {
            clientLogger.error('Failed to store the in-memory auth session:', storageError);
            throw new Error('Failed to save the authentication session');
          }

          // Fetch full profile to include nested teacherProfile status
          let fullUser = user;
          try {
            fullUser = await authService.getProfile();
          } catch (profileError) {
            clientLogger.warn('Failed to fetch full profile, using login response:', profileError);
            // Continue with the user from login response
          }

          set({
            user: fullUser,
            isAuthenticated: true,
            isProfileHydrating: false,
            loginSessionKey: createLoginSessionKey(fullUser.id),
            isLoading: false,
          });
          broadcastRecoverableAuthSession();

          toast.success('Login successful!');
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = extractErrorMessage(error);
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }
      },

      register: async (data: RegisterData) => {
        try {
          invalidateProfileHydration();
          set({ isLoading: true });
          const { user, tokens } = await authService.register(data);

          // Store the short-lived access token in memory; refresh stays in an httpOnly cookie.
          try {
            storeAccessToken(tokens.accessToken);
          } catch (storageError) {
            clientLogger.error('Failed to store the in-memory auth session:', storageError);
            throw new Error('Failed to save the authentication session');
          }

          // Fetch full profile to include nested teacherProfile status
          let fullUser = user;
          try {
            fullUser = await authService.getProfile();
          } catch (profileError) {
            clientLogger.warn('Failed to fetch full profile, using register response:', profileError);
            // Continue with the user from register response
          }

          set({
            user: fullUser,
            isAuthenticated: true,
            isProfileHydrating: false,
            loginSessionKey: null,
            isLoading: false,
          });
          broadcastRecoverableAuthSession();

          toast.success('Registration successful!');
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = extractErrorMessage(error);
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }
      },

      logout: async (options) => {
        invalidateProfileHydration();
        try {
          if (!options?.skipServer) {
            await authService.logout();
          }
        } catch (error) {
          clientLogger.error('Logout error:', error);
          // Continue with local cleanup even if server logout fails
        } finally {
          try {
            clearAuthStorage();
          } catch (storageError) {
            clientLogger.error('Failed to clear tokens from localStorage:', storageError);
          }

          set({
            user: null,
            isAuthenticated: false,
            isProfileHydrating: false,
            loginSessionKey: null,
          });

          if (!options?.skipBroadcast) {
            broadcastClearedAuthSession();
          }

          if (!options?.silent) {
            toast.success('Logged out successfully');
          }
        }
      },

      updateProfile: async (
        data: Omit<Partial<User>, 'avatar'> & { avatar?: string | null }
      ) => {
        try {
          const prev = get().user;
          if (!prev) {
            throw new Error('Please login first');
          }

          const updatedUser = await authService.updateProfile(data);
          // Merge to preserve fields not returned by updateProfile (e.g., createdAt, enrollment counts)
          const mergedUser = { ...prev, ...updatedUser } as User;
          set({ user: mergedUser });
        } catch (error) {
          throw new Error(extractErrorMessage(error));
        }
      },

      fetchProfile: async () => {
        if (!profileHydrationPromise) {
          const requestGeneration = authSessionGeneration;
          set({ isProfileHydrating: true });
          const currentHydrationPromise = (async () => {
            try {
              const user = await authService.getProfile();
              if (requestGeneration !== authSessionGeneration) {
                return;
              }
              set({
                user,
                isAuthenticated: true,
                isProfileHydrating: false,
                loginSessionKey: get().loginSessionKey,
              });
            } catch (error) {
              if (requestGeneration !== authSessionGeneration) {
                return;
              }
              // If fetch fails, clear authentication state
              clientLogger.error('Profile fetch failed:', error);
              try {
                await get().logout({ silent: true, skipServer: true });
              } catch (logoutError) {
                clientLogger.error('Failed to logout after profile fetch error:', logoutError);
              }
              const errorMessage = extractErrorMessage(error, 'Failed to fetch profile');
              throw new Error(errorMessage);
            } finally {
              profileHydrationPromise = null;

              if (requestGeneration === authSessionGeneration) {
                set({ isProfileHydrating: false });
              }
            }
          })();

          profileHydrationPromise = currentHydrationPromise;
        }

        return profileHydrationPromise;
      },

      setUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState || {}) as Partial<PersistedAuthState>;
        const hasRecoverableSession = hasRecoverableAuthState();

        // Login promotions should only be tied to a fresh successful login, never a restored session.
        return {
          ...currentState,
          user: hasRecoverableSession
            ? persisted.user ?? currentState.user
            : null,
          isAuthenticated: hasRecoverableSession
            ? persisted.isAuthenticated ?? currentState.isAuthenticated
            : false,
          loginSessionKey: null,
        };
      },
    }
  )
);

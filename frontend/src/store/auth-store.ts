import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';
import clientLogger from '@/utils/logger';
import { User, LoginCredentials, RegisterData } from '@/types';
import authService from '@/services/auth.service';
import { extractErrorMessage } from '@/utils/error-handler';
import {
  AUTH_STORAGE_KEY,
  broadcastClearedAuthSession,
  broadcastRecoverableAuthSession,
  clearAuthStorage,
  hasRecoverableAuthState,
  storeAccessToken,
} from '@/utils/auth-storage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isProfileHydrating: boolean;
  loginSessionKey: string | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: (options?: { silent?: boolean; skipServer?: boolean; skipBroadcast?: boolean }) => Promise<void>;
  updateProfile: (
    data: Omit<Partial<User>, 'avatar'> & { avatar?: string | null }
  ) => Promise<void>;
  fetchProfile: () => Promise<void>;
  setUser: (user: User) => void;
}

type PersistedAuthState = Pick<AuthState, 'user' | 'isAuthenticated'>;

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
    (set, get) => {
      const establishAuthenticatedSession = async (
        authenticate: () => Promise<{ user: User; tokens: { accessToken: string } }>,
        options: {
          includeLoginSessionKey: boolean;
          fallbackSource: string;
          successMessage: string;
        }
      ) => {
        try {
          invalidateProfileHydration();
          set({ isLoading: true });
          const { user, tokens } = await authenticate();

          try {
            storeAccessToken(tokens.accessToken);
          } catch (storageError) {
            clientLogger.error('Failed to store the in-memory auth session:', storageError);
            throw new Error('Failed to save the authentication session');
          }

          let fullUser = user;
          try {
            fullUser = await authService.getProfile();
          } catch (profileError) {
            clientLogger.warn(
              `Failed to fetch full profile, using ${options.fallbackSource} response:`,
              profileError
            );
          }

          set({
            user: fullUser,
            isAuthenticated: true,
            isProfileHydrating: false,
            loginSessionKey: options.includeLoginSessionKey
              ? createLoginSessionKey(fullUser.id)
              : null,
            isLoading: false,
          });
          broadcastRecoverableAuthSession();
          toast.success(options.successMessage);
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = extractErrorMessage(error);
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }
      };

      return {
        user: null,
        isAuthenticated: false,
        isProfileHydrating: false,
        loginSessionKey: null,
        isLoading: false,

        login: (credentials: LoginCredentials) =>
          establishAuthenticatedSession(() => authService.login(credentials), {
            includeLoginSessionKey: true,
            fallbackSource: 'login',
            successMessage: 'Login successful!',
          }),

        register: (data: RegisterData) =>
          establishAuthenticatedSession(() => authService.register(data), {
            includeLoginSessionKey: false,
            fallbackSource: 'register',
            successMessage: 'Registration successful!',
          }),

        logout: async (options) => {
          invalidateProfileHydration();
          try {
            if (!options?.skipServer) {
              await authService.logout();
            }
          } catch (error) {
            clientLogger.error('Logout error:', error);
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
            set({ user: { ...prev, ...updatedUser } as User });
          } catch (error) {
            throw new Error(extractErrorMessage(error));
          }
        },

        fetchProfile: async () => {
          if (!profileHydrationPromise) {
            const requestGeneration = authSessionGeneration;
            set({ isProfileHydrating: true });
            profileHydrationPromise = (async () => {
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
                clientLogger.error('Profile fetch failed:', error);
                try {
                  await get().logout({ silent: true, skipServer: true });
                } catch (logoutError) {
                  clientLogger.error('Failed to logout after profile fetch error:', logoutError);
                }
                throw new Error(extractErrorMessage(error, 'Failed to fetch profile'));
              } finally {
                profileHydrationPromise = null;
                if (requestGeneration === authSessionGeneration) {
                  set({ isProfileHydrating: false });
                }
              }
            })();
          }

          return profileHydrationPromise;
        },

        setUser: (user: User) => {
          set({ user });
        },
      };
    },
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState || {}) as Partial<PersistedAuthState>;
        const hasRecoverableSession = hasRecoverableAuthState();

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

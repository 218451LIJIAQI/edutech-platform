import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginCredentials, RegisterData } from '@/types';
import authService from '@/services/auth.service';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/errorHandler';

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
  /** JWT access token */
  accessToken: string | null;
  /** JWT refresh token */
  refreshToken: string | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Loading state for async operations */
  isLoading: boolean;
  
  // Actions
  /** Authenticate user with credentials */
  login: (credentials: LoginCredentials) => Promise<void>;
  /** Register a new user */
  register: (data: RegisterData) => Promise<void>;
  /** Logout current user */
  logout: () => Promise<void>;
  /** Update user profile */
  updateProfile: (data: Partial<User>) => Promise<void>;
  /** Fetch current user profile from server */
  fetchProfile: () => Promise<void>;
  /** Set user directly (for internal use) */
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true });
          const { user, tokens } = await authService.login(credentials);
          
          // Store tokens in localStorage
          try {
            localStorage.setItem('accessToken', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
          } catch (storageError) {
            console.error('Failed to store tokens in localStorage:', storageError);
            throw new Error('Failed to save authentication tokens');
          }
          
          // Fetch full profile to include nested teacherProfile status
          let fullUser = user;
          try {
            fullUser = await authService.getProfile();
          } catch (profileError) {
            console.warn('Failed to fetch full profile, using login response:', profileError);
            // Continue with the user from login response
          }

          set({
            user: fullUser,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          
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
          set({ isLoading: true });
          const { user, tokens } = await authService.register(data);
          
          // Store tokens in localStorage
          try {
            localStorage.setItem('accessToken', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
          } catch (storageError) {
            console.error('Failed to store tokens in localStorage:', storageError);
            throw new Error('Failed to save authentication tokens');
          }
          
          // Fetch full profile to include nested teacherProfile status
          let fullUser = user;
          try {
            fullUser = await authService.getProfile();
          } catch (profileError) {
            console.warn('Failed to fetch full profile, using register response:', profileError);
            // Continue with the user from register response
          }

          set({
            user: fullUser,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          
          toast.success('Registration successful!');
        } catch (error) {
          set({ isLoading: false });
          const errorMessage = extractErrorMessage(error);
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
          // Continue with local cleanup even if server logout fails
        } finally {
          try {
            // Clear tokens from localStorage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          } catch (storageError) {
            console.error('Failed to clear tokens from localStorage:', storageError);
          }
          
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          
          toast.success('Logged out successfully');
        }
      },

      updateProfile: async (data: Partial<User>) => {
        try {
          const prev = get().user;
          if (!prev) {
            throw new Error('Please login first');
          }
          
          const updatedUser = await authService.updateProfile(data);
          // Merge to preserve fields not returned by updateProfile (e.g., createdAt, enrollment counts)
          const mergedUser = { ...prev, ...updatedUser } as User;
          set({ user: mergedUser });
          toast.success('Profile updated successfully');
        } catch (error) {
          const errorMessage = extractErrorMessage(error);
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }
      },

      fetchProfile: async () => {
        try {
          const user = await authService.getProfile();
          set({ user, isAuthenticated: true });
        } catch (error) {
          // If fetch fails, clear authentication state
          console.error('Profile fetch failed:', error);
          try {
            await get().logout();
          } catch (logoutError) {
            console.error('Failed to logout after profile fetch error:', logoutError);
          }
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile';
          throw new Error(errorMessage);
        }
      },

      setUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;

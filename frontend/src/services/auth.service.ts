import api from './api';
import { User, AuthTokens, LoginCredentials, RegisterData, ApiResponse } from '@/types';
import { extractData } from './response-utils';
import { normalizeUserAssets } from '@/utils/asset-normalizers';

export interface PasswordResetRequestResult {
  devCode?: string;
}

export interface PasswordResetVerificationResult {
  resetToken: string;
}

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

const authService = {
  /**
   * Register a new user
   */
  register: async (data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> => {
    const response = await api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
      '/auth/register',
      data
    );
    const result = extractData(response);
    return {
      ...result,
      user: normalizeUserAssets(result.user) as User,
    };
  },

  /**
   * Login user
   */
  login: async (credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> => {
    const response = await api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
      '/auth/login',
      credentials
    );
    const result = extractData(response);
    return {
      ...result,
      user: normalizeUserAssets(result.user) as User,
    };
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/auth/profile');
    return normalizeUserAssets(extractData(response)) as User;
  },

  /**
   * Update user profile
   */
  updateProfile: async (
    data: Omit<Partial<User>, 'avatar'> & { avatar?: string | null }
  ): Promise<User> => {
    const response = await api.put<ApiResponse<User>>('/auth/profile', data);
    return normalizeUserAssets(extractData(response)) as User;
  },

  /**
   * Change password
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  /**
   * Request password reset code
   */
  requestPasswordReset: async (email: string): Promise<PasswordResetRequestResult> => {
    const response = await api.post<ApiResponse<PasswordResetRequestResult>>(
      '/auth/forgot-password',
      { email }
    );
    return extractData(response);
  },

  /**
   * Verify password reset code
   */
  verifyPasswordResetCode: async (
    email: string,
    code: string
  ): Promise<PasswordResetVerificationResult> => {
    const response = await api.post<ApiResponse<PasswordResetVerificationResult>>(
      '/auth/verify-reset-code',
      { email, code }
    );
    return extractData(response);
  },

  /**
   * Reset password with verified reset token
   */
  resetPassword: async (resetToken: string, newPassword: string): Promise<void> => {
    await api.post('/auth/reset-password', {
      resetToken,
      newPassword,
    });
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  /**
   * Delete current account (Danger Zone)
   */
  deleteAccount: async (): Promise<void> => {
    await api.delete('/auth/account');
  },
};

export default authService;

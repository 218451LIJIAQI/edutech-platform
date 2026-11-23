import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import {
  broadcastClearedAuthSession,
  clearAuthStorage,
  getAccessToken,
  hasRecoverableAuthState,
  storeAccessToken,
} from '@/utils/auth-storage';
import {
  getApiBaseUrl,
  normalizeRequestPath,
  resolveApiRequestUrl,
  shouldAttachAuthHeader,
} from '@/utils/runtime';

export { normalizeRequestPath, resolveApiRequestUrl, shouldAttachAuthHeader };

const API_URL = getApiBaseUrl();
const AUTH_REFRESH_EXEMPT_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/verify-reset-code',
  '/auth/reset-password',
  '/auth/refresh',
]);

let refreshAccessTokenPromise: Promise<string | null> | null = null;
let isRedirectingToLogin = false;

const shouldSkipTokenRefresh = (url?: string): boolean =>
  AUTH_REFRESH_EXEMPT_PATHS.has(normalizeRequestPath(url, API_URL));

const redirectToLogin = () => {
  if (typeof window === 'undefined' || isRedirectingToLogin) {
    return;
  }

  if (window.location.pathname === '/login') {
    return;
  }

  isRedirectingToLogin = true;
  window.location.replace('/login');
};

const clearSessionAndRedirect = () => {
  clearAuthStorage();
  broadcastClearedAuthSession();
  redirectToLogin();
};

interface RefreshTokenResponse {
  data?: {
    accessToken?: string;
  };
}

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshAccessTokenPromise) {
    refreshAccessTokenPromise = (async () => {
      try {
        const response = await axios.post<RefreshTokenResponse>(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const accessToken = response.data?.data?.accessToken;
        if (!accessToken) {
          clearSessionAndRedirect();
          return null;
        }

        storeAccessToken(accessToken);
        return accessToken;
      } catch (refreshError) {
        clearSessionAndRedirect();
        throw refreshError;
      } finally {
        refreshAccessTokenPromise = null;
      }
    })();
  }

  return refreshAccessTokenPromise;
};

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface ExtendedRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface ErrorResponse {
  message?: string;
}

api.interceptors.request.use(
  async (config) => {
    let token = getAccessToken();

    if (
      !token &&
      shouldAttachAuthHeader(config.url, API_URL) &&
      !shouldSkipTokenRefresh(config.url) &&
      hasRecoverableAuthState()
    ) {
      token = await refreshAccessToken().catch(() => null);
    }

    if (token && config.headers && shouldAttachAuthHeader(config.url, API_URL)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorResponse>) => {
    const originalRequest = error.config as ExtendedRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !shouldSkipTokenRefresh(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        if (!accessToken) {
          return Promise.reject(error);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    const status = error.response?.status;
    const errorData = error.response?.data;
    let errorMessage = errorData?.message || 'An error occurred. Please try again.';

    if (status === 429) {
      errorMessage = 'Too many requests. Please wait a moment and try again.';
      toast.error(errorMessage, { duration: 4000 });
    } else if (status === 403) {
      errorMessage = 'You do not have permission to perform this action.';
      toast.error(errorMessage);
    } else if (status === 404) {
      errorMessage = 'The requested resource was not found.';
      toast.error(errorMessage);
    } else if (status === 500) {
      errorMessage = 'Server error. Please try again later.';
      toast.error(errorMessage);
    } else if (status && status !== 400) {
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

export default api;

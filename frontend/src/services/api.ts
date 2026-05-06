import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import {
  broadcastClearedAuthSession,
  clearAuthStorage,
  getAccessToken,
  hasRecoverableAuthState,
  storeAccessToken,
} from '@/utils/auth-storage';
import { getApiBaseUrl } from '@/utils/runtime';

/**
 * Axios instance with base configuration
 */
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
const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//i;
const PROTOCOL_RELATIVE_URL_PATTERN = /^\/\//;

const getRuntimeOrigin = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost';
};

const getApiUrlParts = (): { origin: string; pathname: string } => {
  try {
    const parsedApiUrl = ABSOLUTE_HTTP_URL_PATTERN.test(API_URL)
      ? new URL(API_URL)
      : new URL(API_URL, getRuntimeOrigin());

    return {
      origin: parsedApiUrl.origin,
      pathname: parsedApiUrl.pathname.replace(/\/+$/, '') || '/',
    };
  } catch {
    return {
      origin: getRuntimeOrigin(),
      pathname: '/',
    };
  }
};

const shouldAttachAuthHeader = (url?: string): boolean => {
  if (!url) {
    return true;
  }

  if (PROTOCOL_RELATIVE_URL_PATTERN.test(url.trim())) {
    return false;
  }

  try {
    const requestUrl = ABSOLUTE_HTTP_URL_PATTERN.test(url)
      ? new URL(url)
      : new URL(url, API_URL);
    const apiUrl = getApiUrlParts();
    const apiPathname =
      apiUrl.pathname === '/' ? '/' : `${apiUrl.pathname}/`;
    const requestPathname = requestUrl.pathname.endsWith('/')
      ? requestUrl.pathname
      : `${requestUrl.pathname}/`;

    return (
      requestUrl.origin === apiUrl.origin &&
      requestPathname.startsWith(apiPathname)
    );
  } catch {
    return !ABSOLUTE_HTTP_URL_PATTERN.test(url) && !PROTOCOL_RELATIVE_URL_PATTERN.test(url);
  }
};

const normalizeRequestPath = (url?: string): string => {
  if (!url) {
    return '';
  }

  try {
    return new URL(url, API_URL).pathname;
  } catch {
    // Fall back to the raw request path when URL parsing fails.
  }

  const pathOnly = url.split(/[?#]/, 1)[0] || '';
  return pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
};

const shouldSkipTokenRefresh = (url?: string): boolean =>
  AUTH_REFRESH_EXEMPT_PATHS.has(normalizeRequestPath(url));

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

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshAccessTokenPromise) {
    refreshAccessTokenPromise = (async () => {
      try {
        const response = await axios.post<RefreshTokenResponse>(
          `${API_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
          }
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

/**
 * Extended request config with retry flag
 */
interface ExtendedRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/**
 * Refresh token response type
 */
interface RefreshTokenResponse {
  data?: {
    accessToken?: string;
  };
}

/**
 * Error response type
 */
interface ErrorResponse {
  message?: string;
}

/**
 * Request interceptor to add auth token
 */
api.interceptors.request.use(
  async (config) => {
    let token = getAccessToken();

    if (
      !token &&
      shouldAttachAuthHeader(config.url) &&
      !shouldSkipTokenRefresh(config.url) &&
      hasRecoverableAuthState()
    ) {
      token = await refreshAccessToken().catch(() => null);
    }

    if (token && config.headers && shouldAttachAuthHeader(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle errors globally
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorResponse>) => {
    const originalRequest = error.config as ExtendedRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle token expiration
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

    // Handle other errors
    const status = error.response?.status;
    const errorData = error.response?.data;
    let errorMessage = errorData?.message || 'An error occurred. Please try again.';

    // Customize error messages based on status code
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
      // Don't show toast for validation errors (400 - they're handled in forms)
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

export default api;

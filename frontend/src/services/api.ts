import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import {
  broadcastClearedAuthSession,
  clearAuthStorage,
  createTokenRefreshCoordinator,
  extractBearerToken,
  getAccessToken,
  hasRecoverableAuthState,
  storeAccessToken,
} from '@/utils/auth-storage';
import {
  getApiBaseUrl,
  normalizeRequestPath,
  shouldAttachAuthHeader,
} from '@/utils/runtime';

const API_URL = getApiBaseUrl();
const AUTH_REFRESH_EXEMPT_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/verify-reset-code',
  '/auth/reset-password',
  '/auth/refresh',
]);

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

const refreshCoordinator = createTokenRefreshCoordinator({
  getCurrentToken: getAccessToken,
  setCurrentToken: storeAccessToken,
  performRefreshRequest: async () => {
    const response = await axios.post<RefreshTokenResponse>(
      `${API_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    return response.data?.data?.accessToken ?? null;
  },
  onTerminalAuthFailure: clearSessionAndRedirect,
  extractHttpStatus: (error) =>
    axios.isAxiosError(error) ? error.response?.status : undefined,
});

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
  status?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

export const normalizeErrorResponseData = async (
  data: unknown
): Promise<{ normalizedData: unknown; message?: string }> => {
  if (!data) {
    return { normalizedData: data };
  }

  if (
    typeof Blob !== 'undefined' &&
    data instanceof Blob &&
    data.type.toLowerCase().includes('application/json')
  ) {
    try {
      const parsed = JSON.parse(await data.text()) as ErrorResponse;
      return {
        normalizedData: parsed,
        message: typeof parsed?.message === 'string' ? parsed.message : undefined,
      };
    } catch {
      return { normalizedData: data };
    }
  }

  if (typeof data === 'object') {
    const record = data as ErrorResponse;
    return {
      normalizedData: data,
      message: typeof record.message === 'string' ? record.message : undefined,
    };
  }

  return { normalizedData: data };
};

api.interceptors.request.use(
  async (config) => {
    let token = getAccessToken();

    if (
      !token &&
      shouldAttachAuthHeader(config.url, API_URL) &&
      !shouldSkipTokenRefresh(config.url) &&
      hasRecoverableAuthState()
    ) {
      token = await refreshCoordinator.acquireFreshToken(null).catch(() => null);
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
      !shouldSkipTokenRefresh(originalRequest.url) &&
      hasRecoverableAuthState()
    ) {
      originalRequest._retry = true;
      const failedBearerToken = extractBearerToken(
        originalRequest.headers?.Authorization
      );

      try {
        const accessToken = await refreshCoordinator.acquireFreshToken(
          failedBearerToken
        );
        if (!accessToken) {
          return Promise.reject(error);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    const status = error.response?.status;
    const { normalizedData, message: extractedMessage } =
      await normalizeErrorResponseData(error.response?.data);

    if (error.response && normalizedData && typeof normalizedData === 'object') {
      (error.response as { data: unknown }).data = {
        ...(normalizedData as Record<string, unknown>),
        ...(extractedMessage ? { message: extractedMessage } : {}),
      };
    }

    if (status === 429) {
      toast.error(
        extractedMessage || 'Too many requests. Please wait a moment and try again.',
        { id: 'api-rate-limit', duration: 4000 }
      );
    }

    return Promise.reject(error);
  }
);

export default api;

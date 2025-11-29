import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

/**
 * Axios instance with base configuration
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
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
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
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
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post<RefreshTokenResponse>(
            `${API_URL}/auth/refresh`,
            { refreshToken }
          );

          const accessToken = response.data?.data?.accessToken;
          if (accessToken) {
            localStorage.setItem('accessToken', accessToken);

            // Retry original request
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return api(originalRequest);
            }
          }
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    const status = error.response?.status;
    const errorData = error.response?.data;
    let errorMessage = errorData?.message || 'An error occurred. Please try again.';

    // Determine if we should suppress 404 toast for Community when fallback is enabled
    const reqUrl = originalRequest.url || '';
    const suppressCommunity404 = typeof reqUrl === 'string' && reqUrl.includes('/community/');
    const suppress404Header = 
      originalRequest.headers?.['X-Suppress-404'] || 
      originalRequest.headers?.['x-suppress-404'];
    const suppress404 = suppressCommunity404 || !!suppress404Header;
    
    // Customize error messages based on status code
    if (status === 429) {
      errorMessage = 'Too many requests. Please wait a moment and try again.';
      toast.error(errorMessage, { duration: 4000 });
    } else if (status === 403) {
      errorMessage = 'You do not have permission to perform this action.';
      toast.error(errorMessage);
    } else if (status === 404) {
      errorMessage = 'The requested resource was not found.';
      if (!suppress404) {
        toast.error(errorMessage);
      }
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


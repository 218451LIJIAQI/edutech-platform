import axios, { AxiosInstance, AxiosError } from 'axios';
import toast from 'react-hot-toast';

/**
 * Axios instance with base configuration
 */
const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add auth token
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
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
  async (error: AxiosError<any>) => {
    const originalRequest: any = error.config;

    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
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
    let errorMessage = error.response?.data?.message || 'An error occurred. Please try again.';
    
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


/**
 * Error handling utilities
 * Centralized error handling for the application
 */

import { AxiosError } from 'axios';

/**
 * API Error response shape
 */
interface ApiErrorResponse {
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
}

/**
 * Normalized error object
 */
export interface NormalizedError {
  message: string;
  code: string;
  status: number;
  field?: string;
  originalError: unknown;
}

/**
 * Extract error message from various error types
 */
export const getErrorMessage = (error: unknown): string => {
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle Axios errors
  if (isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    
    // Try different common API error formats
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (data?.errors) {
      const firstError = Object.values(data.errors)[0];
      if (Array.isArray(firstError) && firstError[0]) {
        return firstError[0];
      }
    }
    
    // Network error
    if (error.code === 'ERR_NETWORK') {
      return 'Network error. Please check your internet connection.';
    }
    
    // Timeout
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    
    // HTTP status code fallbacks
    const status = error.response?.status;
    if (status === 401) return 'Please log in to continue.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 404) return 'The requested resource was not found.';
    if (status === 422) return 'Invalid data provided.';
    if (status === 429) return 'Too many requests. Please wait a moment.';
    if (status && status >= 500) return 'Server error. Please try again later.';
    
    return error.message || 'An unexpected error occurred.';
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle objects with message property
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  return 'An unexpected error occurred.';
};

/**
 * Check if error is an Axios error
 */
export const isAxiosError = (error: unknown): error is AxiosError<ApiErrorResponse> => {
  return (error as AxiosError).isAxiosError === true;
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (isAxiosError(error)) {
    return error.code === 'ERR_NETWORK' || !error.response;
  }
  return false;
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error: unknown): boolean => {
  if (isAxiosError(error)) {
    return error.response?.status === 401;
  }
  return false;
};

/**
 * Check if error is a validation error
 */
export const isValidationError = (error: unknown): boolean => {
  if (isAxiosError(error)) {
    return error.response?.status === 400 || error.response?.status === 422;
  }
  return false;
};

/**
 * Get validation errors as a record
 */
export const getValidationErrors = (error: unknown): Record<string, string> => {
  if (!isAxiosError(error)) return {};
  
  const data = error.response?.data as ApiErrorResponse | undefined;
  if (!data?.errors) return {};
  
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(data.errors)) {
    result[field] = Array.isArray(messages) ? messages[0] : String(messages);
  }
  
  return result;
};

/**
 * Normalize any error into a consistent format
 */
export const normalizeError = (error: unknown): NormalizedError => {
  const message = getErrorMessage(error);
  
  if (isAxiosError(error)) {
    return {
      message,
      code: error.code || 'UNKNOWN_ERROR',
      status: error.response?.status || 0,
      originalError: error,
    };
  }
  
  if (error instanceof Error) {
    return {
      message,
      code: error.name || 'ERROR',
      status: 0,
      originalError: error,
    };
  }
  
  return {
    message,
    code: 'UNKNOWN_ERROR',
    status: 0,
    originalError: error,
  };
};

/**
 * Log error with context (for debugging and monitoring)
 */
export const logError = (
  error: unknown,
  context?: Record<string, unknown>
): void => {
  const normalized = normalizeError(error);
  
  // In development, log to console
  if (import.meta.env.DEV) {
    console.group('🚨 Error');
    console.error('Message:', normalized.message);
    console.error('Code:', normalized.code);
    console.error('Status:', normalized.status);
    if (context) console.error('Context:', context);
    console.error('Original:', normalized.originalError);
    console.groupEnd();
  }
  
  // TODO: In production, send to error tracking service (Sentry, etc.)
};

/**
 * Create a user-friendly error message for common scenarios
 */
export const getFriendlyErrorMessage = (error: unknown): string => {
  const message = getErrorMessage(error);
  
  // Map technical errors to user-friendly messages
  const friendlyMessages: Record<string, string> = {
    'Network Error': 'Unable to connect. Please check your internet connection.',
    'Request failed with status code 500': 'Something went wrong on our end. Please try again.',
    'Request failed with status code 503': 'Service temporarily unavailable. Please try again later.',
  };
  
  return friendlyMessages[message] || message;
};

export default {
  getErrorMessage,
  getFriendlyErrorMessage,
  isAxiosError,
  isNetworkError,
  isAuthError,
  isValidationError,
  getValidationErrors,
  normalizeError,
  logError,
};

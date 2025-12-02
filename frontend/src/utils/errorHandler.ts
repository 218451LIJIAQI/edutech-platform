/**
 * Error Handler Utilities
 * Handles API errors and formats them for user-friendly display
 */

import { AxiosError } from 'axios';

/**
 * API Error Response interface
 */
interface ApiErrorResponse {
  status?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Field error map for displaying inline errors
 */
export interface FieldErrors {
  [field: string]: string;
}

/**
 * User-friendly error messages mapping
 * Maps technical error messages to user-friendly versions
 */
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  // Password errors
  'Password must be at least 8 characters long': 'Password must be at least 8 characters',
  'Password must contain at least one uppercase letter, one lowercase letter, and one number': 'Password must contain uppercase, lowercase, and a number',
  'Password must be a string': 'Please enter a valid password',
  'Password is required': 'Password is required',
  
  // Email errors
  'Please provide a valid email address': 'Please enter a valid email address',
  'Invalid email address': 'Invalid email address format',
  'Email already exists': 'This email is already registered',
  'Email is already registered': 'This email is already registered',
  
  // Name errors
  'First name is required': 'First name is required',
  'First name must be between 2 and 50 characters': 'First name must be 2-50 characters',
  'Last name is required': 'Last name is required',
  'Last name must be between 2 and 50 characters': 'Last name must be 2-50 characters',
  
  // Auth errors
  'Invalid credentials': 'Invalid email or password',
  'Invalid email or password': 'Invalid email or password',
  'User not found': 'User not found',
  'Account is disabled': 'Account is disabled',
  'Account is locked': 'Account is locked',
  
  // Token errors
  'Token expired': 'Session expired, please login again',
  'Invalid token': 'Invalid session, please login again',
  'Refresh token is required': 'Please login again',
  
  // General errors
  'Validation failed': 'Please check your input',
  'Internal server error': 'Server error, please try again later',
  'Network Error': 'Network connection failed',
  'Too many requests': 'Too many requests, please wait',
  
  // Course errors
  'Course not found': 'Course not found',
  'Already enrolled': 'You are already enrolled in this course',
  'Course is not available': 'Course is not available',
  
  // Payment errors
  'Payment failed': 'Payment failed, please try again',
  'Insufficient balance': 'Insufficient balance',
  'Invalid payment method': 'Invalid payment method',
  
  // Profile errors
  'Current password is incorrect': 'Current password is incorrect',
  'New password must be different from current password': 'New password must be different',
  'Avatar must be a valid URL': 'Invalid avatar URL format',
};

/**
 * Translate error message to user-friendly message
 */
export function translateErrorMessage(message: string): string {
  // Check for exact match first
  if (USER_FRIENDLY_MESSAGES[message]) {
    return USER_FRIENDLY_MESSAGES[message];
  }
  
  // Check for partial match
  for (const [key, value] of Object.entries(USER_FRIENDLY_MESSAGES)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Return original message if no translation found
  return message;
}

/**
 * Extract and format error message from API error response
 */
export function extractErrorMessage(error: unknown): string {
  // Handle AxiosError
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const responseData = axiosError.response?.data;
    
    if (responseData) {
      // If there are field-specific errors, combine them
      if (responseData.errors && typeof responseData.errors === 'object') {
        const errorMessages: string[] = [];
        
        for (const messages of Object.values(responseData.errors)) {
          if (Array.isArray(messages)) {
            messages.forEach(msg => {
              const translated = translateErrorMessage(msg);
              if (!errorMessages.includes(translated)) {
                errorMessages.push(translated);
              }
            });
          }
        }
        
        if (errorMessages.length > 0) {
          return errorMessages.join('; ');
        }
      }
      
      // If there's a message, translate it
      if (responseData.message) {
        return translateErrorMessage(responseData.message);
      }
    }
    
    // Handle network errors
    if (axiosError.message === 'Network Error') {
      return 'Network connection failed, please check your network';
    }
    
    return translateErrorMessage(axiosError.message || 'Request failed, please try again');
  }
  
  // Handle standard Error
  if (error instanceof Error) {
    return translateErrorMessage(error.message);
  }
  
  // Handle string error
  if (typeof error === 'string') {
    return translateErrorMessage(error);
  }
  
  return 'Operation failed, please try again';
}

/**
 * Extract field-specific errors from API error response
 */
export function extractFieldErrors(error: unknown): FieldErrors {
  const fieldErrors: FieldErrors = {};
  
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const responseData = axiosError.response?.data;
    
    if (responseData?.errors && typeof responseData.errors === 'object') {
      for (const [field, messages] of Object.entries(responseData.errors)) {
        if (Array.isArray(messages) && messages.length > 0) {
          // Take the first error message for each field
          fieldErrors[field] = translateErrorMessage(messages[0]);
        }
      }
    }
  }
  
  return fieldErrors;
}

/**
 * Check if error is a validation error (400)
 */
export function isValidationError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError;
    return axiosError.response?.status === 400;
  }
  return false;
}

/**
 * Check if error is an authentication error (401)
 */
export function isAuthError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError;
    return axiosError.response?.status === 401;
  }
  return false;
}

/**
 * Check if error is a forbidden error (403)
 */
export function isForbiddenError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError;
    return axiosError.response?.status === 403;
  }
  return false;
}

/**
 * Create a user-friendly error object from API error
 */
export class ApiError extends Error {
  public fieldErrors: FieldErrors;
  public statusCode: number | undefined;
  
  constructor(error: unknown) {
    const message = extractErrorMessage(error);
    super(message);
    this.name = 'ApiError';
    this.fieldErrors = extractFieldErrors(error);
    
    if (error && typeof error === 'object' && 'isAxiosError' in error) {
      const axiosError = error as AxiosError;
      this.statusCode = axiosError.response?.status;
    }
  }
}

export default {
  extractErrorMessage,
  extractFieldErrors,
  translateErrorMessage,
  isValidationError,
  isAuthError,
  isForbiddenError,
  ApiError,
};

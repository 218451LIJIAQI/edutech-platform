/**
 * Error Handler Utilities
 * Handles API errors and formats them for user-friendly display
 */

import type { AxiosError } from 'axios';

/**
 * API Error Response interface
 */
interface ApiErrorResponse {
  status?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

interface ErrorWithResponseData {
  response?: {
    data?: ApiErrorResponse;
  };
}

/**
 * Field error map for displaying inline errors
 */
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
  'Invalid or expired password reset code': 'Invalid or expired verification code',
  'Invalid or expired password reset session': 'Your reset session expired, please request a new code',
  'Verification code is required': 'Verification code is required',
  'Verification code must be exactly 6 digits': 'Enter the 6-digit verification code',
  'Password reset token is required': 'Your reset session expired, please request a new code',
  'Your account is temporarily locked. Please try again later': 'Your account is temporarily locked. Please try again later',
  'Avatar must be a valid URL': 'Invalid avatar URL format',
};

/**
 * Translate error message to user-friendly message
 */
function translateErrorMessage(message: string): string {
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
 * Extract field-level validation errors for inline form display
 */
export function extractFieldErrors(error: unknown): Record<string, string> {
  const responseData =
    error && typeof error === 'object' && 'response' in error
      ? (error as ErrorWithResponseData).response?.data
      : undefined;

  if (!responseData?.errors || typeof responseData.errors !== 'object') {
    return {};
  }

  const fieldErrors: Record<string, string> = {};

  Object.entries(responseData.errors).forEach(([field, messages]) => {
    if (Array.isArray(messages) && messages.length > 0) {
      fieldErrors[field] = translateErrorMessage(messages[0]);
    }
  });

  return fieldErrors;
}

/**
 * Extract and format error message from API error response
 */
export function extractErrorMessage(
  error: unknown,
  fallback = 'Operation failed, please try again'
): string {
  const responseData =
    error && typeof error === 'object' && 'response' in error
      ? (error as ErrorWithResponseData).response?.data
      : undefined;

  if (responseData) {
    // If there are field-specific errors, combine them
    const fieldErrors = extractFieldErrors(error);
    if (Object.keys(fieldErrors).length > 0) {
      const errorMessages = Object.values(fieldErrors);

      if (errorMessages.length > 0) {
        return errorMessages.join('; ');
      }
    }

    // If there's a message, translate it
    if (responseData.message) {
      return translateErrorMessage(responseData.message);
    }
  }

  // Handle AxiosError
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    // Handle network errors
    if (axiosError.message === 'Network Error') {
      return 'Network connection failed, please check your network';
    }

    return translateErrorMessage(axiosError.message || fallback);
  }

  // Handle standard Error
  if (error instanceof Error) {
    return translateErrorMessage(error.message || fallback);
  }

  // Handle string error
  if (typeof error === 'string') {
    return translateErrorMessage(error);
  }

  return fallback;
}

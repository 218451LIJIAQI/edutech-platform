/**
 * Utility Functions Index
 * Central export point for all utility functions
 */

// Helper functions
export {
  formatCurrency,
  formatDate,
  formatDuration,
  debounce,
  generateId,
  capitalize,
  formatTime,
} from './helpers';

// Error handling
export {
  extractErrorMessage,
  extractFieldErrors,
  translateErrorMessage,
  isValidationError,
  isAuthError,
  isForbiddenError,
  ApiError,
  type FieldErrors,
} from './errorHandler';

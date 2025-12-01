/**
 * Utility Functions Index
 * Central export point for all utility functions
 */

// Helper functions
export {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  truncateText,
  getInitials,
  formatDuration,
  isValidEmail,
  getRatingStars,
  calculateReadingTime,
  sleep,
  debounce,
  cn,
  formatFileSize,
  generateId,
  capitalize,
  formatNumber,
  formatCompactNumber,
  isEmpty,
  clamp,
  formatTime,
  formatDateTime,
  copyToClipboard,
  pluralize,
} from './helpers';

// Storage utilities
export { default as storage, session, withExpiry, isStorageAvailable } from './storage';

// Validation utilities (excluding isValidEmail which is in helpers)
export {
  checkPasswordStrength,
  isValidPhone,
  isValidUrl,
  isValidCreditCard,
  detectCardType,
  isRequired,
  minLength,
  maxLength,
  isInRange,
  isPositive,
  isInteger,
  isValidDate,
  isFutureDate,
  isPastDate,
  isMinimumAge,
  isValidUsername,
  isValidSlug,
  isValidFileSize,
  isValidFileType,
  doesMatch,
  validate,
  createValidators,
} from './validation';
export type { PasswordStrength, CardType, ValidationResult, Validator } from './validation';

// Error handling
export {
  getErrorMessage,
  getFriendlyErrorMessage,
  isAxiosError,
  isNetworkError,
  isAuthError,
  isValidationError,
  getValidationErrors,
  normalizeError,
  logError,
} from './errorHandler';
export type { NormalizedError } from './errorHandler';

// Toast utilities
export { default as toast } from './toast';

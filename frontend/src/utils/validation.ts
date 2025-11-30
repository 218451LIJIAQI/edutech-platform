/**
 * Validation utility functions
 * Comprehensive validation helpers for forms and data
 */

/**
 * Email validation with RFC 5322 compatible regex
 */
export const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
};

/**
 * Password strength validation
 * Returns an object with strength score and feedback
 */
export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  feedback: string[];
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) score++;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else feedback.push('Use both uppercase and lowercase letters');

  if (/\d/.test(password)) score++;
  else feedback.push('Include at least one number');

  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;
  else feedback.push('Include at least one special character');

  const labels: PasswordStrength['label'][] = [
    'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'
  ];

  return {
    score: Math.min(score, 4) as PasswordStrength['score'],
    label: labels[Math.min(score, 4)],
    feedback,
  };
};

/**
 * Phone number validation (international format)
 */
export const isValidPhone = (phone: string): boolean => {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Check for valid international phone format
  const regex = /^\+?[1-9]\d{1,14}$/;
  return regex.test(cleaned);
};

/**
 * URL validation
 */
export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Credit card number validation (Luhn algorithm)
 */
export const isValidCreditCard = (number: string): boolean => {
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length < 13 || cleaned.length > 19) return false;

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

/**
 * Detect credit card type from number
 */
export type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

export const detectCardType = (number: string): CardType => {
  const cleaned = number.replace(/\D/g, '');
  
  if (/^4/.test(cleaned)) return 'visa';
  if (/^5[1-5]/.test(cleaned)) return 'mastercard';
  if (/^3[47]/.test(cleaned)) return 'amex';
  if (/^6(?:011|5)/.test(cleaned)) return 'discover';
  
  return 'unknown';
};

/**
 * Required field validation
 */
export const isRequired = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * Minimum length validation
 */
export const minLength = (value: string, min: number): boolean => {
  return value.trim().length >= min;
};

/**
 * Maximum length validation
 */
export const maxLength = (value: string, max: number): boolean => {
  return value.trim().length <= max;
};

/**
 * Number range validation
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Positive number validation
 */
export const isPositive = (value: number): boolean => {
  return value > 0;
};

/**
 * Integer validation
 */
export const isInteger = (value: number): boolean => {
  return Number.isInteger(value);
};

/**
 * Date validation (checks if date is valid)
 */
export const isValidDate = (date: string | Date): boolean => {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
};

/**
 * Future date validation
 */
export const isFutureDate = (date: string | Date): boolean => {
  const parsed = new Date(date);
  return parsed.getTime() > Date.now();
};

/**
 * Past date validation
 */
export const isPastDate = (date: string | Date): boolean => {
  const parsed = new Date(date);
  return parsed.getTime() < Date.now();
};

/**
 * Age validation (minimum age requirement)
 */
export const isMinimumAge = (birthDate: string | Date, minAge: number): boolean => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age >= minAge;
};

/**
 * Username validation (alphanumeric with underscores)
 */
export const isValidUsername = (username: string): boolean => {
  const regex = /^[a-zA-Z0-9_]{3,30}$/;
  return regex.test(username);
};

/**
 * Slug validation (URL-friendly string)
 */
export const isValidSlug = (slug: string): boolean => {
  const regex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return regex.test(slug);
};

/**
 * File size validation
 */
export const isValidFileSize = (sizeInBytes: number, maxSizeMB: number): boolean => {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return sizeInBytes <= maxBytes;
};

/**
 * File type validation
 */
export const isValidFileType = (
  mimeType: string,
  allowedTypes: string[]
): boolean => {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      // Handle wildcard types like 'image/*'
      const baseType = type.replace('/*', '');
      return mimeType.startsWith(baseType);
    }
    return mimeType === type;
  });
};

/**
 * Match validation (for confirm password, etc.)
 */
export const doesMatch = (value1: string, value2: string): boolean => {
  return value1 === value2;
};

/**
 * Create a validation chain
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export type Validator = (value: unknown) => string | null;

export const validate = (value: unknown, validators: Validator[]): ValidationResult => {
  const errors: string[] = [];
  
  for (const validator of validators) {
    const error = validator(value);
    if (error) errors.push(error);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Common validator factories
 */
export const createValidators = {
  required: (message = 'This field is required'): Validator => 
    (value) => isRequired(value) ? null : message,
    
  email: (message = 'Invalid email address'): Validator =>
    (value) => isValidEmail(String(value)) ? null : message,
    
  minLength: (min: number, message?: string): Validator =>
    (value) => minLength(String(value), min) ? null : (message || `Minimum ${min} characters required`),
    
  maxLength: (max: number, message?: string): Validator =>
    (value) => maxLength(String(value), max) ? null : (message || `Maximum ${max} characters allowed`),
    
  phone: (message = 'Invalid phone number'): Validator =>
    (value) => isValidPhone(String(value)) ? null : message,
    
  url: (message = 'Invalid URL'): Validator =>
    (value) => isValidUrl(String(value)) ? null : message,
};

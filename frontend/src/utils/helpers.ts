/**
 * Utility helper functions for the FlexiLearn Platform
 */

const toSafeFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number(value ?? fallback);

  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Round a currency value to 2 decimal places safely without -0 drift.
 */
export const roundCurrency = (value: unknown): number => {
  const safeValue = toSafeFiniteNumber(value, 0);
  const rounded = Math.round((safeValue + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
};

/**
 * Format a numeric or string value as currency with 2 decimal places.
 * Safely defaults non-finite inputs to 0.
 */
export const formatCurrency = (
  amount?: unknown,
  currency: string = 'USD'
): string => {
  const safeValue = roundCurrency(amount);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
};

/**
 * Format a date to a readable string, returning 'N/A' for invalid dates.
 */
export const formatDate = (date?: string | Date | null): string => {
  if (!date) {
    return 'N/A';
  }

  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed);
};

/**
 * Format duration from minutes to human-readable format
 */
export const formatDuration = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.round(toSafeFiniteNumber(minutes, 0)));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

/**
 * Format byte counts into human-readable KB / MB labels.
 */
export const formatFileSize = (bytes?: number | null): string => {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }

  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) {
    return `${megabytes.toFixed(megabytes >= 10 ? 1 : 2)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/**
 * Normalize an array or JSON-serialized string array into trimmed non-empty strings.
 */
export const parseStringArray = (
  value: unknown,
  options: { allowSingleStringFallback?: boolean } = {}
): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    if (/^[\[{]/.test(trimmed)) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed)
          ? parseStringArray(parsed)
          : [];
      } catch {
        return options.allowSingleStringFallback ? [trimmed] : [];
      }
    }

    return options.allowSingleStringFallback ? [trimmed] : [];
  }

  return [];
};

const EMAIL_VALIDATION_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

/**
 * Validate standard email address format after trimming whitespace.
 */
export const isValidEmail = (value: string): boolean =>
  EMAIL_VALIDATION_REGEX.test(value.trim());

/**
 * Check whether a password includes uppercase, lowercase, and numeric characters.
 */
export const hasStrongPasswordComplexity = (value: string): boolean =>
  STRONG_PASSWORD_REGEX.test(value);

/**
 * Resolve the default workspace landing route for an authenticated user role.
 */
export const getHomePathForRole = (role?: string | null): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'TEACHER':
      return '/teacher';
    case 'STUDENT':
      return '/student';
    default:
      return '/';
  }
};

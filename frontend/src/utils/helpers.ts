/**
 * Utility helper functions for the FlexiLearn Platform
 */

/**
 * Format a numeric or string value as currency with 2 decimal places.
 * Safely defaults non-finite inputs to 0.
 */
export const formatCurrency = (
  amount?: unknown,
  currency: string = 'USD'
): string => {
  const numericValue =
    typeof amount === 'number'
      ? amount
      : typeof amount === 'string'
        ? Number(amount.trim())
        : Number(amount ?? 0);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
};

/**
 * Format a date to a readable string
 * @param date - The date to format
 * @returns Formatted date string (e.g., "January 1, 2024")
 */
export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

/**
 * Format duration from minutes to human-readable format
 * @param minutes - Duration in minutes
 * @returns Formatted duration string (e.g., "2h 30m")
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

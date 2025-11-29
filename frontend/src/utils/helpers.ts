/**
 * Utility helper functions for the Edutech Platform
 */

/**
 * Format a number as currency with proper locale and symbol
 * @param amount - The amount to format
 * @param currency - The currency code (default: 'USD')
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
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
 * Format a date as relative time (e.g., "2 hours ago")
 * @param date - The date to format
 * @returns Relative time string
 */
export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return formatDate(date);
};

/**
 * Truncate text to a maximum length and add ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Get initials from first and last name
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @returns Two-letter initials in uppercase
 */
export const getInitials = (firstName?: string, lastName?: string): string => {
  const firstInitial = firstName?.trim().charAt(0) || '';
  const lastInitial = lastName?.trim().charAt(0) || '';
  return `${firstInitial}${lastInitial}`.toUpperCase();
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

/**
 * Validate email format using regex
 * @param email - Email address to validate
 * @returns True if email format is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Get rating stars representation
 * @param rating - Rating value (0-5)
 * @returns String of stars (★ for full, ☆ for empty)
 */
export const getRatingStars = (rating: number): string => {
  const clampedRating = Math.max(0, Math.min(5, rating));
  const fullStars = Math.floor(clampedRating);
  const hasHalfStar = clampedRating % 1 >= 0.5;
  
  let stars = '★'.repeat(fullStars);
  if (hasHalfStar) stars += '☆';
  const remainingStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  stars += '☆'.repeat(remainingStars);
  
  return stars;
};

/**
 * Calculate reading time for text content
 * @param text - The text to calculate reading time for
 * @returns Estimated reading time in minutes
 */
export const calculateReadingTime = (text: string): number => {
  const wordsPerMinute = 200;
  const trimmedText = text.trim();
  if (!trimmedText) return 0;
  const words = trimmedText.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};

/**
 * Delay execution for specified milliseconds
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Debounce a function to delay execution until after wait ms of inactivity
 * @param func - Function to debounce
 * @param wait - Milliseconds to wait before executing
 * @returns Debounced function
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Combine class names conditionally (clsx alternative)
 * @param classes - Array of class names or falsy values
 * @returns Combined class name string
 */
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};


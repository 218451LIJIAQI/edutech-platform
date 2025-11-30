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

/**
 * Format file size to human readable string
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Generate a unique ID
 * @param prefix - Optional prefix for the ID
 * @returns Unique string ID
 */
export const generateId = (prefix = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Capitalize the first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Format number with thousand separators
 * @param num - Number to format
 * @returns Formatted number string (e.g., "1,234,567")
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Format number as compact (e.g., 1.2K, 3.4M)
 * @param num - Number to format
 * @returns Compact number string
 */
export const formatCompactNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param value - Value to check
 * @returns True if empty
 */
export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Clamp a number between min and max values
 * @param num - Number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped number
 */
export const clamp = (num: number, min: number, max: number): number => {
  return Math.min(Math.max(num, min), max);
};

/**
 * Format date to time string (e.g., "2:30 PM")
 * @param date - Date to format
 * @returns Formatted time string
 */
export const formatTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
};

/**
 * Format date and time together
 * @param date - Date to format
 * @returns Formatted date and time string
 */
export const formatDateTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
};

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves when copied
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/**
 * Pluralize a word based on count
 * @param count - The count
 * @param singular - Singular form
 * @param plural - Plural form (optional, defaults to singular + 's')
 * @returns Pluralized string with count
 */
export const pluralize = (count: number, singular: string, plural?: string): string => {
  const word = count === 1 ? singular : (plural || `${singular}s`);
  return `${count} ${word}`;
};


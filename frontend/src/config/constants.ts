/**
 * Application Constants
 * Central configuration for the Edutech Platform
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Authentication
export const AUTH_CONFIG = {
  TOKEN_KEY: 'accessToken',
  REFRESH_TOKEN_KEY: 'refreshToken',
  USER_KEY: 'user',
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  LIMITS: [10, 20, 50, 100],
  MAX_LIMIT: 100,
} as const;

// File Upload
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_VIDEO_SIZE: 500 * 1024 * 1024, // 500MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

// Toast Notifications
export const TOAST_CONFIG = {
  DURATION: {
    SUCCESS: 3000,
    ERROR: 4000,
    INFO: 3000,
    WARNING: 4000,
  },
  MAX_VISIBLE: 3,
} as const;

// Animation Durations (in ms)
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  PAGE_TRANSITION: 200,
} as const;

// Breakpoints (matches Tailwind defaults)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// Input Validation
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 5000,
  TITLE_MAX_LENGTH: 200,
  EMAIL_MAX_LENGTH: 254,
  PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
  URL_REGEX: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
} as const;

// Course Types
export const COURSE_TYPES = {
  LIVE: 'live',
  RECORDED: 'recorded',
  HYBRID: 'hybrid',
} as const;

// User Roles
export const USER_ROLES = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN',
} as const;

// Order Statuses
export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
} as const;

// Ticket Statuses
export const TICKET_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

// Date Formats (for date-fns or native Intl)
export const DATE_FORMATS = {
  DISPLAY: 'MMMM d, yyyy',
  SHORT: 'MMM d, yyyy',
  ISO: 'yyyy-MM-dd',
  TIME: 'h:mm a',
  DATETIME: 'MMM d, yyyy h:mm a',
  FULL: 'EEEE, MMMM d, yyyy',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'edutech_theme',
  LANGUAGE: 'edutech_language',
  RECENT_SEARCHES: 'edutech_recent_searches',
  CART: 'edutech_cart',
  PREFERENCES: 'edutech_preferences',
} as const;

// Cache Durations (in ms)
export const CACHE_DURATION = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  DAY: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  COURSES: '/courses',
  TEACHERS: '/teachers',
  HELP: '/help',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  PROFILE: '/profile',
  MESSAGES: '/messages',
  COMMUNITY: '/community',
  
  // Student Routes
  STUDENT: {
    DASHBOARD: '/student',
    COURSES: '/student/courses',
    ORDERS: '/orders',
    CART: '/cart',
    REPORTS: '/student/reports',
  },
  
  // Teacher Routes
  TEACHER: {
    DASHBOARD: '/teacher',
    COURSES: '/teacher/courses',
    CREATE_COURSE: '/teacher/courses/new',
    STUDENTS: '/teacher/students',
    WALLET: '/teacher/wallet',
    VERIFICATION: '/teacher/verification',
  },
  
  // Admin Routes
  ADMIN: {
    DASHBOARD: '/admin',
    USERS: '/admin/users',
    COURSES: '/admin/courses',
    REPORTS: '/admin/reports',
    REFUNDS: '/admin/refunds',
    SUPPORT: '/admin/support',
    FINANCIALS: '/admin/financials',
    VERIFICATION: '/admin/verification-teachers',
  },
} as const;

// Social Links (example)
export const SOCIAL_LINKS = {
  TWITTER: 'https://twitter.com/edutech',
  FACEBOOK: 'https://facebook.com/edutech',
  INSTAGRAM: 'https://instagram.com/edutech',
  LINKEDIN: 'https://linkedin.com/company/edutech',
  YOUTUBE: 'https://youtube.com/@edutech',
} as const;

// Support Contact
export const SUPPORT = {
  EMAIL: 'support@edutech.com',
  PHONE: '+1 (555) 123-4567',
  HOURS: 'Mon-Fri 9AM-6PM EST',
} as const;

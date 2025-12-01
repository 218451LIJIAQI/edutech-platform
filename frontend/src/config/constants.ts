/**
 * Application Constants
 * Central configuration for the Edutech Platform
 */

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  LIMITS: [10, 20, 50, 100],
  MAX_LIMIT: 100,
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


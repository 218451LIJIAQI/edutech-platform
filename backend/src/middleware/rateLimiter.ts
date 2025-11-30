import rateLimit from 'express-rate-limit';
import config from '../config/env';

/**
 * Enhanced Rate Limiting
 * Provides granular rate limiting for different endpoint types
 */

const isDev = config.IS_DEV;
const isLocalIp = (ip?: string) => ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';

/**
 * General API rate limiter
 * Applied to all /api routes
 */
export const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS, // 15 minutes by default
  max: isDev ? 1000 : config.RATE_LIMIT_MAX_REQUESTS, // Much higher limit in development
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { status: 'error', message: 'Too many requests from this IP, please try again later.' },
  skip: (req) => isDev && isLocalIp(req.ip), // Skip for localhost in dev
});

/**
 * Stricter rate limiter for authentication endpoints
 * Prevents brute force attacks on login
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 50 : 5, // 5 attempts per 15 minutes in production
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many login attempts, please try again later.' },
});

/**
 * Rate limiter for password reset requests
 * Very strict to prevent email flooding
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 20 : 3, // 3 attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many password reset requests. Please try again later.' },
});

/**
 * Rate limiter for registration
 * Prevents mass account creation
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 50 : 5, // 5 registrations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many accounts created from this IP. Please try again later.' },
});

/**
 * Rate limiter for file uploads
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 100 : 20, // 20 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many upload requests, please try again later.' },
});

/**
 * Rate limiter for payment endpoints
 * Critical endpoints need extra protection
 */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 100 : 30, // 30 payment attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many payment requests. Please try again later.' },
});

/**
 * Rate limiter for sensitive operations
 * (password change, account deletion, etc.)
 */
export const sensitiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 50 : 10, // 10 attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests for this sensitive operation. Please try again later.' },
});

/**
 * Rate limiter for search endpoints
 * Prevents search abuse
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 100 : 30, // 30 searches per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many search requests. Please slow down.' },
});

/**
 * Rate limiter for community posts
 * Prevents spam
 */
export const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 100 : 20, // 20 posts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many posts. Please try again later.' },
});

/**
 * Rate limiter for messages
 * Prevents message spam
 */
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 100 : 60, // 60 messages per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many messages. Please slow down.' },
});

/**
 * Strict rate limiter for admin operations
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 500 : 100, // 100 operations per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many admin operations. Please try again later.' },
});

export default {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  registrationLimiter,
  uploadLimiter,
  paymentLimiter,
  sensitiveOperationLimiter,
  searchLimiter,
  postLimiter,
  messageLimiter,
  adminLimiter,
};

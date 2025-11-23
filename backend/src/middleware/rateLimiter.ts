import rateLimit from 'express-rate-limit';
import config from '../config/env';

/**
 * General API rate limiter
 * In development mode, we use much more relaxed limits
 */
export const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS, // 15 minutes by default
  max: config.NODE_ENV === 'development' ? 1000 : config.RATE_LIMIT_MAX_REQUESTS, // Much higher limit in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for development if needed
    return config.NODE_ENV === 'development' && req.ip === '::1'; // Skip for localhost in dev
  },
});

/**
 * Stricter rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === 'development' ? 50 : 5, // More attempts allowed in development
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Rate limiter for file uploads
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.NODE_ENV === 'development' ? 100 : 20, // More uploads allowed in development
  message: 'Too many upload requests, please try again later.',
});

export default {
  apiLimiter,
  authLimiter,
  uploadLimiter,
};


import rateLimit from 'express-rate-limit';
import config from '../config/env';

/**
 * General API rate limiter
 * In development mode, we use much more relaxed limits
 */
const isDev = config.IS_DEV;
const isLocalIp = (ip?: string) => ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';

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
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 50 : 5, // More attempts allowed in development
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many login attempts, please try again later.' },
});

/**
 * Rate limiter for file uploads
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 100 : 20, // More uploads allowed in development
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many upload requests, please try again later.' },
});

export default {
  apiLimiter,
  authLimiter,
  uploadLimiter,
};

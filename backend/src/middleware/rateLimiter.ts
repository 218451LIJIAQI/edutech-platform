import rateLimit from 'express-rate-limit';
import config from '../config/env';

const isDev = config.IS_DEV;
const isLocalIp = (ip?: string) => ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: isDev ? 1000 : config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests, please try again later.' },
  skip: (req) => isDev && isLocalIp(req.ip),
});

/**
 * Auth rate limiter (for login/register)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50 : 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many login attempts, please try again later.' },
});

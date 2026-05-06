import rateLimit from "express-rate-limit";

import config from "../config/env";

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

const isDev = config.IS_DEV;

const LOCAL_IPS = new Set([
  "::1",
  "127.0.0.1",
  "::ffff:127.0.0.1",
  "localhost",
]);

const isLocalIp = (ip?: string): boolean => {
  return Boolean(ip && LOCAL_IPS.has(ip));
};

const shouldSkipLocalDevRequest = (ip?: string): boolean => {
  return isDev && isLocalIp(ip);
};

const createRateLimitMessage = (message: string) => ({
  status: "error",
  message,
});

/**
 * General API rate limiter.
 *
 * This protects the application from excessive API requests and basic request flooding.
 * Localhost requests are skipped in development to avoid interrupting testing.
 */
export const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: isDev ? 1000 : config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: createRateLimitMessage("Too many requests, please try again later."),
  skip: (req) => shouldSkipLocalDevRequest(req.ip),
});

/**
 * Authentication rate limiter.
 *
 * This applies stricter limits to sensitive authentication endpoints such as
 * login, registration, password reset, and verification requests.
 * Successful responses are counted because some endpoints intentionally return
 * generic 200 responses to avoid account enumeration.
 */
export const authLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_IN_MS,
  max: isDev ? 50 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: createRateLimitMessage(
    "Too many authentication attempts, please try again later.",
  ),
  skip: (req) => shouldSkipLocalDevRequest(req.ip),
});

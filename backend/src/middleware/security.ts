import { Request, Response, NextFunction } from 'express';
import sanitizeHtml from 'sanitize-html';
import config from '../config/env';

/**
 * Security Middleware
 * Provides XSS protection and input sanitization
 */

// Sanitize options - allow no HTML by default
const defaultSanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
};

/**
 * Recursively sanitize an object's string values
 */
const sanitizeObject = (obj: unknown, options: sanitizeHtml.IOptions = defaultSanitizeOptions): unknown => {
  if (typeof obj === 'string') {
    return sanitizeHtml(obj, options);
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value, options);
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * XSS Protection Middleware
 * Sanitizes all string inputs in request body
 */
export const xssProtection = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query) as typeof req.query;
  }
  
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params) as typeof req.params;
  }
  
  next();
};

/**
 * Additional security headers middleware
 * Supplements Helmet with additional headers
 */
export const additionalSecurityHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Strict Transport Security (HSTS) - only in production with HTTPS
  if (config.IS_PROD) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection (legacy, but still useful)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
};

export default {
  xssProtection,
  additionalSecurityHeaders,
};

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

// Less strict options for fields that might contain formatted text
const richTextSanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
  },
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
 * Rich text sanitization middleware for specific routes
 * Use this for routes that accept HTML content (like course descriptions)
 */
export const richTextSanitization = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body, richTextSanitizeOptions);
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

/**
 * SQL Injection basic protection
 * Note: Prisma ORM already provides protection, but this adds an extra layer
 */
export const sqlInjectionProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|\||;|\/\*|\*\/)/g,
  ];
  
  const checkValue = (value: unknown): boolean => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some((pattern) => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(checkValue);
    }
    if (value && typeof value === 'object') {
      return Object.values(value).some(checkValue);
    }
    return false;
  };
  
  // Only check in strict mode - might cause false positives
  const strictMode = process.env.SQL_INJECTION_STRICT === 'true';
  
  if (strictMode && (checkValue(req.body) || checkValue(req.query) || checkValue(req.params))) {
    res.status(400).json({
      status: 'error',
      message: 'Invalid input detected',
    });
    return;
  }
  
  next();
};

export default {
  xssProtection,
  richTextSanitization,
  additionalSecurityHeaders,
  sqlInjectionProtection,
};

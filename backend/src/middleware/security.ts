import type { Request, Response, NextFunction, RequestHandler } from "express";
import sanitizeHtml from "sanitize-html";

import config from "../config/env";
import { ValidationError } from "../utils/errors";

/**
 * Security middleware.
 *
 * Provides basic XSS protection, input sanitization, and additional security headers.
 */

// Dangerous object keys that should never be copied from user input.
// This helps reduce prototype pollution risks.
const BLOCKED_KEYS = new Set([
  "__definegetter__",
  "__definesetter__",
  "__lookupgetter__",
  "__lookupsetter__",
  "__proto__",
  "constructor",
  "prototype",
]);

// Credential-like fields should be validated by their own handlers, not mutated
// by generic HTML sanitization.
const RAW_VALUE_KEYS = new Set([
  "password",
  "currentpassword",
  "newpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "resettoken",
  "authorization",
]);

const MAX_SANITIZE_DEPTH = 20;

const defaultSanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "discard",
  enforceHtmlBoundary: true,
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !Buffer.isBuffer(value)
  );
};

const normalizeKey = (key: string): string => {
  return key.toLowerCase().replace(/[_-]/g, "");
};

const normalizeObjectKey = (key: string): string => {
  return key.toLowerCase();
};

/**
 * Recursively sanitizes string values in arrays and plain objects.
 *
 * Non-string primitive values are returned unchanged.
 * Date and Buffer values are preserved.
 * Dangerous keys are skipped to reduce prototype pollution risks.
 */
const sanitizeValue = (
  value: unknown,
  options: sanitizeHtml.IOptions = defaultSanitizeOptions,
  depth = 0,
): unknown => {
  if (depth > MAX_SANITIZE_DEPTH) {
    throw new ValidationError("Request payload is too deeply nested");
  }

  if (typeof value === "string") {
    return sanitizeHtml(value, options).trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, options, depth + 1));
  }

  if (isPlainObject(value)) {
    const sanitizedObject: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (BLOCKED_KEYS.has(normalizeObjectKey(key))) {
        continue;
      }

      if (RAW_VALUE_KEYS.has(normalizeKey(key))) {
        sanitizedObject[key] = nestedValue;
        continue;
      }

      sanitizedObject[key] = sanitizeValue(nestedValue, options, depth + 1);
    }

    return sanitizedObject;
  }

  return value;
};

const replaceRequestValue = <K extends keyof Request>(
  req: Request,
  key: K,
  value: Request[K],
): void => {
  Object.defineProperty(req, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
};

/**
 * XSS protection middleware.
 *
 * Sanitizes string input from request body, query, and route params.
 * By default, all HTML tags and attributes are removed.
 */
export const xssProtection: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.body && typeof req.body === "object") {
    replaceRequestValue(req, "body", sanitizeValue(req.body) as Request["body"]);
  }

  if (req.query && typeof req.query === "object") {
    replaceRequestValue(
      req,
      "query",
      sanitizeValue(req.query) as Request["query"],
    );
  }

  if (req.params && typeof req.params === "object") {
    replaceRequestValue(
      req,
      "params",
      sanitizeValue(req.params) as Request["params"],
    );
  }

  return next();
};

/**
 * Additional security headers middleware.
 *
 * This supplements Helmet with extra defensive headers.
 */
export const additionalSecurityHeaders: RequestHandler = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (config.IS_PROD) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );

  return next();
};

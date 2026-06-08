import dotenv from "dotenv";
import path from "path";

/**
 * Application configuration for the EduTech Platform.
 *
 * Environment variables are loaded from the project root `.env` file.
 * This avoids incorrect relative paths after TypeScript compilation.
 */
const projectRootDir = path.resolve(__dirname, "..", "..");

dotenv.config({ path: path.resolve(projectRootDir, ".env") });

type NodeEnv = "development" | "test" | "production";
type CorsOrigin = string | string[];

interface AppConfig {
  // Server
  NODE_ENV: NodeEnv;
  PORT: number;
  API_VERSION: string;
  FRONTEND_DIST_DIR: string;

  // Database
  DATABASE_URL: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // Password reset and authentication
  PASSWORD_RESET_CODE_TTL_MINUTES: number;
  PASSWORD_RESET_MAX_ATTEMPTS: number;
  PASSWORD_RESET_TOKEN_EXPIRES_IN: string;
  AUTH_MAX_FAILED_LOGINS: number;
  AUTH_LOCKOUT_MINUTES: number;

  // Platform
  PLATFORM_COMMISSION_RATE: number;

  // File upload
  MAX_FILE_SIZE: number;
  UPLOAD_DIR: string;

  // CORS
  CORS_ORIGIN: CorsOrigin;

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Socket.io
  SOCKET_CORS_ORIGIN: CorsOrigin;

  // Derived flags
  IS_PROD: boolean;
  IS_DEV: boolean;
  IS_TEST: boolean;
}

const resolveNodeEnv = (): NodeEnv => {
  if (process.env.NODE_ENV === "production") return "production";
  if (process.env.NODE_ENV === "test") return "test";
  return "development";
};

const NODE_ENV = resolveNodeEnv();
const IS_PROD = NODE_ENV === "production";
const IS_DEV = NODE_ENV === "development";
const IS_TEST = NODE_ENV === "test";

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value.trim();
};

const parseNumber = (
  value: string | undefined,
  fallback: number,
  min?: number,
  max?: number,
  key = "number",
): number => {
  if (!value || value.trim().length === 0) {
    return fallback;
  }

  const parsedValue = Number(value.trim());

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${key} must be a valid number.`);
  }

  if (min !== undefined && parsedValue < min) {
    throw new Error(`${key} must be at least ${min}.`);
  }

  if (max !== undefined && parsedValue > max) {
    throw new Error(`${key} must be at most ${max}.`);
  }

  return parsedValue;
};

const parseInteger = (
  value: string | undefined,
  fallback: number,
  min?: number,
  max?: number,
  key = "integer",
): number => {
  const parsed = parseNumber(value, fallback, min, max, key);

  if (!Number.isInteger(parsed)) {
    throw new Error(`${key} must be an integer.`);
  }

  return parsed;
};

const parseDuration = (
  value: string | undefined,
  fallback: string,
  key: string,
): string => {
  const duration = value?.trim() || fallback;
  const durationMatch = duration.match(/^(\d+)(ms|s|m|h|d|w)$/i);

  if (!durationMatch) {
    throw new Error(
      `${key} must be a positive duration such as 15m, 7d, or 3600s.`,
    );
  }

  const amount = Number(durationMatch[1]);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`${key} must be greater than zero.`);
  }

  return duration;
};

const parseCorsOrigin = (
  value: string | undefined,
  fallback: string,
): CorsOrigin => {
  if (!value || value.trim().length === 0) return fallback;

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) return fallback;
  if (origins.length === 1) return origins[0];

  return origins;
};

const parseApiVersion = (value: string | undefined): string => {
  const version = value?.trim() || "v1";

  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(version)) {
    throw new Error(
      "API_VERSION may contain only letters, numbers, underscores, and hyphens.",
    );
  }

  return version;
};

const INSECURE_SECRET_PATTERNS = [
  /^replace[-_ ]?with/i,
  /^change[-_ ]?me/i,
  /^your[-_ ]/i,
  /^secret$/i,
  /^password$/i,
  /^default[-_ ]?secret$/i,
];

const validateProductionSecret = (key: string, value: string): void => {
  if (!IS_PROD) return;

  if (value.length < 32) {
    throw new Error(
      `${key} must be at least 32 characters long in production.`,
    );
  }

  if (INSECURE_SECRET_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new Error(
      `${key} must be changed from the example/default value in production.`,
    );
  }
};

const DATABASE_URL = getRequiredEnv("DATABASE_URL");
const JWT_SECRET = getRequiredEnv("JWT_SECRET");
const JWT_REFRESH_SECRET = getRequiredEnv("JWT_REFRESH_SECRET");

validateProductionSecret("JWT_SECRET", JWT_SECRET);
validateProductionSecret("JWT_REFRESH_SECRET", JWT_REFRESH_SECRET);

if (IS_PROD && JWT_SECRET === JWT_REFRESH_SECRET) {
  throw new Error(
    "JWT_SECRET and JWT_REFRESH_SECRET must be different in production.",
  );
}

const uploadDirFromEnv = process.env.UPLOAD_DIR?.trim();
const resolveUploadDir = (value: string | undefined): string => {
  if (!value) {
    return path.resolve(projectRootDir, "uploads");
  }

  if (path.isAbsolute(value)) {
    return value;
  }

  const resolvedPath = path.resolve(projectRootDir, value);
  const expectedPrefix = `${projectRootDir}${path.sep}`;

  if (
    resolvedPath !== projectRootDir &&
    !resolvedPath.startsWith(expectedPrefix)
  ) {
    throw new Error(
      "UPLOAD_DIR must stay inside the backend folder when using a relative path.",
    );
  }

  return resolvedPath;
};

const uploadDir = resolveUploadDir(uploadDirFromEnv);

const resolveFrontendDistDir = (value: string | undefined): string => {
  if (!value || value.trim().length === 0) {
    return path.resolve(projectRootDir, "..", "frontend", "dist");
  }

  if (path.isAbsolute(value)) {
    return value;
  }

  return path.resolve(projectRootDir, value);
};

const frontendDistDir = resolveFrontendDistDir(process.env.FRONTEND_DIST_DIR);

const defaultPublicOrigin =
  IS_PROD && process.env.RENDER_EXTERNAL_URL
    ? process.env.RENDER_EXTERNAL_URL
    : "http://localhost:5173";

const corsOrigin = parseCorsOrigin(process.env.CORS_ORIGIN, defaultPublicOrigin);

const socketCorsOrigin = parseCorsOrigin(
  process.env.SOCKET_CORS_ORIGIN || process.env.CORS_ORIGIN,
  defaultPublicOrigin,
);

const config: AppConfig = {
  // Server
  NODE_ENV,
  PORT: parseInteger(process.env.PORT, 3000, 1, 65535, "PORT"),
  API_VERSION: parseApiVersion(process.env.API_VERSION),
  FRONTEND_DIST_DIR: frontendDistDir,

  // Database
  DATABASE_URL,

  // JWT
  JWT_SECRET,
  JWT_EXPIRES_IN: parseDuration(
    process.env.JWT_EXPIRES_IN,
    "7d",
    "JWT_EXPIRES_IN",
  ),
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: parseDuration(
    process.env.JWT_REFRESH_EXPIRES_IN,
    "30d",
    "JWT_REFRESH_EXPIRES_IN",
  ),

  // Password reset and authentication
  PASSWORD_RESET_CODE_TTL_MINUTES: parseInteger(
    process.env.PASSWORD_RESET_CODE_TTL_MINUTES,
    15,
    1,
    60,
    "PASSWORD_RESET_CODE_TTL_MINUTES",
  ),
  PASSWORD_RESET_MAX_ATTEMPTS: parseInteger(
    process.env.PASSWORD_RESET_MAX_ATTEMPTS,
    5,
    1,
    10,
    "PASSWORD_RESET_MAX_ATTEMPTS",
  ),
  PASSWORD_RESET_TOKEN_EXPIRES_IN: parseDuration(
    process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN,
    "15m",
    "PASSWORD_RESET_TOKEN_EXPIRES_IN",
  ),
  AUTH_MAX_FAILED_LOGINS: parseInteger(
    process.env.AUTH_MAX_FAILED_LOGINS,
    5,
    1,
    20,
    "AUTH_MAX_FAILED_LOGINS",
  ),
  AUTH_LOCKOUT_MINUTES: parseInteger(
    process.env.AUTH_LOCKOUT_MINUTES,
    15,
    1,
    1440,
    "AUTH_LOCKOUT_MINUTES",
  ),

  // Platform
  PLATFORM_COMMISSION_RATE: parseNumber(
    process.env.PLATFORM_COMMISSION_RATE,
    10,
    0,
    100,
    "PLATFORM_COMMISSION_RATE",
  ),

  // File upload
  MAX_FILE_SIZE: parseInteger(
    process.env.MAX_FILE_SIZE,
    500 * 1024 * 1024,
    1,
    undefined,
    "MAX_FILE_SIZE",
  ),
  UPLOAD_DIR: uploadDir,

  // CORS
  CORS_ORIGIN: corsOrigin,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInteger(
    process.env.RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
    1000,
    undefined,
    "RATE_LIMIT_WINDOW_MS",
  ),
  RATE_LIMIT_MAX_REQUESTS: parseInteger(
    process.env.RATE_LIMIT_MAX_REQUESTS,
    100,
    1,
    undefined,
    "RATE_LIMIT_MAX_REQUESTS",
  ),

  // Socket.io
  SOCKET_CORS_ORIGIN: socketCorsOrigin,

  // Derived flags
  IS_PROD,
  IS_DEV,
  IS_TEST,
};

export default config;

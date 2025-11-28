import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the current working directory .env by default.
// This avoids incorrect relative paths after TypeScript compilation.
dotenv.config();

// Helper to safely parse numbers with fallback and lower bounds
const parseNumber = (value: string | undefined, fallback: number, min?: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return min !== undefined ? Math.max(min, n) : n;
};

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export interface AppConfig {
  // Server
  NODE_ENV: 'development' | 'test' | 'production' | string;
  PORT: number;
  API_VERSION: string;

  // Database
  DATABASE_URL: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;

  // Platform
  PLATFORM_COMMISSION_RATE: number;

  // File Upload
  MAX_FILE_SIZE: number;
  UPLOAD_DIR: string;

  // CORS
  CORS_ORIGIN: string | string[];

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Frontend
  FRONTEND_URL: string;

  // Socket.io
  SOCKET_CORS_ORIGIN: string | string[];

  // Derived flags
  IS_PROD: boolean;
  IS_DEV: boolean;
}

const uploadsDir = path.isAbsolute(process.env.UPLOAD_DIR || '')
  ? (process.env.UPLOAD_DIR as string)
  : path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');

export const config: AppConfig = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseNumber(process.env.PORT, 3000, 0),
  API_VERSION: process.env.API_VERSION || 'v1',

  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Platform
  PLATFORM_COMMISSION_RATE: parseNumber(process.env.PLATFORM_COMMISSION_RATE, 10, 0),

  // File Upload
  MAX_FILE_SIZE: parseNumber(process.env.MAX_FILE_SIZE, 50 * 1024 * 1024, 0), // 50MB
  UPLOAD_DIR: uploadsDir,

  // CORS (support comma-separated list)
  CORS_ORIGIN:
    process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.includes(',')
      ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
      : process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000, 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100, 1),

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Socket.io (default to CORS_ORIGIN when not provided)
  SOCKET_CORS_ORIGIN:
    process.env.SOCKET_CORS_ORIGIN && process.env.SOCKET_CORS_ORIGIN.includes(',')
      ? process.env.SOCKET_CORS_ORIGIN.split(',').map((s) => s.trim())
      : process.env.SOCKET_CORS_ORIGIN || (process.env.CORS_ORIGIN || 'http://localhost:5173'),

  // Derived flags
  IS_PROD: (process.env.NODE_ENV || 'development') === 'production',
  IS_DEV: (process.env.NODE_ENV || 'development') === 'development',
};

export default config;

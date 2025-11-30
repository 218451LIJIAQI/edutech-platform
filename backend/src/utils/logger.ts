import fs from 'fs';
import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Ensure logs directory exists relative to the process working directory
const logsDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const isProd = (process.env.NODE_ENV || 'development') === 'production';
const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

// Console format: colorful, human-readable with correlation ID
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, correlationId, ...meta }) => {
    const corrId = correlationId ? ` [${correlationId}]` : '';
    const base = `${timestamp}${corrId} [${level}]: ${stack || message}`;
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return base + extra;
  })
);

// File format: structured JSON with timestamp and stack traces
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Daily rotate file transport for combined logs
const dailyRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level,
  format: fileFormat,
});

// Daily rotate file transport for error logs
const errorRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: fileFormat,
});

// Handle rotation events
dailyRotateTransport.on('rotate', (oldFilename, newFilename) => {
  // Log rotation event (will go to new file)
  logger.info('Log file rotated', { oldFilename, newFilename });
});

const logger = winston.createLogger({
  level,
  defaultMeta: { service: 'edutech-backend' },
  transports: [
    new winston.transports.Console({ format: consoleFormat, level }),
    dailyRotateTransport,
    errorRotateTransport,
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat,
    }),
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat,
    }),
  ],
});

/**
 * Create a child logger with correlation ID
 */
export const createChildLogger = (correlationId: string) => {
  return logger.child({ correlationId });
};

/**
 * Log with correlation ID from request
 */
export const logWithCorrelation = (
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  correlationId?: string,
  meta?: Record<string, unknown>
) => {
  logger.log(level, message, { correlationId, ...meta });
};

export default logger;

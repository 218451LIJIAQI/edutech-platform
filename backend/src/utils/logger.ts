import fs from 'fs';
import path from 'path';
import winston from 'winston';

// Ensure logs directory exists relative to the process working directory
const logsDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const isProd = (process.env.NODE_ENV || 'development') === 'production';
const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

// Console format: colorful, human-readable
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const base = `${timestamp} [${level}]: ${stack || message}`;
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

const logger = winston.createLogger({
  level,
  defaultMeta: { service: 'edutech-backend' },
  transports: [
    new winston.transports.Console({ format: consoleFormat, level }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      level,
      format: fileFormat,
    }),
  ],
});

export default logger;

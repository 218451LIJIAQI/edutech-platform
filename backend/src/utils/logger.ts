import winston from 'winston';

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

const logger = winston.createLogger({
  level,
  defaultMeta: { service: 'edutech-backend' },
  transports: [
    new winston.transports.Console({ format: consoleFormat, level }),
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

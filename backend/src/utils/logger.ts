import winston from 'winston';

const isProd = (process.env.NODE_ENV || 'development') === 'production';
const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

const logger = winston.createLogger({
  level,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
  ],
});

export default logger;

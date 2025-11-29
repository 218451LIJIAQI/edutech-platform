import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import config from '../config/env';

/**
 * Global error handling middleware
 */
export const errorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  next
) => {
  // Avoid handling if headers already sent
  if (res.headersSent) return next(err);

  // Log error with request context
  logger.error('Unhandled error', {
    message: err.message,
    name: err.name,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Operational errors thrown intentionally
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Prisma known request errors (e.g., unique constraint, not found)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Map some common codes
    const code = err.code;
    if (code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'Resource already exists' });
    }
    if (code === 'P2025') {
      return res.status(404).json({ status: 'error', message: 'Resource not found' });
    }
    return res.status(400).json({ status: 'error', message: 'Database operation failed' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ status: 'error', message: 'Authentication failed' });
  }

  // Fallback 500 (avoid leaking details in production)
  return res.status(500).json({
    status: 'error',
    message: config.IS_PROD ? 'Internal server error' : err.message,
  });
};

/**
 * Handle 404 routes
 */
export const notFound = (_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
};

export default { errorHandler, notFound };

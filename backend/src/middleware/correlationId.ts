import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Correlation ID Middleware
 * 
 * Adds a unique correlation ID to each request for distributed tracing.
 * This ID is propagated through logs and can be used to trace a request
 * across multiple services.
 */

// Header name for correlation ID
export const CORRELATION_ID_HEADER = 'x-correlation-id';

// Extend Express Request type (declaration merging)
declare module 'express-serve-static-core' {
  interface Request {
    correlationId?: string;
  }
}

/**
 * Correlation ID middleware
 * - Extracts correlation ID from incoming request header if present
 * - Generates a new UUID if not present
 * - Attaches it to request object and response header
 */
export const correlationIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check for existing correlation ID in headers
  const existingId = req.headers[CORRELATION_ID_HEADER] as string | undefined;
  
  // Use existing ID or generate a new one
  const correlationId = existingId || uuidv4();
  
  // Attach to request object for use in handlers and logging
  req.correlationId = correlationId;
  
  // Set response header so clients can correlate requests
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  
  next();
};

/**
 * Get correlation ID from request
 * Utility function for use in services
 */
export const getCorrelationId = (req: Request): string => {
  return req.correlationId || 'unknown';
};

export default correlationIdMiddleware;

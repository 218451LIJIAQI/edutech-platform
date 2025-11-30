import * as Sentry from '@sentry/node';
import { Application, Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import config from './env';
import logger from '../utils/logger';

/**
 * Sentry Configuration
 * Error monitoring and performance tracking
 */

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENABLED = !!SENTRY_DSN && config.IS_PROD;


/**
 * Initialize Sentry
 */
export const initSentry = (app: Application): void => {
  if (!SENTRY_ENABLED) {
    logger.info('Sentry is disabled (no DSN provided or not in production)');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: config.NODE_ENV,
      release: process.env.npm_package_version || '1.0.0',
      
      // Performance monitoring
      tracesSampleRate: config.IS_PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev
      
      // Filter sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        
        // Remove password from request data
        if (event.request?.data) {
          const data = event.request.data as Record<string, unknown>;
          if (data.password) data.password = '[FILTERED]';
          if (data.currentPassword) data.currentPassword = '[FILTERED]';
          if (data.newPassword) data.newPassword = '[FILTERED]';
        }
        
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        'Authentication required',
        'Invalid token',
        'Token expired',
        'Route not found',
      ],
    });

    // Setup Express integration
    Sentry.setupExpressErrorHandler(app);

    logger.info('✅ Sentry initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Sentry:', error);
  }
};

/**
 * Sentry request handler middleware
 * Adds request context to Sentry events
 */
export const sentryRequestHandler = () => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!SENTRY_ENABLED) {
      return next();
    }
    
    // Add request context
    Sentry.setContext('request', {
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
    });
    
    next();
  };
};

/**
 * Sentry error handler middleware
 * Must be before your error handler
 */
export const sentryErrorHandler = (): ErrorRequestHandler => {
  return (err: Error, req: Request, _res: Response, next: NextFunction) => {
    if (!SENTRY_ENABLED) {
      return next(err);
    }
    
    Sentry.captureException(err, {
      extra: {
        url: req.url,
        method: req.method,
        body: req.body,
      },
    });
    
    next(err);
  };
};

/**
 * Capture exception manually
 */
export const captureException = (error: Error, extras?: Record<string, unknown>): void => {
  if (!SENTRY_ENABLED) {
    logger.error('Error (Sentry disabled):', error);
    return;
  }
  
  Sentry.withScope((scope) => {
    if (extras) {
      scope.setExtras(extras);
    }
    Sentry.captureException(error);
  });
};

/**
 * Capture message manually
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  extras?: Record<string, unknown>
): void => {
  if (!SENTRY_ENABLED) {
    logger.info(`Message (Sentry disabled): ${message}`);
    return;
  }
  
  Sentry.withScope((scope) => {
    if (extras) {
      scope.setExtras(extras);
    }
    Sentry.captureMessage(message, level);
  });
};

/**
 * Set user context for Sentry
 */
export const setUser = (user: { id: string; email?: string; role?: string }): void => {
  if (!SENTRY_ENABLED) return;
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    // Don't include role in production to minimize PII
    ...(config.IS_DEV && user.role ? { role: user.role } : {}),
  });
};

/**
 * Clear user context
 */
export const clearUser = (): void => {
  if (!SENTRY_ENABLED) return;
  Sentry.setUser(null);
};

/**
 * Check if Sentry is enabled
 */
export const isSentryEnabled = (): boolean => {
  return SENTRY_ENABLED;
};

export default {
  initSentry,
  sentryRequestHandler,
  sentryErrorHandler,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  isSentryEnabled,
};

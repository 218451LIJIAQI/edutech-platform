import { Request, Response, NextFunction } from 'express';
import { doubleCsrf } from 'csrf-csrf';

/**
 * CSRF Protection Middleware
 * Uses the double-submit cookie pattern for CSRF protection
 */

const CSRF_SECRET = process.env.CSRF_SECRET || 'your-csrf-secret-min-32-chars-long!!';
const isProduction = process.env.NODE_ENV === 'production';

// Configure CSRF protection
const {
  invalidCsrfTokenError,
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  cookieName: isProduction ? '__Host-edutech.x-csrf-token' : 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    secure: isProduction,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req: Request) => {
    // Check header first, then body
    return req.headers['x-csrf-token'] as string || req.body?._csrf;
  },
});

// Export the protection middleware
export { doubleCsrfProtection, generateToken };

/**
 * Middleware to generate and attach CSRF token to response
 */
export const csrfTokenMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const csrfToken = generateToken(req, res);
    
    // Attach token to response locals for use in templates/responses
    res.locals.csrfToken = csrfToken;
    
    // Also set it as a header for SPA consumption
    res.setHeader('X-CSRF-Token', csrfToken);
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Error handler for CSRF validation failures
 */
export const csrfErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err === invalidCsrfTokenError) {
    res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
      code: 'CSRF_ERROR',
    });
    return;
  }
  next(err);
};

/**
 * Endpoint to get a fresh CSRF token
 * Frontend should call this on app initialization
 */
export const getCsrfToken = (req: Request, res: Response) => {
  const token = generateToken(req, res);
  res.json({
    success: true,
    csrfToken: token,
  });
};

export default doubleCsrfProtection;

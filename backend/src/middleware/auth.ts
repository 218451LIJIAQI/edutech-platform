import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import config from '../config/env';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import prisma from '../config/database';

interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
}

const getBearerToken = (req: Request): string | null => {
  const headerVal = req.headers.authorization;
  if (typeof headerVal !== 'string') return null;
  const match = headerVal.match(/^\s*Bearer\s+(.+)$/i);
  if (!match) return null;
  return match[1].trim() || null;
};

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = getBearerToken(req);
    if (!token) throw new AuthenticationError('No token provided');

    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) throw new AuthenticationError('User not found');
    if (!user.isActive) throw new AuthenticationError('User account is inactive');

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (error) {
    // Important: TokenExpiredError extends JsonWebTokenError, so check it first
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AuthenticationError('Token expired'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AuthenticationError('Invalid token'));
    }
    return next(error);
  }
};

/**
 * Middleware to check if user has required role
 * @param roles - Array of allowed roles
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return next(
        new AuthorizationError(`Access denied. Required role: ${roles.join(' or ')}`)
      );
    }

    next();
  };
};

/**
 * Optional authentication - attaches user if token is valid, but doesn't fail if not
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = getBearerToken(req);
    if (token) {
      const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
      });

      if (user && user.isActive) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      }
    }

    next();
  } catch (_error) {
    // Silently continue if token is invalid/expired
    next();
  }
};

export default { authenticate, authorize, optionalAuth };

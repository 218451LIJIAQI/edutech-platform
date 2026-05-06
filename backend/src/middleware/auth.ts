import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { UserRole } from "@prisma/client";

import config from "../config/env";
import prisma from "../config/database";
import { AuthenticationError, AuthorizationError } from "../utils/errors";
import {
  getTokenVersionFromPayload,
  unlockUserIfLockExpired,
} from "../utils/auth-session";

interface AuthTokenPayload extends JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  tokenVersion?: number;
}

const AUTH_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  isLocked: true,
  lockedUntil: true,
  failedLoginAttempts: true,
  tokenVersion: true,
} as const;

const getBearerToken = (req: Request): string | null => {
  const authorizationHeader = req.headers.authorization;

  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const match = authorizationHeader.match(/^\s*Bearer\s+(.+)$/i);

  if (!match) {
    return null;
  }

  const token = match[1].trim();
  return token.length > 0 ? token : null;
};

const isAuthTokenPayload = (
  payload: string | JwtPayload,
): payload is AuthTokenPayload => {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as Partial<AuthTokenPayload>;

  return (
    typeof candidate.id === "string" &&
    candidate.id.trim().length > 0 &&
    typeof candidate.email === "string" &&
    candidate.email.trim().length > 0 &&
    Object.values(UserRole).includes(candidate.role as UserRole)
  );
};

const verifyAccessToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, config.JWT_SECRET);

  if (!isAuthTokenPayload(decoded)) {
    throw new AuthenticationError("Invalid token payload");
  }

  return decoded;
};

const getAuthenticatedUserFromToken = async (token: string) => {
  const decoded = verifyAccessToken(token);
  const tokenVersion = getTokenVersionFromPayload(decoded.tokenVersion);

  if (tokenVersion < 0) {
    throw new AuthenticationError("Invalid token");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: AUTH_USER_SELECT,
  });

  if (!user) {
    throw new AuthenticationError("User not found");
  }

  if (!user.isActive) {
    throw new AuthenticationError("User account is inactive");
  }

  const unlockedUser = await unlockUserIfLockExpired(user);

  if (unlockedUser.isLocked) {
    throw new AuthenticationError("User account is locked");
  }

  if (unlockedUser.tokenVersion !== tokenVersion) {
    throw new AuthenticationError("Session expired. Please sign in again");
  }

  return {
    id: unlockedUser.id,
    email: unlockedUser.email,
    role: unlockedUser.role,
    firstName: unlockedUser.firstName,
    lastName: unlockedUser.lastName,
  };
};

/**
 * Middleware to verify JWT token and attach the authenticated user to the request.
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      throw new AuthenticationError("No token provided");
    }

    req.user = await getAuthenticatedUserFromToken(token);

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AuthenticationError("Token expired"));
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AuthenticationError("Invalid token"));
    }

    return next(error);
  }
};

/**
 * Middleware to check whether the authenticated user has one of the allowed roles.
 *
 * If no role is passed, the middleware only requires the user to be authenticated.
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError("Authentication required"));
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(
        new AuthorizationError(
          `Access denied. Required role: ${roles.join(" or ")}`,
        ),
      );
    }

    return next();
  };
};

/**
 * Optional authentication middleware.
 *
 * If a valid token is provided, the user is attached to the request.
 * If the token is missing, invalid, expired, locked, or inactive, the request continues as a guest.
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return next();
    }

    req.user = await getAuthenticatedUserFromToken(token);

    return next();
  } catch (error) {
    if (
      error instanceof AuthenticationError ||
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.JsonWebTokenError
    ) {
      return next();
    }

    return next(error);
  }
};

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
  email?: string;
  role?: UserRole;
  tokenVersion?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  tokenVersion: number;
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

export const extractBearerToken = (
  authorizationHeader?: unknown,
): string | null => {
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
  return typeof candidate.id === "string" && candidate.id.trim().length > 0;
};

/**
 * Re-verifies that a user account is still active, unlocked, and on the expected
 * `tokenVersion` (used by both HTTP token authentication and live Socket.IO events).
 */
export const verifyActiveAuthenticatedUser = async (
  userId: string,
  expectedTokenVersion?: number,
): Promise<AuthenticatedUser> => {
  const normalizedId = userId?.trim();
  if (!normalizedId) {
    throw new AuthenticationError("Invalid token");
  }

  const user = await prisma.user.findUnique({
    where: { id: normalizedId },
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

  if (
    expectedTokenVersion !== undefined &&
    unlockedUser.tokenVersion !== expectedTokenVersion
  ) {
    throw new AuthenticationError("Session expired. Please sign in again");
  }

  return {
    id: unlockedUser.id,
    email: unlockedUser.email,
    role: unlockedUser.role,
    firstName: unlockedUser.firstName,
    lastName: unlockedUser.lastName,
    tokenVersion: unlockedUser.tokenVersion,
  };
};

/**
 * Validates an access token against JWT signature, account activity, lock status,
 * and current `tokenVersion`. Shared across HTTP middleware and Socket.IO handshakes.
 */
export const authenticateAccessToken = async (
  token: string,
): Promise<AuthenticatedUser> => {
  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError("Token expired");
    }
    throw new AuthenticationError("Invalid token");
  }

  if (!isAuthTokenPayload(decoded)) {
    throw new AuthenticationError("Invalid token");
  }

  const tokenVersion = getTokenVersionFromPayload(decoded.tokenVersion);
  if (tokenVersion < 0) {
    throw new AuthenticationError("Invalid token");
  }

  return verifyActiveAuthenticatedUser(decoded.id, tokenVersion);
};

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new AuthenticationError("No token provided");
    }

    req.user = await authenticateAccessToken(token);
    return next();
  } catch (error) {
    return next(error);
  }
};

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

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return next();
    }

    req.user = await authenticateAccessToken(token);
    return next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return next();
    }

    return next(error);
  }
};

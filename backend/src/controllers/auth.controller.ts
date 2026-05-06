import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import authService from "../services/auth.service";
import asyncHandler from "../utils/async-handler";
import { AuthenticationError, ValidationError } from "../utils/errors";
import {
  clearRefreshTokenCookie,
  clearRefreshSessionHintCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
  setRefreshSessionHintCookie,
} from "../utils/auth-cookie";

/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints.
 */

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthResultWithTokens<
  T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
  tokens: AuthTokens;
};

const SELF_REGISTRATION_ROLES: UserRole[] = [
  UserRole.STUDENT,
  UserRole.TEACHER,
];

const sendSuccess = (
  res: Response,
  data?: unknown,
  message?: string,
  statusCode = 200,
) => {
  res.status(statusCode).json({
    status: "success",
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
  });
};

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AuthenticationError("Authentication required");
  }

  return req.user.id;
};

const parseRequiredString = (
  value: unknown,
  fieldName: string,
  options: { trim?: boolean } = { trim: true },
): string => {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} is required`);
  }

  const parsed = options.trim === false ? value : value.trim();

  if (parsed.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }

  return parsed;
};

const parseOptionalString = (
  value: unknown,
  fieldName: string,
): string | undefined => {
  if (value === undefined) return undefined;

  if (value === null) return undefined;

  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  const parsed = value.trim();

  if (parsed.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }

  return parsed;
};

const parseOptionalNullableString = (
  value: unknown,
  fieldName: string,
): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  return parseOptionalString(value, fieldName);
};

const normalizeEmail = (value: unknown): string => {
  const email = parseRequiredString(value, "email").toLowerCase();

  // Simple controller-level format check. Full validation can still be enforced
  // by the service layer or a dedicated validation middleware.
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw new ValidationError("email must be a valid email address");
  }

  return email;
};

const parsePassword = (value: unknown, fieldName = "password"): string => {
  const password = parseRequiredString(value, fieldName, { trim: false });

  if (password.length < 8) {
    throw new ValidationError(
      `${fieldName} must be at least 8 characters long`,
    );
  }

  return password;
};

const parseSelfRegistrationRole = (value: unknown): UserRole => {
  if (value === undefined || value === null || value === "") {
    return UserRole.STUDENT;
  }

  if (typeof value !== "string") {
    throw new ValidationError("role must be a string");
  }

  const role = value.trim() as UserRole;

  if (!Object.values(UserRole).includes(role)) {
    throw new ValidationError(
      `role must be one of: ${SELF_REGISTRATION_ROLES.join(", ")}`,
    );
  }

  if (!SELF_REGISTRATION_ROLES.includes(role)) {
    throw new ValidationError(
      "ADMIN role is not allowed during self-registration",
    );
  }

  return role;
};

const sanitizeAuthResult = <T extends Record<string, unknown>>(
  result: AuthResultWithTokens<T>,
) => {
  return {
    ...result,
    tokens: {
      accessToken: result.tokens.accessToken,
    },
  };
};

class AuthController {
  private setAuthSessionCookie(res: Response, refreshToken: string) {
    setRefreshTokenCookie(res, refreshToken);
    setRefreshSessionHintCookie(res);
  }

  private clearAuthSessionCookie(res: Response) {
    clearRefreshTokenCookie(res);
    clearRefreshSessionHintCookie(res);
  }

  /**
   * Register a new user.
   * POST /api/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const selectedRole = parseSelfRegistrationRole(req.body?.role);

    const result = await authService.register({
      email: normalizeEmail(req.body?.email),
      password: parsePassword(req.body?.password),
      firstName: parseRequiredString(req.body?.firstName, "firstName"),
      lastName: parseRequiredString(req.body?.lastName, "lastName"),
      role: selectedRole,
    });

    this.setAuthSessionCookie(res, result.tokens.refreshToken);

    sendSuccess(
      res,
      sanitizeAuthResult(result),
      "User registered successfully",
      201,
    );
  });

  /**
   * Login user.
   * POST /api/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login({
      email: normalizeEmail(req.body?.email),
      password: parseRequiredString(req.body?.password, "password", {
        trim: false,
      }),
    });

    this.setAuthSessionCookie(res, result.tokens.refreshToken);

    sendSuccess(res, sanitizeAuthResult(result), "Login successful");
  });

  /**
   * Request password reset code.
   * POST /api/auth/forgot-password
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.requestPasswordReset(
      normalizeEmail(req.body?.email),
    );

    sendSuccess(
      res,
      result,
      "If an active account with that email exists, a password reset code has been issued",
    );
  });

  /**
   * Verify password reset code.
   * POST /api/auth/verify-reset-code
   */
  verifyPasswordResetCode = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await authService.verifyPasswordResetCode(
        normalizeEmail(req.body?.email),
        parseRequiredString(req.body?.code, "code"),
      );

      sendSuccess(res, result, "Password reset code verified");
    },
  );

  /**
   * Reset password with verified reset token.
   * POST /api/auth/reset-password
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.resetPassword(
      parseRequiredString(req.body?.resetToken, "resetToken"),
      parsePassword(req.body?.newPassword, "newPassword"),
    );

    this.clearAuthSessionCookie(res);

    sendSuccess(res, result, result.message || "Password reset successfully");
  });

  /**
   * Refresh access token.
   * POST /api/auth/refresh
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const refreshTokenValue =
      getRefreshTokenFromRequest(req) ||
      parseRequiredString(req.body?.refreshToken, "refreshToken");

    let tokens: AuthTokens;

    try {
      tokens = await authService.refreshToken(refreshTokenValue);
    } catch (error) {
      this.clearAuthSessionCookie(res);
      throw error;
    }

    this.setAuthSessionCookie(res, tokens.refreshToken);

    sendSuccess(
      res,
      {
        accessToken: tokens.accessToken,
      },
      "Token refreshed successfully",
    );
  });

  /**
   * Get current user profile.
   * GET /api/auth/profile
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const user = await authService.getProfile(userId);

    sendSuccess(res, user);
  });

  /**
   * Update current user profile.
   * PUT /api/auth/profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const user = await authService.updateProfile(userId, {
      firstName: parseOptionalString(req.body?.firstName, "firstName"),
      lastName: parseOptionalString(req.body?.lastName, "lastName"),
      avatar: parseOptionalNullableString(req.body?.avatar, "avatar"),
    });

    sendSuccess(res, user, "Profile updated successfully");
  });

  /**
   * Change password.
   * POST /api/auth/change-password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const result = await authService.changePassword(
      userId,
      parseRequiredString(req.body?.currentPassword, "currentPassword", {
        trim: false,
      }),
      parsePassword(req.body?.newPassword, "newPassword"),
    );

    this.clearAuthSessionCookie(res);

    sendSuccess(
      res,
      undefined,
      result.message || "Password changed successfully",
    );
  });

  /**
   * Logout user.
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const result = userId
      ? await authService.logout(userId)
      : { message: "Logout successful" };

    this.clearAuthSessionCookie(res);

    sendSuccess(res, undefined, result.message || "Logout successful");
  });

  /**
   * Delete current user's account.
   * DELETE /api/auth/account
   */
  deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const result = await authService.deleteAccount(userId);

    this.clearAuthSessionCookie(res);

    sendSuccess(res, undefined, result.message);
  });
}

export default new AuthController();

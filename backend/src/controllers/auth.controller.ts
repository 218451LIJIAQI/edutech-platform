import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import authService from "../services/auth.service";
import asyncHandler from "../utils/async-handler";
import { ValidationError } from "../utils/errors";
import {
  clearRefreshSessionHintCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshSessionHintCookie,
  setRefreshTokenCookie,
} from "../utils/auth-cookie";
import {
  parseNullableString,
  parseOptionalString,
  parseRequiredString,
  requireAuthUserId,
  sendCreated,
  sendSuccess,
} from "../utils/http";

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthResultWithTokens<
  T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
  tokens: AuthTokens;
};

const SELF_REGISTRATION_ROLES: readonly UserRole[] = [
  UserRole.STUDENT,
  UserRole.TEACHER,
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value: unknown): string => {
  const email = parseRequiredString(value, "email").toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new ValidationError("email must be a valid email address");
  }
  return email;
};

const parsePassword = (value: unknown, fieldName = "password"): string =>
  parseRequiredString(value, fieldName, { trim: false, minLength: 8 });

const parseSelfRegistrationRole = (value: unknown): UserRole => {
  if (value === undefined || value === null || value === "") {
    return UserRole.STUDENT;
  }

  const role = parseRequiredString(value, "role") as UserRole;
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
) => ({
  ...result,
  tokens: {
    accessToken: result.tokens.accessToken,
  },
});

class AuthController {
  private setAuthSessionCookie(res: Response, refreshToken: string) {
    setRefreshTokenCookie(res, refreshToken);
    setRefreshSessionHintCookie(res);
  }

  private clearAuthSessionCookie(res: Response) {
    clearRefreshTokenCookie(res);
    clearRefreshSessionHintCookie(res);
  }

  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register({
      email: normalizeEmail(req.body?.email),
      password: parsePassword(req.body?.password),
      firstName: parseRequiredString(req.body?.firstName, "firstName"),
      lastName: parseRequiredString(req.body?.lastName, "lastName"),
      role: parseSelfRegistrationRole(req.body?.role),
    });

    this.setAuthSessionCookie(res, result.tokens.refreshToken);
    sendCreated(res, sanitizeAuthResult(result), "User registered successfully");
  });

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

  verifyPasswordResetCode = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await authService.verifyPasswordResetCode(
        normalizeEmail(req.body?.email),
        parseRequiredString(req.body?.code, "code"),
      );
      sendSuccess(res, result, "Password reset code verified");
    },
  );

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.resetPassword(
      parseRequiredString(req.body?.resetToken, "resetToken"),
      parsePassword(req.body?.newPassword, "newPassword"),
    );

    this.clearAuthSessionCookie(res);
    sendSuccess(res, result, result.message || "Password reset successfully");
  });

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
      { accessToken: tokens.accessToken },
      "Token refreshed successfully",
    );
  });

  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getProfile(requireAuthUserId(req));
    sendSuccess(res, user);
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const avatar =
      req.body?.avatar === ""
        ? (() => {
            throw new ValidationError("avatar cannot be empty");
          })()
        : parseNullableString(req.body?.avatar, "avatar");

    const user = await authService.updateProfile(requireAuthUserId(req), {
      firstName: parseOptionalString(req.body?.firstName, "firstName", {
        rejectBlank: true,
      }),
      lastName: parseOptionalString(req.body?.lastName, "lastName", {
        rejectBlank: true,
      }),
      avatar,
    });

    sendSuccess(res, user, "Profile updated successfully");
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.changePassword(
      requireAuthUserId(req),
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

  logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const result = userId
      ? await authService.logout(userId)
      : { message: "Logout successful" };

    this.clearAuthSessionCookie(res);
    sendSuccess(res, undefined, result.message || "Logout successful");
  });

  deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.deleteAccount(requireAuthUserId(req));
    this.clearAuthSessionCookie(res);
    sendSuccess(res, undefined, result.message);
  });
}

export default new AuthController();

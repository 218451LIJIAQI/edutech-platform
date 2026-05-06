import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  Prisma,
  RegistrationStatus,
  UserRole,
  VerificationStatus,
} from "@prisma/client";
import prisma from "../config/database";
import config from "../config/env";
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import {
  getTokenVersionFromPayload,
  unlockUserIfLockExpired,
} from "../utils/auth-session";
import {
  ensureUrlOrUploadPathForFolders,
  normalizeOptionalUrlOrPath,
} from "../utils/url-or-path";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface LoginData {
  email: string;
  password: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RefreshTokenPayload {
  id: string;
  email: string;
  role: UserRole;
  tokenVersion?: number;
}

interface PasswordResetTokenPair {
  resetToken: string;
}

interface PasswordResetTokenPayload {
  id: string;
  email: string;
  type: "password_reset";
  resetCodeId: string;
}

const BCRYPT_SALT_ROUNDS = 12;
const PASSWORD_RESET_RETRY_ATTEMPTS = 3;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const NAME_MAX_LENGTH = 80;
const EMAIL_MAX_LENGTH = 254;

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
const PASSWORD_RESET_CODE_FORMAT = /^\d{6}$/;
const AVATAR_URL_ERROR =
  "Avatar must be an external URL or use the /uploads/avatars/ folder";

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

const isRecordNotFoundError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2025";

const normalizeAvatarUrl = (
  value: string | null | undefined,
): string | null | undefined => {
  const normalizedValue = normalizeOptionalUrlOrPath(value);

  return normalizedValue
    ? ensureUrlOrUploadPathForFolders(
        normalizedValue,
        ["avatars"],
        AVATAR_URL_ERROR,
      )
    : normalizedValue;
};

class AuthService {
  /**
   * Deactivate the current user's account.
   *
   * This intentionally uses a soft-delete approach because the final database
   * schema protects financial, audit, report, order, and wallet records from
   * accidental hard deletion.
   */
  async deleteAccount(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.role === UserRole.ADMIN) {
      throw new ValidationError("Admin accounts cannot be self-deleted");
    }

    if (!user.isActive) {
      return { message: "Account is already deactivated" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        isLocked: true,
        lockedUntil: null,
        failedLoginAttempts: 0,
        tokenVersion: { increment: 1 },
        avatar: null,
      },
    });

    return { message: "Account deactivated successfully" };
  }

  /**
   * Register a new student or teacher account.
   */
  async register(data: RegisterData) {
    const email = this.normalizeEmail(data.email);
    const firstName = this.normalizeName(data.firstName, "First name");
    const lastName = this.normalizeName(data.lastName, "Last name");
    const role = this.normalizeRegistrationRole(data.role);

    this.assertPasswordStrength(data.password, "Password");

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);

    try {
      const user = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            tokenVersion: true,
            createdAt: true,
          },
        });

        if (role === UserRole.TEACHER) {
          await tx.teacherProfile.create({
            data: {
              userId: createdUser.id,
              registrationStatus: RegistrationStatus.PENDING,
              verificationStatus: VerificationStatus.PENDING,
            },
          });
        }

        return createdUser;
      });

      const tokens = this.generateTokens(
        user.id,
        user.email,
        user.role,
        user.tokenVersion,
      );
      const { tokenVersion: _tokenVersion, ...publicUser } = user;

      return { user: publicUser, tokens };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictError("User with this email already exists");
      }

      throw error;
    }
  }

  /**
   * Login user and issue fresh access/refresh tokens.
   */
  async login(data: LoginData) {
    const email = this.normalizeEmail(data.email);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AuthenticationError("Invalid email or password");
    }

    if (!user.isActive) {
      throw new AuthenticationError("Your account has been deactivated");
    }

    const unlockedUser = await unlockUserIfLockExpired(user);

    if (unlockedUser.isLocked) {
      throw new AuthenticationError(
        "Your account is temporarily locked. Please try again later",
      );
    }

    const isPasswordValid = await bcrypt.compare(
      data.password,
      unlockedUser.password,
    );

    if (!isPasswordValid) {
      const accountLocked = await this.recordFailedLoginAttempt(
        unlockedUser.id,
      );

      if (accountLocked) {
        throw new AuthenticationError(
          "Your account is temporarily locked. Please try again later",
        );
      }

      throw new AuthenticationError("Invalid email or password");
    }

    const loggedInUser = await prisma.user.update({
      where: { id: unlockedUser.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        tokenVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const tokens = this.generateTokens(
      loggedInUser.id,
      loggedInUser.email,
      loggedInUser.role,
      loggedInUser.tokenVersion,
    );

    return {
      user: {
        id: loggedInUser.id,
        email: loggedInUser.email,
        firstName: loggedInUser.firstName,
        lastName: loggedInUser.lastName,
        role: loggedInUser.role,
        avatar: loggedInUser.avatar,
        createdAt: loggedInUser.createdAt,
        updatedAt: loggedInUser.updatedAt,
      },
      tokens,
    };
  }

  /**
   * Request a password reset code.
   * The response remains generic to avoid account enumeration.
   */
  async requestPasswordReset(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        isActive: true,
      },
    });

    let devCode: string | undefined;

    if (!user?.isActive) {
      return { devCode };
    }

    for (
      let attempt = 0;
      attempt < PASSWORD_RESET_RETRY_ATTEMPTS;
      attempt += 1
    ) {
      const code = this.generatePasswordResetCode();
      const codeHash = await bcrypt.hash(code, BCRYPT_SALT_ROUNDS);
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + config.PASSWORD_RESET_CODE_TTL_MINUTES * 60 * 1000,
      );

      try {
        await prisma.$transaction([
          prisma.passwordResetCode.updateMany({
            where: {
              userId: user.id,
              consumedAt: null,
            },
            data: {
              consumedAt: now,
            },
          }),
          prisma.passwordResetCode.create({
            data: {
              userId: user.id,
              codeHash,
              expiresAt,
            },
          }),
        ]);

        if (config.IS_DEV) {
          devCode = code;
        }

        break;
      } catch (error) {
        if (
          !isUniqueConstraintError(error) ||
          attempt === PASSWORD_RESET_RETRY_ATTEMPTS - 1
        ) {
          throw error;
        }
      }
    }

    return { devCode };
  }

  /**
   * Verify a password reset code and issue a short-lived reset session token.
   */
  async verifyPasswordResetCode(
    email: string,
    code: string,
  ): Promise<PasswordResetTokenPair> {
    const normalizedEmail = this.normalizeEmail(email);
    const normalizedCode = this.normalizePasswordResetCode(code);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    });

    if (!user?.isActive) {
      throw new AuthenticationError("Invalid or expired password reset code");
    }

    const resetCode = await prisma.passwordResetCode.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!resetCode) {
      throw new AuthenticationError("Invalid or expired password reset code");
    }

    const now = new Date();

    if (resetCode.expiresAt <= now) {
      await prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: { consumedAt: now },
      });

      throw new AuthenticationError("Invalid or expired password reset code");
    }

    if (resetCode.attempts >= config.PASSWORD_RESET_MAX_ATTEMPTS) {
      await prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: { consumedAt: now },
      });

      throw new AuthenticationError("Invalid or expired password reset code");
    }

    const isValidCode = await bcrypt.compare(
      normalizedCode,
      resetCode.codeHash,
    );

    if (!isValidCode) {
      const nextAttempts = resetCode.attempts + 1;

      await prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: {
          attempts: nextAttempts,
          consumedAt:
            nextAttempts >= config.PASSWORD_RESET_MAX_ATTEMPTS
              ? now
              : undefined,
        },
      });

      throw new AuthenticationError("Invalid or expired password reset code");
    }

    const verifiedAt = new Date();

    await prisma.passwordResetCode.update({
      where: { id: resetCode.id },
      data: {
        verifiedAt,
      },
    });

    const resetToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: "password_reset",
        resetCodeId: resetCode.id,
      },
      config.JWT_SECRET,
      {
        expiresIn: config.PASSWORD_RESET_TOKEN_EXPIRES_IN,
      } as jwt.SignOptions,
    );

    return { resetToken };
  }

  /**
   * Reset password using a previously verified password reset session token.
   */
  async resetPassword(resetToken: string, newPassword: string) {
    this.assertPasswordStrength(newPassword, "New password");

    const decoded = this.verifyPasswordResetToken(resetToken);
    const now = new Date();

    const resetCode = await prisma.passwordResetCode.findUnique({
      where: { id: decoded.resetCodeId },
      include: {
        user: true,
      },
    });

    if (
      !resetCode ||
      resetCode.userId !== decoded.id ||
      resetCode.user.email !== decoded.email ||
      resetCode.consumedAt ||
      !resetCode.verifiedAt ||
      resetCode.expiresAt <= now ||
      !resetCode.user.isActive
    ) {
      throw new AuthenticationError(
        "Invalid or expired password reset session",
      );
    }

    await this.ensurePasswordChanged(resetCode.user.password, newPassword);

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetCode.userId },
        data: {
          password: hashedPassword,
          failedLoginAttempts: 0,
          isLocked: false,
          lockedUntil: null,
          tokenVersion: { increment: 1 },
        },
      }),
      prisma.passwordResetCode.updateMany({
        where: {
          userId: resetCode.userId,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      }),
    ]);

    return { message: "Password reset successfully" };
  }

  /**
   * Refresh access and refresh tokens using a valid refresh token.
   */
  async refreshToken(refreshToken: string | null | undefined) {
    try {
      if (
        typeof refreshToken !== "string" ||
        refreshToken.trim().length === 0
      ) {
        throw new AuthenticationError("Invalid refresh token");
      }

      const decoded = jwt.verify(
        refreshToken,
        config.JWT_REFRESH_SECRET,
      ) as RefreshTokenPayload;

      if (
        typeof decoded.id !== "string" ||
        typeof decoded.email !== "string" ||
        !Object.values(UserRole).includes(decoded.role)
      ) {
        throw new AuthenticationError("Invalid refresh token");
      }

      const tokenVersion = getTokenVersionFromPayload(decoded.tokenVersion);

      if (tokenVersion < 0) {
        throw new AuthenticationError("Invalid refresh token");
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || !user.isActive || user.email !== decoded.email) {
        throw new AuthenticationError("Invalid refresh token");
      }

      const unlockedUser = await unlockUserIfLockExpired(user);

      if (unlockedUser.isLocked || unlockedUser.tokenVersion !== tokenVersion) {
        throw new AuthenticationError("Invalid refresh token");
      }

      return this.generateTokens(
        unlockedUser.id,
        unlockedUser.email,
        unlockedUser.role,
        unlockedUser.tokenVersion,
      );
    } catch {
      throw new AuthenticationError("Invalid or expired refresh token");
    }
  }

  /**
   * Get current user profile.
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        teacherProfile: {
          select: {
            id: true,
            bio: true,
            headline: true,
            hourlyRate: true,
            totalStudents: true,
            averageRating: true,
            isVerified: true,
            registrationStatus: true,
            verificationStatus: true,
            profileCompletionStatus: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  /**
   * Update user profile.
   */
  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      avatar?: string | null;
    },
  ) {
    const updateData: Prisma.UserUpdateInput = {};

    if (data.firstName !== undefined) {
      updateData.firstName = this.normalizeName(data.firstName, "First name");
    }

    if (data.lastName !== undefined) {
      updateData.lastName = this.normalizeName(data.lastName, "Last name");
    }

    if (data.avatar !== undefined) {
      updateData.avatar = normalizeAvatarUrl(data.avatar);
    }

    try {
      return await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatar: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new NotFoundError("User not found");
      }

      throw error;
    }
  }

  /**
   * Change password while logged in.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (!user.isActive) {
      throw new AuthenticationError("Your account has been deactivated");
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new AuthenticationError("Current password is incorrect");
    }

    this.assertPasswordStrength(newPassword, "New password");
    await this.ensurePasswordChanged(user.password, newPassword);

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: null,
        tokenVersion: { increment: 1 },
      },
    });

    return { message: "Password changed successfully" };
  }

  /**
   * Logout current user and invalidate outstanding tokens.
   */
  async logout(userId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          tokenVersion: { increment: 1 },
        },
      });
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new NotFoundError("User not found");
      }

      throw error;
    }

    return { message: "Logout successful" };
  }

  private generateTokens(
    userId: string,
    email: string,
    role: UserRole,
    tokenVersion: number,
  ): TokenPair {
    const payload: RefreshTokenPayload = {
      id: userId,
      email,
      role,
      tokenVersion,
    };

    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as string,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN as string,
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  private normalizeEmail(email: string): string {
    const normalized = email.trim().toLowerCase();

    if (!normalized) {
      throw new ValidationError("Email is required");
    }

    if (
      normalized.length > EMAIL_MAX_LENGTH ||
      !EMAIL_FORMAT.test(normalized)
    ) {
      throw new ValidationError("Invalid email format");
    }

    return normalized;
  }

  private normalizeName(value: string, fieldName: string): string {
    const normalized = sanitizeUserPlainText(value).replace(/\s+/g, " ");

    if (!normalized) {
      throw new ValidationError(`${fieldName} is required`);
    }

    if (normalized.length > NAME_MAX_LENGTH) {
      throw new ValidationError(
        `${fieldName} must not exceed ${NAME_MAX_LENGTH} characters`,
      );
    }

    return normalized;
  }

  private normalizeRegistrationRole(role: UserRole): UserRole {
    if (role !== UserRole.STUDENT && role !== UserRole.TEACHER) {
      throw new ValidationError(
        "Only student and teacher accounts can register",
      );
    }

    return role;
  }

  private assertPasswordStrength(
    password: string,
    label: "Password" | "New password",
  ) {
    if (typeof password !== "string") {
      throw new ValidationError(`${label} is required`);
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new ValidationError(
        `${label} must be at least ${PASSWORD_MIN_LENGTH} characters long`,
      );
    }

    if (password.length > PASSWORD_MAX_LENGTH) {
      throw new ValidationError(
        `${label} must not exceed ${PASSWORD_MAX_LENGTH} characters`,
      );
    }

    if (!PASSWORD_COMPLEXITY.test(password)) {
      throw new ValidationError(
        `${label} must contain at least one uppercase letter, one lowercase letter, and one number`,
      );
    }
  }

  private async ensurePasswordChanged(
    currentHashedPassword: string,
    nextPassword: string,
  ): Promise<void> {
    const isSamePassword = await bcrypt.compare(
      nextPassword,
      currentHashedPassword,
    );

    if (isSamePassword) {
      throw new ValidationError(
        "New password must be different from current password",
      );
    }
  }

  private generatePasswordResetCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
  }

  private normalizePasswordResetCode(code: string): string {
    const normalizedCode = code.trim();

    if (!PASSWORD_RESET_CODE_FORMAT.test(normalizedCode)) {
      throw new AuthenticationError("Invalid or expired password reset code");
    }

    return normalizedCode;
  }

  private async recordFailedLoginAttempt(userId: string): Promise<boolean> {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
      },
      select: {
        failedLoginAttempts: true,
      },
    });

    const shouldLock =
      updatedUser.failedLoginAttempts >= config.AUTH_MAX_FAILED_LOGINS;

    if (shouldLock) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isLocked: true,
          lockedUntil: new Date(
            Date.now() + config.AUTH_LOCKOUT_MINUTES * 60 * 1000,
          ),
        },
      });
    }

    return shouldLock;
  }

  private verifyPasswordResetToken(
    resetToken: string,
  ): PasswordResetTokenPayload {
    try {
      if (typeof resetToken !== "string" || resetToken.trim().length === 0) {
        throw new AuthenticationError(
          "Invalid or expired password reset session",
        );
      }

      const decoded = jwt.verify(
        resetToken,
        config.JWT_SECRET,
      ) as Partial<PasswordResetTokenPayload>;

      if (
        decoded.type !== "password_reset" ||
        typeof decoded.id !== "string" ||
        typeof decoded.email !== "string" ||
        typeof decoded.resetCodeId !== "string"
      ) {
        throw new AuthenticationError(
          "Invalid or expired password reset session",
        );
      }

      return {
        id: decoded.id,
        email: decoded.email,
        type: "password_reset",
        resetCodeId: decoded.resetCodeId,
      };
    } catch {
      throw new AuthenticationError(
        "Invalid or expired password reset session",
      );
    }
  }
}

export default new AuthService();

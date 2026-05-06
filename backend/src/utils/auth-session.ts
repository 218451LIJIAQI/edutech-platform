import prisma from "../config/database";

export interface LockableUser {
  id: string;
  isLocked: boolean;
  lockedUntil: Date | null;
  failedLoginAttempts: number;
}

export const INVALID_TOKEN_VERSION = -1;
export const DEFAULT_TOKEN_VERSION = 0;

/**
 * Safely extracts tokenVersion from a JWT payload.
 *
 * Returns:
 * - 0 when tokenVersion is missing, for backward compatibility
 * - -1 when tokenVersion is invalid
 * - the tokenVersion value when it is a valid non-negative integer
 */
export const getTokenVersionFromPayload = (value: unknown): number => {
  if (value === undefined || value === null) {
    return DEFAULT_TOKEN_VERSION;
  }

  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return INVALID_TOKEN_VERSION;
  }

  return value;
};

/**
 * Unlocks a user only when the existing account lock has expired.
 *
 * updateMany is used instead of update to avoid accidentally overwriting
 * a newer lock state if the user was re-locked by another request.
 */
export const unlockUserIfLockExpired = async <T extends LockableUser>(
  user: T,
): Promise<T> => {
  if (!user.isLocked) {
    return user;
  }

  const now = new Date();

  if (!user.lockedUntil || user.lockedUntil > now) {
    return user;
  }

  const result = await prisma.user.updateMany({
    where: {
      id: user.id,
      isLocked: true,
      lockedUntil: {
        lte: now,
      },
    },
    data: {
      isLocked: false,
      lockedUntil: null,
      failedLoginAttempts: 0,
    },
  });

  if (result.count === 0) {
    return user;
  }

  return {
    ...user,
    isLocked: false,
    lockedUntil: null,
    failedLoginAttempts: 0,
  };
};

/**
 * Determines whether existing sessions should be invalidated after
 * important account-status changes.
 */
export const shouldInvalidateSessions = (changes: {
  isActive?: boolean;
  isLocked?: boolean;
}): boolean => {
  return changes.isActive === false || changes.isLocked === true;
};

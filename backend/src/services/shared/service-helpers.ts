import { UserRole } from "@prisma/client";
import prisma from "../../config/database";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";
import { sanitizeUserPlainText } from "../../utils/sanitize-user-content";
import {
  ensureUrlOrUploadPathForFolders,
  normalizeOptionalUrlOrPath,
} from "../../utils/url-or-path";

export const isPrismaErrorCode = (error: unknown, code: string): boolean =>
  Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === code,
  );

export const isUniqueConstraintError = (error: unknown): boolean =>
  isPrismaErrorCode(error, "P2002");

export const validateDateRange = (startDate?: Date, endDate?: Date): void => {
  if (startDate && Number.isNaN(startDate.getTime())) {
    throw new ValidationError("Invalid start date");
  }

  if (endDate && Number.isNaN(endDate.getTime())) {
    throw new ValidationError("Invalid end date");
  }

  if (startDate && endDate && startDate > endDate) {
    throw new ValidationError("Start date cannot be later than end date");
  }
};

export const normalizeOptionalSanitizedText = (
  value: unknown,
  fieldName = "Text value",
  maxLength?: number,
): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = sanitizeUserPlainText(value);
  if (!normalized) {
    return undefined;
  }

  if (maxLength !== undefined && normalized.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return normalized;
};

export const normalizeRequiredSanitizedText = (
  value: unknown,
  fieldName: string,
  maxLength?: number,
): string => {
  const normalized = normalizeOptionalSanitizedText(value, fieldName, maxLength);
  if (!normalized) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return normalized;
};

export const normalizeSupportAttachment = (
  attachment?: string,
): string | null | undefined =>
  normalizeOptionalUrlOrPath(
    attachment
      ? ensureUrlOrUploadPathForFolders(
          attachment,
          ["support-attachments"],
          "Support attachments must be an external URL or use the /uploads/support-attachments/ folder",
        )
      : attachment,
  );

export const ensureActiveAdmin = async (
  adminId: string,
  actionDescription: string,
): Promise<string> => {
  const normalizedAdminId = normalizeRequiredSanitizedText(adminId, "Admin ID");

  const admin = await prisma.user.findUnique({
    where: { id: normalizedAdminId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!admin) {
    throw new NotFoundError("Admin user not found");
  }

  if (admin.role !== UserRole.ADMIN) {
    throw new AuthorizationError(`Only admins can ${actionDescription}`);
  }

  if (!admin.isActive) {
    throw new AuthorizationError(`Inactive admins cannot ${actionDescription}`);
  }

  return normalizedAdminId;
};

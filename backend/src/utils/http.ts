import type { Request, Response } from "express";
import { AuthenticationError, ValidationError } from "./errors";

export type RequestUser = NonNullable<Request["user"]>;

/**
 * Asserts that `authenticate` attached `req.user` and returns the typed user.
 */
export const requireAuthUser = (req: Request): RequestUser => {
  if (!req.user?.id) {
    throw new AuthenticationError("Authentication required");
  }

  return req.user;
};

/**
 * Standard JSON success envelope used across all API controllers.
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
): Response => {
  return res.status(statusCode).json({
    status: "success",
    ...(message ? { message } : {}),
    data,
  });
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message?: string,
): Response => sendSuccess(res, data, message, 201);

export const parseRequiredParam = (
  value: unknown,
  label = "Identifier",
): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${label} is required`);
  }

  return value.trim();
};

export const parseOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const parseBoundedInt = (
  value: unknown,
  fallback: number,
  options?: { min?: number; max?: number; fieldName?: string },
): number => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isInteger(parsed)) {
    if (options?.fieldName) {
      throw new ValidationError(`${options.fieldName} must be an integer`);
    }
    return fallback;
  }

  const min = options?.min ?? 1;
  const max = options?.max;

  if (parsed < min) {
    if (options?.fieldName) {
      throw new ValidationError(`${options.fieldName} must be at least ${min}`);
    }
    return min;
  }

  if (max !== undefined && parsed > max) {
    if (options?.fieldName) {
      throw new ValidationError(`${options.fieldName} must be at most ${max}`);
    }
    return max;
  }

  return parsed;
};

export const parsePagination = (
  query: Record<string, unknown>,
  defaultLimit = 20,
  maxLimit = 100,
): { page: number; limit: number; skip: number } => {
  const page = parseBoundedInt(query.page, 1, { min: 1 });
  const limit = parseBoundedInt(query.limit, defaultLimit, {
    min: 1,
    max: maxLimit,
  });

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

export const parseOptionalBoolean = (
  value: unknown,
  fieldName = "Flag",
): boolean | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }

  throw new ValidationError(`${fieldName} must be a boolean`);
};

export const parseOptionalDate = (
  value: unknown,
  fieldName = "Date",
  options?: { endOfDayIfDateOnly?: boolean },
): Date | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a valid date string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const parsed = new Date(
    isDateOnly && options?.endOfDayIfDateOnly
      ? `${trimmed}T23:59:59.999Z`
      : isDateOnly
        ? `${trimmed}T00:00:00.000Z`
        : trimmed,
  );

  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`);
  }

  return parsed;
};

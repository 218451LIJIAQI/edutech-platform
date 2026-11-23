import type { Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  ValidationError,
} from "./errors";

export type RequestUser = NonNullable<Request["user"]>;

const ADMIN_ROLE: UserRole = "ADMIN";

const resolveEnumValues = <T extends string>(
  allowedOrEnum: readonly T[] | Record<string, T>,
): readonly T[] =>
  Array.isArray(allowedOrEnum)
    ? allowedOrEnum
    : (Object.values(allowedOrEnum) as T[]);

/**
 * Asserts that `authenticate` attached `req.user` and returns the typed user.
 */
export const requireAuthUser = (req: Request): RequestUser => {
  if (!req.user?.id) {
    throw new AuthenticationError("Authentication required");
  }

  return req.user;
};

export const requireAuthUserId = (req: Request): string =>
  requireAuthUser(req).id;

export const requireAdminUser = (req: Request): RequestUser => {
  const user = requireAuthUser(req);

  if (user.role !== ADMIN_ROLE) {
    throw new AuthorizationError("Admin access required");
  }

  return user;
};

export const requireAdminUserId = (req: Request): string =>
  requireAdminUser(req).id;

/**
 * Standard JSON success envelope used across all API controllers.
 */
export const sendSuccess = <T = undefined>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200,
): Response => {
  return res.status(statusCode).json({
    status: "success",
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
  });
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message?: string,
): Response => sendSuccess(res, data, message, 201);

export const getFirstQueryValue = (value: unknown): unknown =>
  Array.isArray(value) ? value[0] : value;

export const getQueryString = (value: unknown): string | undefined => {
  const raw = getFirstQueryValue(value);
  if (typeof raw !== "string") {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const parseRequiredParam = (
  value: unknown,
  label = "Identifier",
): string => {
  const raw = getFirstQueryValue(value);
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new BadRequestError(`${label} is required`);
  }

  return raw.trim();
};

export const parseRequiredString = (
  value: unknown,
  fieldName = "Field",
  options?: { trim?: boolean; minLength?: number; maxLength?: number },
): string => {
  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} is required`);
  }

  const parsed = options?.trim === false ? value : value.trim();
  if (!parsed) {
    throw new BadRequestError(`${fieldName} is required`);
  }

  if (options?.minLength !== undefined && parsed.length < options.minLength) {
    throw new BadRequestError(
      `${fieldName} must be at least ${options.minLength} characters`,
    );
  }

  if (options?.maxLength !== undefined && parsed.length > options.maxLength) {
    throw new BadRequestError(
      `${fieldName} must not exceed ${options.maxLength} characters`,
    );
  }

  return parsed;
};

export const parseOptionalString = (
  value: unknown,
  fieldName?: string,
  optionsOrMaxLength?:
    | number
    | { maxLength?: number; rejectBlank?: boolean },
): string | undefined => {
  const options =
    typeof optionsOrMaxLength === "number"
      ? { maxLength: optionsOrMaxLength }
      : optionsOrMaxLength;
  const raw = getFirstQueryValue(value);

  if (raw === undefined || raw === null) {
    return undefined;
  }

  if (typeof raw !== "string") {
    if (fieldName) {
      throw new BadRequestError(`${fieldName} must be a string`);
    }
    return undefined;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    if (options?.rejectBlank) {
      throw new BadRequestError(`${fieldName || "Field"} cannot be empty`);
    }
    return undefined;
  }

  if (options?.maxLength !== undefined && trimmed.length > options.maxLength) {
    throw new BadRequestError(
      `${fieldName || "Field"} must not exceed ${options.maxLength} characters`,
    );
  }

  return trimmed;
};

export const parseNullableString = (
  value: unknown,
  fieldName = "Field",
  maxLength?: number,
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} must be a string or null`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (maxLength !== undefined && trimmed.length > maxLength) {
    throw new BadRequestError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return trimmed;
};

export const parseStringArray = (
  value: unknown,
  fieldName: string,
  options?: { required?: boolean; maxItems?: number; dedupe?: boolean },
): string[] | undefined => {
  if (value === undefined || value === null || value === "") {
    if (options?.required) {
      throw new BadRequestError(`${fieldName} must be a non-empty array`);
    }
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(`${fieldName} must be an array of strings`);
  }

  if (options?.required && value.length === 0) {
    throw new BadRequestError(`${fieldName} must be a non-empty array`);
  }

  if (options?.maxItems !== undefined && value.length > options.maxItems) {
    throw new BadRequestError(
      `${fieldName} must not contain more than ${options.maxItems} items`,
    );
  }

  const parsed = value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new BadRequestError(
        `${fieldName}[${index}] must be a non-empty string`,
      );
    }
    return item.trim();
  });

  return options?.dedupe === false ? parsed : Array.from(new Set(parsed));
};

export const parseFiniteNumber = (value: unknown): number | undefined => {
  const raw = getFirstQueryValue(value);
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : undefined;
  }

  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

export const parseNumber = (
  value: unknown,
  fieldName: string,
  options?: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  },
): number | undefined => {
  const raw = getFirstQueryValue(value);
  if (raw === undefined || raw === null || raw === "") {
    if (options?.required) {
      throw new BadRequestError(`${fieldName} is required`);
    }
    return undefined;
  }

  const parsed = parseFiniteNumber(raw);
  if (parsed === undefined) {
    throw new BadRequestError(`${fieldName} must be a valid number`);
  }

  if (options?.integer && !Number.isInteger(parsed)) {
    throw new BadRequestError(`${fieldName} must be an integer`);
  }

  if (options?.min !== undefined && parsed < options.min) {
    throw new BadRequestError(`${fieldName} must be at least ${options.min}`);
  }

  if (options?.max !== undefined && parsed > options.max) {
    throw new BadRequestError(`${fieldName} must be at most ${options.max}`);
  }

  return parsed;
};

export const parseRequiredNumber = (
  value: unknown,
  fieldName: string,
  options?: { min?: number; max?: number; integer?: boolean },
): number =>
  parseNumber(value, fieldName, { ...options, required: true }) as number;

export const parseNullableNumber = (
  value: unknown,
  fieldName: string,
  options?: { min?: number; max?: number; integer?: boolean },
): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  return parseNumber(value, fieldName, options) ?? null;
};

export const parseQueryPositiveInt = (
  value: unknown,
  fieldName = "value",
  options?: { fallback?: number; max?: number },
): number | undefined => {
  const raw = getQueryString(value);
  if (raw === undefined) {
    return options?.fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestError(`${fieldName} must be a positive integer`);
  }

  return options?.max !== undefined ? Math.min(parsed, options.max) : parsed;
};

export const parseQueryNonNegativeInt = (
  value: unknown,
  fieldName = "value",
  options?: { fallback?: number; max?: number },
): number | undefined => {
  const raw = getQueryString(value);
  if (raw === undefined) {
    return options?.fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BadRequestError(`${fieldName} must be a non-negative integer`);
  }

  return options?.max !== undefined ? Math.min(parsed, options.max) : parsed;
};

export const parsePositiveAmount = (
  value: unknown,
  fieldName = "amount",
  options?: { max?: number; roundCents?: boolean },
): number => {
  const parsed = parseFiniteNumber(value);

  if (parsed === undefined || parsed <= 0) {
    throw new BadRequestError(`${fieldName} must be a positive number`);
  }

  if (options?.max !== undefined && parsed > options.max) {
    throw new BadRequestError(`${fieldName} must not exceed ${options.max}`);
  }

  return options?.roundCents ? Math.round(parsed * 100) / 100 : parsed;
};

export const parseBoundedInt = (
  value: unknown,
  fallback: number,
  options?: { min?: number; max?: number; fieldName?: string },
): number => {
  const raw = getFirstQueryValue(value);

  if (raw === undefined || raw === null || raw === "") {
    return fallback;
  }

  const parsed = parseFiniteNumber(raw);

  if (parsed === undefined || !Number.isInteger(parsed)) {
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

export const parseOptionalBoolean = (
  value: unknown,
  fieldName = "Flag",
): boolean | undefined => {
  const raw = getFirstQueryValue(value);

  if (raw === undefined || raw === null || raw === "") {
    return undefined;
  }

  if (typeof raw === "boolean") {
    return raw;
  }

  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }

  throw new BadRequestError(`${fieldName} must be true or false`);
};

export const parseRequiredBoolean = (
  value: unknown,
  fieldName = "Flag",
): boolean => {
  const parsed = parseOptionalBoolean(value, fieldName);
  if (parsed === undefined) {
    throw new BadRequestError(
      `${fieldName} is required and must be true or false`,
    );
  }
  return parsed;
};

export const parseOptionalDate = (
  value: unknown,
  fieldName = "Date",
  options?: { endOfDayIfDateOnly?: boolean },
): Date | undefined => {
  const raw = getFirstQueryValue(value);

  if (raw === undefined || raw === null || raw === "") {
    return undefined;
  }

  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) {
      throw new BadRequestError(`${fieldName} must be a valid date`);
    }
    return raw;
  }

  if (typeof raw !== "string") {
    throw new BadRequestError(`${fieldName} must be a valid date string`);
  }

  const trimmed = raw.trim();
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
    throw new BadRequestError(`${fieldName} must be a valid date`);
  }

  return parsed;
};

export const parseRequiredDate = (
  value: unknown,
  fieldName = "Date",
): Date => {
  const parsed = parseOptionalDate(value, fieldName);
  if (!parsed) {
    throw new BadRequestError(`${fieldName} is required`);
  }

  return parsed;
};

export const parseDateRange = (
  query: Record<string, unknown>,
  options?: { startKey?: string; endKey?: string },
): { startDate?: Date; endDate?: Date } => {
  const startKey = options?.startKey ?? "startDate";
  const endKey = options?.endKey ?? "endDate";
  const startDate = parseOptionalDate(query[startKey], startKey);
  const endDate = parseOptionalDate(query[endKey], endKey, {
    endOfDayIfDateOnly: true,
  });

  if (startDate && endDate && startDate > endDate) {
    throw new BadRequestError(`${startKey} cannot be later than ${endKey}`);
  }

  return { startDate, endDate };
};

export const parseOptionalEnum = <T extends string>(
  value: unknown,
  allowedOrEnum: readonly T[] | Record<string, T>,
  fieldName = "Value",
  errorMessage?: string,
): T | undefined => {
  const raw = parseOptionalString(value, fieldName);
  if (!raw) {
    return undefined;
  }

  const allowedValues = resolveEnumValues(allowedOrEnum);
  if (!allowedValues.includes(raw as T)) {
    throw new BadRequestError(
      errorMessage ??
        `${fieldName} must be one of: ${allowedValues.join(", ")}`,
    );
  }

  return raw as T;
};

export const parseRequiredEnum = <T extends string>(
  value: unknown,
  allowedOrEnum: readonly T[] | Record<string, T>,
  fieldName = "Value",
  errorMessage?: string,
): T => {
  const raw = parseRequiredString(value, fieldName);
  const allowedValues = resolveEnumValues(allowedOrEnum);

  if (!allowedValues.includes(raw as T)) {
    throw new BadRequestError(
      errorMessage ??
        `${fieldName} must be one of: ${allowedValues.join(", ")}`,
    );
  }

  return raw as T;
};

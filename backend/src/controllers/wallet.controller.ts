import { Request, Response } from "express";
import {
  PayoutMethodType,
  WalletTransactionSource,
  WalletTransactionType,
} from "@prisma/client";
import asyncHandler from "../utils/async-handler";
import walletService from "../services/wallet.service";
import { AuthenticationError, BadRequestError } from "../utils/errors";

/**
 * Wallet Controller
 * Handles user-facing wallet, payout method, transaction, and payout request endpoints.
 */

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_OFFSET = 100000;
const MAX_LABEL_LENGTH = 100;
const MAX_NOTE_LENGTH = 1000;

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

const getFirstQueryValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0].trim() : undefined;
  }

  if (typeof value === "string") {
    const parsed = value.trim();
    return parsed.length > 0 ? parsed : undefined;
  }

  return undefined;
};

const parseRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} is required`);
  }

  const parsed = value.trim();

  if (parsed.length === 0) {
    throw new BadRequestError(`${fieldName} cannot be empty`);
  }

  return parsed;
};

const parseOptionalString = (
  value: unknown,
  fieldName: string,
  maxLength?: number,
): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} must be a string`);
  }

  const parsed = value.trim();

  if (parsed.length === 0) {
    return undefined;
  }

  if (maxLength !== undefined && parsed.length > maxLength) {
    throw new BadRequestError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return parsed;
};

const parseRequiredLimitedString = (
  value: unknown,
  fieldName: string,
  maxLength: number,
): string => {
  const parsed = parseRequiredString(value, fieldName);

  if (parsed.length > maxLength) {
    throw new BadRequestError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return parsed;
};

const parseRequiredId = (value: unknown, fieldName: string): string => {
  return parseRequiredString(value, fieldName);
};

const parseOptionalBoolean = (
  value: unknown,
  fieldName: string,
): boolean | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = value.trim().toLowerCase();

    if (parsed === "true") return true;
    if (parsed === "false") return false;
  }

  throw new BadRequestError(`${fieldName} must be true or false`);
};

const parsePositiveInteger = (
  value: unknown,
  fallback: number | undefined,
  fieldName: string,
  max = MAX_LIMIT,
): number | undefined => {
  const rawValue = getFirstQueryValue(value);

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestError(`${fieldName} must be a positive integer`);
  }

  return Math.min(parsed, max);
};

const parseNonNegativeInteger = (
  value: unknown,
  fallback: number | undefined,
  fieldName: string,
  max = MAX_OFFSET,
): number | undefined => {
  const rawValue = getFirstQueryValue(value);

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BadRequestError(`${fieldName} must be a non-negative integer`);
  }

  return Math.min(parsed, max);
};

const parsePayoutMethodType = (value: unknown): PayoutMethodType => {
  const parsed = parseRequiredString(value, "type");

  if (!Object.values(PayoutMethodType).includes(parsed as PayoutMethodType)) {
    throw new BadRequestError(
      `type must be one of: ${Object.values(PayoutMethodType).join(", ")}`,
    );
  }

  return parsed as PayoutMethodType;
};

const parseWalletTransactionType = (
  value: unknown,
): WalletTransactionType | undefined => {
  const parsed = getFirstQueryValue(value);

  if (!parsed) {
    return undefined;
  }

  if (
    !Object.values(WalletTransactionType).includes(
      parsed as WalletTransactionType,
    )
  ) {
    throw new BadRequestError(
      `type must be one of: ${Object.values(WalletTransactionType).join(", ")}`,
    );
  }

  return parsed as WalletTransactionType;
};

const parseWalletTransactionSource = (
  value: unknown,
): WalletTransactionSource | undefined => {
  const parsed = getFirstQueryValue(value);

  if (!parsed) {
    return undefined;
  }

  if (
    !Object.values(WalletTransactionSource).includes(
      parsed as WalletTransactionSource,
    )
  ) {
    throw new BadRequestError(
      `source must be one of: ${Object.values(WalletTransactionSource).join(", ")}`,
    );
  }

  return parsed as WalletTransactionSource;
};

const parsePositiveAmount = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new BadRequestError("amount must be a positive number");
  }

  return Math.round(parsed * 100) / 100;
};

const validateJsonDetails = (value: unknown, required: boolean): unknown => {
  if (value === undefined) {
    if (required) {
      throw new BadRequestError("details is required");
    }

    return undefined;
  }

  if (value === null) {
    throw new BadRequestError("details cannot be null");
  }

  try {
    JSON.stringify(value);
  } catch {
    throw new BadRequestError("details must be valid JSON");
  }

  return value;
};

class WalletController {
  /**
   * Get current user's wallet summary.
   * GET /api/wallet/summary
   */
  getMySummary = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const data = await walletService.getSummary(userId);

    sendSuccess(res, data);
  });

  /**
   * List current user's wallet transactions.
   * GET /api/wallet/transactions
   */
  getMyTransactions = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const data = await walletService.listTransactions(userId, {
      limit: parsePositiveInteger(req.query.limit, undefined, "limit"),
      offset: parseNonNegativeInteger(req.query.offset, undefined, "offset"),
      type: parseWalletTransactionType(req.query.type),
      source: parseWalletTransactionSource(req.query.source),
    });

    sendSuccess(res, data);
  });

  /**
   * List current user's payout methods.
   * GET /api/wallet/payout-methods
   */
  listMyPayoutMethods = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const data = await walletService.listPayoutMethods(userId);

    sendSuccess(res, data);
  });

  /**
   * Add payout method.
   * POST /api/wallet/payout-methods
   */
  addPayoutMethod = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const data = await walletService.addPayoutMethod(userId, {
      type: parsePayoutMethodType(req.body?.type),
      label: parseRequiredLimitedString(
        req.body?.label,
        "label",
        MAX_LABEL_LENGTH,
      ),
      details: validateJsonDetails(req.body?.details, true),
      isDefault: parseOptionalBoolean(req.body?.isDefault, "isDefault"),
    });

    sendSuccess(res, data, "Payout method added successfully", 201);
  });

  /**
   * Update payout method.
   * PUT /api/wallet/payout-methods/:id
   */
  updatePayoutMethod = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const methodId = parseRequiredId(req.params.id, "Payout method ID");

    const data = await walletService.updatePayoutMethod(userId, methodId, {
      label: parseOptionalString(req.body?.label, "label", MAX_LABEL_LENGTH),
      details: validateJsonDetails(req.body?.details, false),
      isDefault: parseOptionalBoolean(req.body?.isDefault, "isDefault"),
    });

    sendSuccess(res, data, "Payout method updated successfully");
  });

  /**
   * Delete payout method.
   * DELETE /api/wallet/payout-methods/:id
   */
  deletePayoutMethod = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const methodId = parseRequiredId(req.params.id, "Payout method ID");

    const data = await walletService.deletePayoutMethod(userId, methodId);

    sendSuccess(res, data, "Payout method deleted successfully");
  });

  /**
   * Request a payout.
   * POST /api/wallet/payouts
   */
  requestPayout = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const data = await walletService.requestPayout(userId, {
      amount: parsePositiveAmount(req.body?.amount),
      methodId: parseOptionalString(req.body?.methodId, "methodId"),
      note: parseOptionalString(req.body?.note, "note", MAX_NOTE_LENGTH),
    });

    sendSuccess(res, data, "Payout requested successfully", 201);
  });

  /**
   * List current user's payout requests.
   * GET /api/wallet/payouts
   */
  listMyPayouts = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const data = await walletService.listMyPayouts(userId, {
      limit: parsePositiveInteger(
        req.query.limit,
        DEFAULT_LIMIT,
        "limit",
        MAX_LIMIT,
      ),
      offset: parseNonNegativeInteger(
        req.query.offset,
        0,
        "offset",
        MAX_OFFSET,
      ),
      status: getFirstQueryValue(req.query.status),
    });

    sendSuccess(res, data);
  });
}

export default new WalletController();

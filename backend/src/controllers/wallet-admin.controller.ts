import { Request, Response } from "express";
import { PayoutRequestStatus, UserRole } from "@prisma/client";
import asyncHandler from "../utils/async-handler";
import walletService from "../services/wallet.service";
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
} from "../utils/errors";

/**
 * Wallet Admin Controller
 * Handles admin payout listing and payout review endpoints.
 */

type PayoutAction = "approve" | "reject" | "processing" | "paid";

const ALLOWED_ACTIONS: readonly PayoutAction[] = [
  "approve",
  "reject",
  "processing",
  "paid",
] as const;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_OFFSET = 100000;
const MAX_ADMIN_NOTE_LENGTH = 2000;
const MAX_EXTERNAL_REFERENCE_LENGTH = 255;

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

const requireAdmin = (req: Request): string => {
  if (!req.user) {
    throw new AuthenticationError("Authentication required");
  }

  if (req.user.role !== UserRole.ADMIN) {
    throw new AuthorizationError("Admin access required");
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
  maxLength: number,
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

  if (parsed.length > maxLength) {
    throw new BadRequestError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return parsed;
};

const parsePayoutStatus = (value: unknown): PayoutRequestStatus | undefined => {
  const parsed = getFirstQueryValue(value);

  if (!parsed) {
    return undefined;
  }

  if (
    !Object.values(PayoutRequestStatus).includes(parsed as PayoutRequestStatus)
  ) {
    throw new BadRequestError(
      `status must be one of: ${Object.values(PayoutRequestStatus).join(", ")}`,
    );
  }

  return parsed as PayoutRequestStatus;
};

const parsePayoutAction = (value: unknown): PayoutAction => {
  const parsed = parseRequiredString(value, "action");

  if (!ALLOWED_ACTIONS.includes(parsed as PayoutAction)) {
    throw new BadRequestError(
      `action must be one of: ${ALLOWED_ACTIONS.join(", ")}`,
    );
  }

  return parsed as PayoutAction;
};

const parseNonNegativeInteger = (
  value: unknown,
  fallback: number,
  fieldName: string,
  max?: number,
): number => {
  const rawValue = getFirstQueryValue(value);

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BadRequestError(`${fieldName} must be a non-negative integer`);
  }

  return max !== undefined ? Math.min(parsed, max) : parsed;
};

const parsePositiveInteger = (
  value: unknown,
  fallback: number,
  fieldName: string,
  max?: number,
): number => {
  const rawValue = getFirstQueryValue(value);

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestError(`${fieldName} must be a positive integer`);
  }

  return max !== undefined ? Math.min(parsed, max) : parsed;
};

class WalletAdminController {
  /**
   * List payout requests.
   * Admin-only endpoint.
   * GET /admin/wallet/payouts?status=&limit=&offset=
   */
  listPayouts = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const status = parsePayoutStatus(req.query.status);
    const limit = parsePositiveInteger(
      req.query.limit,
      DEFAULT_LIMIT,
      "limit",
      MAX_LIMIT,
    );
    const offset = parseNonNegativeInteger(
      req.query.offset,
      0,
      "offset",
      MAX_OFFSET,
    );

    const data = await walletService.listPayoutRequests(status, limit, offset);

    sendSuccess(res, data);
  });

  /**
   * Review payout request.
   * Admin-only endpoint.
   * POST /admin/wallet/payouts/:id/review
   */
  reviewPayout = asyncHandler(async (req: Request, res: Response) => {
    requireAdmin(req);

    const payoutId = parseRequiredString(req.params.id, "Payout ID");
    const action = parsePayoutAction(req.body?.action);
    const adminNote = parseOptionalString(
      req.body?.adminNote,
      "adminNote",
      MAX_ADMIN_NOTE_LENGTH,
    );
    const externalReference = parseOptionalString(
      req.body?.externalReference,
      "externalReference",
      MAX_EXTERNAL_REFERENCE_LENGTH,
    );

    if (action === "reject" && !adminNote) {
      throw new BadRequestError(
        "adminNote is required when rejecting a payout",
      );
    }

    if (action === "paid" && !externalReference) {
      throw new BadRequestError(
        "externalReference is required when marking a payout as paid",
      );
    }

    const data = await walletService.reviewPayout(payoutId, action, {
      adminNote,
      externalReference,
    });

    sendSuccess(res, data, "Payout updated successfully");
  });
}

export default new WalletAdminController();

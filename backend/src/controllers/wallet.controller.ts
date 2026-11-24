import { Request, Response } from "express";
import {
  PayoutMethodType,
  PayoutRequestStatus,
  WalletTransactionSource,
  WalletTransactionType,
} from "@prisma/client";
import asyncHandler from "../utils/async-handler";
import walletService from "../services/wallet.service";
import { BadRequestError } from "../utils/errors";
import {
  parseOptionalBoolean,
  parseOptionalEnum,
  parseOptionalString,
  parsePositiveAmount,
  parseQueryNonNegativeInt,
  parseQueryPositiveInt,
  parseRequiredEnum,
  parseRequiredParam,
  parseRequiredString,
  requireAuthUserId,
  sendCreated,
  sendSuccess,
} from "../utils/http";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_OFFSET = 100000;
const MAX_LABEL_LENGTH = 100;
const MAX_NOTE_LENGTH = 2000;

const validateJsonDetails = (value: unknown, required: boolean): unknown => {
  if (value === undefined) {
    if (required) {
      throw new BadRequestError("details is required");
    }
    return undefined;
  }

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestError("details must be a JSON object");
  }

  try {
    JSON.stringify(value);
  } catch {
    throw new BadRequestError("details must be valid JSON");
  }

  return value;
};

class WalletController {
  getMySummary = asyncHandler(async (req: Request, res: Response) => {
    const data = await walletService.getSummary(requireAuthUserId(req));
    sendSuccess(res, data);
  });

  getMyTransactions = asyncHandler(async (req: Request, res: Response) => {
    const data = await walletService.listTransactions(requireAuthUserId(req), {
      limit: parseQueryPositiveInt(req.query.limit, "limit", {
        max: MAX_LIMIT,
      }),
      offset: parseQueryNonNegativeInt(req.query.offset, "offset", {
        max: MAX_OFFSET,
      }),
      type: parseOptionalEnum(req.query.type, WalletTransactionType, "type"),
      source: parseOptionalEnum(
        req.query.source,
        WalletTransactionSource,
        "source",
      ),
    });
    sendSuccess(res, data);
  });

  listMyPayoutMethods = asyncHandler(async (req: Request, res: Response) => {
    const data = await walletService.listPayoutMethods(requireAuthUserId(req));
    sendSuccess(res, data);
  });

  addPayoutMethod = asyncHandler(async (req: Request, res: Response) => {
    const data = await walletService.addPayoutMethod(requireAuthUserId(req), {
      type: parseRequiredEnum(req.body?.type, PayoutMethodType, "type"),
      label: parseRequiredString(req.body?.label, "label", {
        maxLength: MAX_LABEL_LENGTH,
      }),
      details: validateJsonDetails(req.body?.details, true),
      isDefault: parseOptionalBoolean(req.body?.isDefault, "isDefault", {
        rejectNull: true,
        rejectBlank: true,
      }),
    });
    sendCreated(res, data, "Payout method added successfully");
  });

  updatePayoutMethod = asyncHandler(async (req: Request, res: Response) => {
    const data = await walletService.updatePayoutMethod(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Payout method ID"),
      {
        label: parseOptionalString(req.body?.label, "label", {
          maxLength: MAX_LABEL_LENGTH,
          rejectBlank: true,
          rejectNull: true,
        }),
        details: validateJsonDetails(req.body?.details, false),
        isDefault: parseOptionalBoolean(req.body?.isDefault, "isDefault", {
          rejectNull: true,
          rejectBlank: true,
        }),
      },
    );
    sendSuccess(res, data, "Payout method updated successfully");
  });

  deletePayoutMethod = asyncHandler(async (req: Request, res: Response) => {
    const data = await walletService.deletePayoutMethod(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Payout method ID"),
    );
    sendSuccess(res, data, "Payout method deleted successfully");
  });

  requestPayout = asyncHandler(async (req: Request, res: Response) => {
    const data = await walletService.requestPayout(requireAuthUserId(req), {
      amount: parsePositiveAmount(req.body?.amount, "amount", {
        roundCents: true,
      }),
      methodId: parseOptionalString(req.body?.methodId, "methodId"),
      note: parseOptionalString(req.body?.note, "note", MAX_NOTE_LENGTH),
    });
    sendCreated(res, data, "Payout requested successfully");
  });

  listMyPayouts = asyncHandler(async (req: Request, res: Response) => {
    const data = await walletService.listMyPayouts(requireAuthUserId(req), {
      limit: parseQueryPositiveInt(req.query.limit, "limit", {
        fallback: DEFAULT_LIMIT,
        max: MAX_LIMIT,
      }),
      offset: parseQueryNonNegativeInt(req.query.offset, "offset", {
        fallback: 0,
        max: MAX_OFFSET,
      }),
      status: parseOptionalEnum(req.query.status, PayoutRequestStatus, "status"),
    });
    sendSuccess(res, data);
  });
}

export default new WalletController();

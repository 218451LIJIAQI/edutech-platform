import { Request, Response } from "express";
import { PayoutRequestStatus } from "@prisma/client";
import asyncHandler from "../utils/async-handler";
import walletService from "../services/wallet.service";
import { BadRequestError } from "../utils/errors";
import {
  parseOptionalEnum,
  parseOptionalString,
  parseQueryNonNegativeInt,
  parseQueryPositiveInt,
  parseRequiredEnum,
  parseRequiredParam,
  requireAdminUser,
  sendSuccess,
} from "../utils/http";

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

class WalletAdminController {
  listPayouts = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const data = await walletService.listPayoutRequests(
      parseOptionalEnum(req.query.status, PayoutRequestStatus, "status"),
      parseQueryPositiveInt(req.query.limit, "limit", {
        fallback: DEFAULT_LIMIT,
        max: MAX_LIMIT,
      }) as number,
      parseQueryNonNegativeInt(req.query.offset, "offset", {
        fallback: 0,
        max: MAX_OFFSET,
      }) as number,
    );
    sendSuccess(res, data);
  });

  reviewPayout = asyncHandler(async (req: Request, res: Response) => {
    requireAdminUser(req);
    const payoutId = parseRequiredParam(req.params.id, "Payout ID");
    const action = parseRequiredEnum(
      req.body?.action,
      ALLOWED_ACTIONS,
      "action",
    );
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

import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import walletService from '../services/wallet.service';

// Allowed admin actions for payout review
type PayoutAction = 'approve' | 'reject' | 'processing' | 'paid';
const ALLOWED_ACTIONS = new Set<PayoutAction>(['approve', 'reject', 'processing', 'paid']);

// Helpers
function toInt(value: unknown, defaultValue: number, opts: { min?: number; max?: number } = {}): number {
  const { min, max } = opts;
  let n: number;
  if (typeof value === 'number') n = Math.trunc(value);
  else if (typeof value === 'string') n = parseInt(value, 10);
  else n = NaN;

  if (!Number.isFinite(n)) n = defaultValue;
  if (typeof min === 'number' && n < min) n = min;
  if (typeof max === 'number' && n > max) n = max;
  return n;
}

function cleanString(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const v = val.trim();
  return v.length ? v : undefined;
}

class WalletAdminController {
  // GET /admin/wallet/payouts?status=&limit=&offset=
  listPayouts = asyncHandler(async (req: Request, res: Response) => {
    const { status, limit, offset } = req.query as {
      status?: string;
      limit?: string;
      offset?: string;
    };

    const normalizedStatus = cleanString(status);
    const safeLimit = toInt(limit, 50, { min: 1, max: 100 });
    const safeOffset = toInt(offset, 0, { min: 0 });

    const data = await walletService.listPayoutRequests(normalizedStatus, safeLimit, safeOffset);

    res.status(200).json({ status: 'success', data });
  });

  // POST /admin/wallet/payouts/:id/review { action, adminNote?, externalReference? }
  reviewPayout = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { action, adminNote, externalReference } = req.body as {
      action?: string;
      adminNote?: string;
      externalReference?: string;
    };

    const cleanedId = cleanString(id);
    if (!cleanedId) {
      res.status(400).json({ status: 'fail', message: 'Invalid payout id' });
      return;
    }

    const actionStr = cleanString(action);
    if (!actionStr || !ALLOWED_ACTIONS.has(actionStr as PayoutAction)) {
      res.status(400).json({ status: 'fail', message: 'Invalid action' });
      return;
    }

    const data = await walletService.reviewPayout(cleanedId, actionStr as PayoutAction, {
      adminNote: cleanString(adminNote),
      externalReference: cleanString(externalReference),
    });

    res.status(200).json({ status: 'success', message: 'Payout updated', data });
  });
}

export default new WalletAdminController();

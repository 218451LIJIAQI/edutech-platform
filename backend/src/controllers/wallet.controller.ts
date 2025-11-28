import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import walletService from '../services/wallet.service';

class WalletController {
  /**
   * Get current user's wallet summary
   * GET /api/wallet/summary
   */
  getMySummary = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const data = await walletService.getSummary(userId);
    res.status(200).json({ status: 'success', data });
  });

  /**
   * List current user's wallet transactions
   * GET /api/wallet/transactions
   */
  getMyTransactions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { limit, offset, type, source } = req.query as {
      limit?: string;
      offset?: string;
      type?: string;
      source?: string;
    };
    const data = await walletService.listTransactions(userId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      type,
      source,
    });
    res.status(200).json({ status: 'success', data });
  });

  /**
   * List payout methods
   * GET /api/wallet/payout-methods
   */
  listMyPayoutMethods = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const data = await walletService.listPayoutMethods(userId);
    res.status(200).json({ status: 'success', data });
  });

  /**
   * Add payout method
   * POST /api/wallet/payout-methods
   */
  addPayoutMethod = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { type, label, details, isDefault } = req.body as {
      type: string;
      label: string;
      details: unknown;
      isDefault?: boolean;
    };
    const data = await walletService.addPayoutMethod(userId, { type, label, details, isDefault });
    res.status(201).json({ status: 'success', data });
  });

  /**
   * Update payout method
   * PUT /api/wallet/payout-methods/:id
   */
  updatePayoutMethod = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };
    const { label, details, isDefault } = req.body as {
      label?: string;
      details?: unknown;
      isDefault?: boolean;
    };
    const data = await walletService.updatePayoutMethod(userId, id, { label, details, isDefault });
    res.status(200).json({ status: 'success', data });
  });

  /**
   * Delete payout method
   * DELETE /api/wallet/payout-methods/:id
   */
  deletePayoutMethod = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };
    const data = await walletService.deletePayoutMethod(userId, id);
    res.status(200).json({ status: 'success', data });
  });

  /**
   * Request a payout
   * POST /api/wallet/payouts
   */
  requestPayout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { amount, methodId, note } = req.body as {
      amount: number;
      methodId?: string;
      note?: string;
    };
    const data = await walletService.requestPayout(userId, { amount: Number(amount), methodId, note });
    res.status(201).json({ status: 'success', message: 'Payout requested', data });
  });

  /**
   * List my payout requests
   * GET /api/wallet/payouts
   */
  listMyPayouts = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { limit, offset } = req.query as { limit?: string; offset?: string };
    const data = await walletService.listMyPayouts(userId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    res.status(200).json({ status: 'success', data });
  });
}

export default new WalletController();

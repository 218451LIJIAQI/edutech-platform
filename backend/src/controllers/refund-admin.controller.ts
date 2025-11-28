import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import refundAdminService from '../services/refund-admin.service';

class RefundAdminController {
  /**
   * Get all refunds with optional filters
   * GET /api/admin/refunds
   */
  getAllRefunds = asyncHandler(async (req: Request, res: Response) => {
    const { status, limit = '50', offset = '0' } = req.query as {
      status?: string | string[];
      limit?: string | string[];
      offset?: string | string[];
    };

    const pickFirst = (v?: string | string[]) =>
      Array.isArray(v) ? v[0] : v;

    const rawStatus = pickFirst(status);
    const rawLimit = pickFirst(limit) ?? '50';
    const rawOffset = pickFirst(offset) ?? '0';

    const parsedLimit = Number.parseInt(rawLimit, 10);
    const parsedOffset = Number.parseInt(rawOffset, 10);

    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 200)
      : 50;
    const safeOffset = Number.isFinite(parsedOffset)
      ? Math.max(parsedOffset, 0)
      : 0;

    const result = await refundAdminService.getAllRefunds(
      rawStatus ? rawStatus.trim() : undefined,
      safeLimit,
      safeOffset
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Get refund by ID
   * GET /api/admin/refunds/:id
   */
  getRefundById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const refundId = typeof id === 'string' ? id.trim() : String(id);

    const refund = await refundAdminService.getRefundById(refundId);

    res.status(200).json({
      status: 'success',
      data: refund,
    });
  });

  /**
   * Approve a refund request
   * POST /api/admin/refunds/:id/approve
   */
  approveRefund = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const refundId = typeof id === 'string' ? id.trim() : String(id);

    const { adminNotes } = (req.body || {}) as { adminNotes?: string };

    const refund = await refundAdminService.approveRefund(
      refundId,
      typeof adminNotes === 'string' ? adminNotes.trim() : adminNotes
    );

    res.status(200).json({
      status: 'success',
      message: 'Refund approved',
      data: refund,
    });
  });

  /**
   * Reject a refund request
   * POST /api/admin/refunds/:id/reject
   */
  rejectRefund = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const refundId = typeof id === 'string' ? id.trim() : String(id);

    const { rejectionReason } = (req.body || {}) as { rejectionReason: string };

    const refund = await refundAdminService.rejectRefund(
      refundId,
      typeof rejectionReason === 'string' ? rejectionReason.trim() : rejectionReason
    );

    res.status(200).json({
      status: 'success',
      message: 'Refund rejected',
      data: refund,
    });
  });

  /**
   * Mark refund as processing
   * POST /api/admin/refunds/:id/processing
   */
  markAsProcessing = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const refundId = typeof id === 'string' ? id.trim() : String(id);

    const { adminNotes } = (req.body || {}) as { adminNotes?: string };

    const refund = await refundAdminService.markAsProcessing(
      refundId,
      typeof adminNotes === 'string' ? adminNotes.trim() : adminNotes
    );

    res.status(200).json({
      status: 'success',
      message: 'Refund marked as processing',
      data: refund,
    });
  });

  /**
   * Complete a refund
   * POST /api/admin/refunds/:id/complete
   */
  completeRefund = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const refundId = typeof id === 'string' ? id.trim() : String(id);

    const { adminNotes } = (req.body || {}) as { adminNotes?: string };

    const refund = await refundAdminService.completeRefund(
      refundId,
      typeof adminNotes === 'string' ? adminNotes.trim() : adminNotes
    );

    res.status(200).json({
      status: 'success',
      message: 'Refund completed',
      data: refund,
    });
  });

  /**
   * Get refund statistics
   * GET /api/admin/refunds/stats
   */
  getStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await refundAdminService.getRefundStats();

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  });
}

export default new RefundAdminController();

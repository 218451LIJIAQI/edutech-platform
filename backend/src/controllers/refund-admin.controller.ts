import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import refundAdminService from '../services/refund-admin.service';

class RefundAdminController {
  /**
   * Get all refunds with optional filters
   */
  getAllRefunds = asyncHandler(async (req: Request, res: Response) => {
    const { status, limit = '50', offset = '0' } = req.query as {
      status?: string;
      limit?: string;
      offset?: string;
    };

    const result = await refundAdminService.getAllRefunds(
      status,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Get refund by ID
   */
  getRefundById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const refund = await refundAdminService.getRefundById(id);

    res.status(200).json({
      status: 'success',
      data: refund,
    });
  });

  /**
   * Approve a refund request
   */
  approveRefund = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { adminNotes } = req.body as { adminNotes?: string };

    const refund = await refundAdminService.approveRefund(id, adminNotes);

    res.status(200).json({
      status: 'success',
      message: 'Refund approved',
      data: refund,
    });
  });

  /**
   * Reject a refund request
   */
  rejectRefund = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { rejectionReason } = req.body as { rejectionReason: string };

    const refund = await refundAdminService.rejectRefund(id, rejectionReason);

    res.status(200).json({
      status: 'success',
      message: 'Refund rejected',
      data: refund,
    });
  });

  /**
   * Mark refund as processing
   */
  markAsProcessing = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { adminNotes } = req.body as { adminNotes?: string };

    const refund = await refundAdminService.markAsProcessing(id, adminNotes);

    res.status(200).json({
      status: 'success',
      message: 'Refund marked as processing',
      data: refund,
    });
  });

  /**
   * Complete a refund
   */
  completeRefund = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { adminNotes } = req.body as { adminNotes?: string };

    const refund = await refundAdminService.completeRefund(id, adminNotes);

    res.status(200).json({
      status: 'success',
      message: 'Refund completed',
      data: refund,
    });
  });

  /**
   * Get refund statistics
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


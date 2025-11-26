import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import supportAdminService from '../services/support-admin.service';

class SupportAdminController {
  /**
   * Get all support tickets with optional filters
   */
  getAllTickets = asyncHandler(async (req: Request, res: Response) => {
    const { status, priority, limit = '50', offset = '0' } = req.query as {
      status?: string;
      priority?: string;
      limit?: string;
      offset?: string;
    };

    const result = await supportAdminService.getAllTickets(
      status,
      priority,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Get support ticket by ID
   */
  getTicketById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const ticket = await supportAdminService.getTicketById(id);

    res.status(200).json({
      status: 'success',
      data: ticket,
    });
  });

  /**
   * Assign ticket to admin
   */
  assignTicket = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const adminId = req.user!.id;

    const ticket = await supportAdminService.assignTicket(id, adminId);

    res.status(200).json({
      status: 'success',
      message: 'Ticket assigned',
      data: ticket,
    });
  });

  /**
   * Add admin response to ticket
   */
  addResponse = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { message } = req.body as { message: string };
    const adminId = req.user!.id;

    const msg = await supportAdminService.addAdminResponse(id, adminId, message);

    res.status(201).json({
      status: 'success',
      message: 'Response added',
      data: msg,
    });
  });

  /**
   * Resolve support ticket
   */
  resolveTicket = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { resolution } = req.body as { resolution: string };

    const ticket = await supportAdminService.resolveTicket(id, resolution);

    res.status(200).json({
      status: 'success',
      message: 'Ticket resolved',
      data: ticket,
    });
  });

  /**
   * Close support ticket
   */
  closeTicket = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };

    const ticket = await supportAdminService.closeTicket(id);

    res.status(200).json({
      status: 'success',
      message: 'Ticket closed',
      data: ticket,
    });
  });

  /**
   * Get support ticket statistics
   */
  getStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await supportAdminService.getTicketStats();

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  });
}

export default new SupportAdminController();


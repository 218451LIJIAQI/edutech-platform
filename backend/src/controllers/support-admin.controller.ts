import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import supportAdminService from '../services/support-admin.service';

class SupportAdminController {
  /**
   * Get all support tickets with optional filters
   * GET /api/admin/support/tickets
   */
  getAllTickets = asyncHandler(async (req: Request, res: Response) => {
    const { status, priority, limit = '50', offset = '0' } = req.query as {
      status?: string | string[];
      priority?: string | string[];
      limit?: string | string[];
      offset?: string | string[];
    };

    const pickFirst = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

    const rawStatus = pickFirst(status);
    const rawPriority = pickFirst(priority);
    const rawLimit = pickFirst(limit) ?? '50';
    const rawOffset = pickFirst(offset) ?? '0';

    const parsedLimit = Number.parseInt(rawLimit, 10);
    const parsedOffset = Number.parseInt(rawOffset, 10);

    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 200)
      : 50;
    const safeOffset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

    const result = await supportAdminService.getAllTickets(
      rawStatus ? rawStatus.trim() : undefined,
      rawPriority ? rawPriority.trim() : undefined,
      safeLimit,
      safeOffset
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Get support ticket by ID
   * GET /api/admin/support/tickets/:id
   */
  getTicketById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const ticketId = typeof id === 'string' ? id.trim() : String(id);

    const ticket = await supportAdminService.getTicketById(ticketId);

    res.status(200).json({
      status: 'success',
      data: ticket,
    });
  });

  /**
   * Assign ticket to admin
   * POST /api/admin/support/tickets/:id/assign
   */
  assignTicket = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const ticketId = typeof id === 'string' ? id.trim() : String(id);

    const adminId = req.user!.id;

    const ticket = await supportAdminService.assignTicket(ticketId, adminId);

    res.status(200).json({
      status: 'success',
      message: 'Ticket assigned',
      data: ticket,
    });
  });

  /**
   * Add admin response to ticket
   * POST /api/admin/support/tickets/:id/responses
   */
  addResponse = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const ticketId = typeof id === 'string' ? id.trim() : String(id);

    const { message } = (req.body || {}) as { message: string };
    const adminId = req.user!.id;

    const msg = await supportAdminService.addAdminResponse(
      ticketId,
      adminId,
      typeof message === 'string' ? message.trim() : message
    );

    res.status(201).json({
      status: 'success',
      message: 'Response added',
      data: msg,
    });
  });

  /**
   * Resolve support ticket
   * POST /api/admin/support/tickets/:id/resolve
   */
  resolveTicket = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const ticketId = typeof id === 'string' ? id.trim() : String(id);

    const { resolution } = (req.body || {}) as { resolution: string };

    const ticket = await supportAdminService.resolveTicket(
      ticketId,
      typeof resolution === 'string' ? resolution.trim() : resolution
    );

    res.status(200).json({
      status: 'success',
      message: 'Ticket resolved',
      data: ticket,
    });
  });

  /**
   * Close support ticket
   * POST /api/admin/support/tickets/:id/close
   */
  closeTicket = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const ticketId = typeof id === 'string' ? id.trim() : String(id);

    const ticket = await supportAdminService.closeTicket(ticketId);

    res.status(200).json({
      status: 'success',
      message: 'Ticket closed',
      data: ticket,
    });
  });

  /**
   * Get support ticket statistics
   * GET /api/admin/support/tickets/stats
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

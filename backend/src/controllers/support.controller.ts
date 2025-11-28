import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import supportService from '../services/support.service';

class SupportController {
  /**
   * Create a new support ticket
   * POST /api/support/tickets
   */
  createTicket = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { subject, description, category, orderId, priority } = (req.body || {}) as {
      subject: string;
      description: string;
      category: string;
      orderId?: string;
      priority?: string;
    };

    const ticket = await supportService.createTicket(
      userId,
      typeof subject === 'string' ? subject.trim() : subject,
      typeof description === 'string' ? description.trim() : description,
      typeof category === 'string' ? category.trim() : category,
      typeof orderId === 'string' ? orderId.trim() : orderId,
      typeof priority === 'string' ? priority.trim() : priority
    );

    res.status(201).json({
      status: 'success',
      message: 'Support ticket created',
      data: ticket,
    });
  });

  /**
   * Get all support tickets for the current user
   * GET /api/support/tickets
   */
  getUserTickets = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const tickets = await supportService.getUserTickets(userId);

    res.status(200).json({
      status: 'success',
      data: tickets,
    });
  });

  /**
   * Get a specific support ticket by ID
   * GET /api/support/tickets/:id
   */
  getTicketById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const ticketId = typeof id === 'string' ? id.trim() : String(id);

    const ticket = await supportService.getTicketById(userId, ticketId);

    res.status(200).json({
      status: 'success',
      data: ticket,
    });
  });

  /**
   * Add a message to a support ticket
   * POST /api/support/tickets/:id/messages
   */
  addMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { message, attachment } = (req.body || {}) as {
      message: string;
      attachment?: string;
    };

    const ticketId = typeof id === 'string' ? id.trim() : String(id);

    const msg = await supportService.addMessage(
      userId,
      ticketId,
      typeof message === 'string' ? message.trim() : message,
      typeof attachment === 'string' ? attachment.trim() : attachment
    );

    res.status(201).json({
      status: 'success',
      message: 'Message added',
      data: msg,
    });
  });

  /**
   * Close a support ticket
   * POST /api/support/tickets/:id/close
   */
  closeTicket = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { resolution } = (req.body || {}) as { resolution?: string };

    const ticketId = typeof id === 'string' ? id.trim() : String(id);

    const ticket = await supportService.closeTicket(
      userId,
      ticketId,
      typeof resolution === 'string' ? resolution.trim() : resolution
    );

    res.status(200).json({
      status: 'success',
      message: 'Support ticket closed',
      data: ticket,
    });
  });

  /**
   * Get support tickets for a specific order
   * GET /api/support/orders/:orderId/tickets
   */
  getTicketsByOrderId = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { orderId } = req.params;

    const normalizedOrderId =
      typeof orderId === 'string' ? orderId.trim() : String(orderId);

    const tickets = await supportService.getTicketsByOrderId(
      userId,
      normalizedOrderId
    );

    res.status(200).json({
      status: 'success',
      data: tickets,
    });
  });

  /**
   * Get support statistics for the current user
   * GET /api/support/stats
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const stats = await supportService.getStats(userId);

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  });
}

export default new SupportController();

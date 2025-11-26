import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import supportService from '../services/support.service';

class SupportController {
  /**
   * Create a new support ticket
   */
  createTicket = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { subject, description, category, orderId, priority } = req.body as {
      subject: string;
      description: string;
      category: string;
      orderId?: string;
      priority?: string;
    };

    const ticket = await supportService.createTicket(
      userId,
      subject,
      description,
      category,
      orderId,
      priority
    );

    res.status(201).json({
      status: 'success',
      message: 'Support ticket created',
      data: ticket,
    });
  });

  /**
   * Get all support tickets for the current user
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
   */
  getTicketById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };

    const ticket = await supportService.getTicketById(userId, id);

    res.status(200).json({
      status: 'success',
      data: ticket,
    });
  });

  /**
   * Add a message to a support ticket
   */
  addMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };
    const { message, attachment } = req.body as {
      message: string;
      attachment?: string;
    };

    const msg = await supportService.addMessage(userId, id, message, attachment);

    res.status(201).json({
      status: 'success',
      message: 'Message added',
      data: msg,
    });
  });

  /**
   * Close a support ticket
   */
  closeTicket = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };
    const { resolution } = req.body as { resolution?: string };

    const ticket = await supportService.closeTicket(userId, id, resolution);

    res.status(200).json({
      status: 'success',
      message: 'Support ticket closed',
      data: ticket,
    });
  });

  /**
   * Get support tickets for a specific order
   */
  getTicketsByOrderId = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { orderId } = req.params as { orderId: string };

    const tickets = await supportService.getTicketsByOrderId(userId, orderId);

    res.status(200).json({
      status: 'success',
      data: tickets,
    });
  });

  /**
   * Get support statistics for the current user
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


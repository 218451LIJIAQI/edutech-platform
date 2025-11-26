import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { SupportTicketStatus } from '@prisma/client';

/**
 * Admin Support Ticket Management Service
 * Handles support ticket management by admins
 */
class SupportAdminService {
  /**
   * Get all support tickets with filters
   */
  async getAllTickets(
    status?: string,
    priority?: string,
    limit: number = 50,
    offset: number = 0
  ) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          messages: {
            include: {
              sender: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get support ticket by ID
   */
  async getTicketById(ticketId: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) throw new NotFoundError('Support ticket not found');
    return ticket;
  }

  /**
   * Assign ticket to admin
   */
  async assignTicket(ticketId: string, adminId: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundError('Support ticket not found');

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedTo: adminId,
        status: SupportTicketStatus.IN_PROGRESS,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  /**
   * Add admin response to ticket
   */
  async addAdminResponse(ticketId: string, adminId: string, message: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundError('Support ticket not found');

    const msg = await prisma.supportTicketMessage.create({
      data: {
        ticketId,
        senderId: adminId,
        message,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update ticket's updatedAt
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    return msg;
  }

  /**
   * Resolve support ticket
   */
  async resolveTicket(ticketId: string, resolution: string) {
    if (!resolution.trim()) {
      throw new ValidationError('Resolution is required');
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundError('Support ticket not found');

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: SupportTicketStatus.RESOLVED,
        resolution,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  /**
   * Close support ticket
   */
  async closeTicket(ticketId: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundError('Support ticket not found');

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: SupportTicketStatus.CLOSED,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  /**
   * Get support ticket statistics
   */
  async getTicketStats() {
    const [open, inProgress, resolved, closed] = await Promise.all([
      prisma.supportTicket.count({ where: { status: SupportTicketStatus.OPEN } }),
      prisma.supportTicket.count({ where: { status: SupportTicketStatus.IN_PROGRESS } }),
      prisma.supportTicket.count({ where: { status: SupportTicketStatus.RESOLVED } }),
      prisma.supportTicket.count({ where: { status: SupportTicketStatus.CLOSED } }),
    ]);

    return {
      open,
      inProgress,
      resolved,
      closed,
      total: open + inProgress + resolved + closed,
    };
  }
}

export default new SupportAdminService();


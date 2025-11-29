import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { SupportTicketStatus, SupportTicketPriority, Prisma } from '@prisma/client';

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
    // sanitize pagination
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 100) : 50;
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;

    // build filters with enum validation
    const where: Prisma.SupportTicketWhereInput = {};

    if (status && (Object.values(SupportTicketStatus) as string[]).includes(status)) {
      where.status = status as SupportTicketStatus;
    }

    if (priority && (Object.values(SupportTicketPriority) as string[]).includes(priority)) {
      where.priority = priority as SupportTicketPriority;
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
        take: safeLimit,
        skip: safeOffset,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      total,
      limit: safeLimit,
      offset: safeOffset,
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
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return updated;
  }

  /**
   * Add admin response to ticket
   */
  async addAdminResponse(ticketId: string, adminId: string, message: string) {
    const trimmed = (message ?? '').trim();
    if (!trimmed) {
      throw new ValidationError('Message is required');
    }

    // Create message and conditionally update ticket status within a transaction
    const msg = await prisma.$transaction(async (tx) => {
      const createdMsg = await tx.supportTicketMessage.create({
        data: {
          ticketId,
          senderId: adminId,
          message: trimmed,
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

      // Conditionally bump status to IN_PROGRESS if currently OPEN
      await tx.supportTicket.updateMany({
        where: { 
          id: ticketId,
          status: SupportTicketStatus.OPEN,
        },
        data: { 
          status: SupportTicketStatus.IN_PROGRESS,
        },
      });

      return createdMsg;
    });

    return msg;
  }

  /**
   * Resolve support ticket
   */
  async resolveTicket(ticketId: string, resolution: string) {
    const trimmedResolution = (resolution ?? '').trim();
    if (!trimmedResolution) {
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
        resolution: trimmedResolution,
        resolvedAt: new Date(),
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
          orderBy: { createdAt: 'asc' },
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
          orderBy: { createdAt: 'asc' },
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

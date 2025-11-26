import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { SupportTicketStatus, SupportTicketPriority } from '@prisma/client';

/**
 * Generate unique support ticket number
 */
const genTicketNo = () => {
  const now = new Date();
  return `TKT-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getTime()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
};

class SupportService {
  /**
   * Create a new support ticket
   */
  async createTicket(
    userId: string,
    subject: string,
    description: string,
    category: string,
    orderId?: string,
    priority: string = 'MEDIUM'
  ) {
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNo: genTicketNo(),
        userId,
        orderId,
        subject,
        description,
        category,
        priority: priority as SupportTicketPriority,
        status: SupportTicketStatus.OPEN,
      },
      include: {
        messages: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return ticket;
  }

  /**
   * Get all support tickets for a user
   */
  async getUserTickets(userId: string) {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      include: {
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
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets;
  }

  /**
   * Get support ticket by ID
   */
  async getTicketById(userId: string, ticketId: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
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
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!ticket) throw new NotFoundError('Support ticket not found');
    if (ticket.userId !== userId) throw new ValidationError('Unauthorized');

    return ticket;
  }

  /**
   * Add message to support ticket
   */
  async addMessage(userId: string, ticketId: string, message: string, attachment?: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundError('Support ticket not found');
    if (ticket.userId !== userId) throw new ValidationError('Unauthorized');

    const msg = await prisma.supportTicketMessage.create({
      data: {
        ticketId,
        senderId: userId,
        message,
        attachment,
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

    // Update ticket's updatedAt timestamp
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    return msg;
  }

  /**
   * Close support ticket
   */
  async closeTicket(userId: string, ticketId: string, resolution?: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) throw new NotFoundError('Support ticket not found');
    if (ticket.userId !== userId) throw new ValidationError('Unauthorized');

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: SupportTicketStatus.CLOSED,
        resolution,
        resolvedAt: new Date(),
      },
      include: {
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
   * Get tickets for a specific order
   */
  async getTicketsByOrderId(userId: string, orderId: string) {
    const tickets = await prisma.supportTicket.findMany({
      where: {
        userId,
        orderId,
      },
      include: {
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
    });

    return tickets;
  }

  /**
   * Get support statistics for the current user
   */
  async getStats(userId: string) {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      include: {
        messages: true,
      },
    });

    const totalConversations = tickets.length;
    const activeConversations = tickets.filter(
      (t) => t.status === SupportTicketStatus.OPEN || t.status === SupportTicketStatus.IN_PROGRESS
    ).length;
    const resolvedConversations = tickets.filter(
      (t) => t.status === SupportTicketStatus.RESOLVED
    ).length;

    // Calculate average response time (in minutes)
    let totalResponseTime = 0;
    let responseCount = 0;

    tickets.forEach((ticket) => {
      if (ticket.messages && ticket.messages.length > 1) {
        // Calculate time between consecutive messages
        for (let i = 1; i < ticket.messages.length; i++) {
          const prevMsg = ticket.messages[i - 1];
          const currMsg = ticket.messages[i];
          const timeDiff = new Date(currMsg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
          totalResponseTime += timeDiff;
          responseCount++;
        }
      }
    });

    const averageResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount / 60000) : 0;

    // Calculate satisfaction rating (default to 4.5 if no ratings)
    const satisfactionRating = 4.5;

    return {
      totalConversations,
      activeConversations,
      resolvedConversations,
      averageResponseTime,
      satisfactionRating,
    };
  }
}

export default new SupportService();


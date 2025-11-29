import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { SupportTicketStatus, SupportTicketPriority } from '@prisma/client';
import type { SupportTicket, SupportTicketMessage } from '@prisma/client';

// Type definitions for support tickets with relations
type SupportTicketWithMessages = SupportTicket & {
  messages: (SupportTicketMessage & {
    sender: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  })[];
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
};

type SupportTicketWithUser = SupportTicket & {
  messages: SupportTicketMessage[];
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
};

type SupportTicketMessageWithSender = SupportTicketMessage & {
  sender: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
};

/**
 * Generate unique support ticket number
 */
const genTicketNo = () => {
  const now = new Date();
  return `TKT-${now.getFullYear()}${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getTime()}-${Math.floor(
    Math.random() * 1000
  )
    .toString()
    .padStart(3, '0')}`;
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
  ): Promise<SupportTicketWithUser> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const trimmedSubject = (subject ?? '').trim();
    const trimmedDescription = (description ?? '').trim();
    const trimmedCategory = (category ?? '').trim();

    if (!trimmedSubject) throw new ValidationError('Subject is required');
    if (!trimmedDescription) throw new ValidationError('Description is required');
    if (!trimmedCategory) throw new ValidationError('Category is required');

    const validPriority = (Object.values(SupportTicketPriority) as string[]).includes(priority)
      ? (priority as SupportTicketPriority)
      : SupportTicketPriority.MEDIUM;

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNo: genTicketNo(),
        userId: userId.trim(),
        orderId: orderId?.trim() || null,
        subject: trimmedSubject,
        description: trimmedDescription,
        category: trimmedCategory,
        priority: validPriority,
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
  async getUserTickets(userId: string): Promise<SupportTicketWithMessages[]> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: userId.trim() },
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
   * Get support ticket by ID (scoped to current user)
   */
  async getTicketById(userId: string, ticketId: string): Promise<SupportTicketWithMessages> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    if (!ticketId || !ticketId.trim()) {
      throw new ValidationError('Ticket ID is required');
    }
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId.trim(), userId: userId.trim() },
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

    return ticket;
  }

  /**
   * Add message to support ticket
   */
  async addMessage(userId: string, ticketId: string, message: string, attachment?: string): Promise<SupportTicketMessageWithSender> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    if (!ticketId || !ticketId.trim()) {
      throw new ValidationError('Ticket ID is required');
    }
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId.trim(), userId: userId.trim() },
    });

    if (!ticket) throw new NotFoundError('Support ticket not found');

    const trimmedMessage = (message ?? '').trim();
    if (!trimmedMessage) throw new ValidationError('Message is required');

    // Create message (ticket updatedAt will be automatically updated by Prisma)
    const msg = await prisma.supportTicketMessage.create({
      data: {
        ticketId: ticketId.trim(),
        senderId: userId.trim(),
        message: trimmedMessage,
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

    return msg;
  }

  /**
   * Close support ticket
   */
  async closeTicket(userId: string, ticketId: string, resolution?: string): Promise<SupportTicketWithMessages> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    if (!ticketId || !ticketId.trim()) {
      throw new ValidationError('Ticket ID is required');
    }
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId.trim(), userId: userId.trim() },
    });

    if (!ticket) throw new NotFoundError('Support ticket not found');

    const trimmedResolution = resolution?.trim();

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId.trim() },
      data: {
        status: SupportTicketStatus.CLOSED,
        resolution: trimmedResolution,
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

    return updated;
  }

  /**
   * Get tickets for a specific order
   */
  async getTicketsByOrderId(userId: string, orderId: string): Promise<SupportTicketWithMessages[]> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    if (!orderId || !orderId.trim()) {
      throw new ValidationError('Order ID is required');
    }
    const tickets = await prisma.supportTicket.findMany({
      where: {
        userId: userId.trim(),
        orderId: orderId.trim(),
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
   * Get support statistics for the current user
   */
  async getStats(userId: string): Promise<{
    totalConversations: number;
    activeConversations: number;
    resolvedConversations: number;
    averageResponseTime: number;
    satisfactionRating: number;
  }> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: userId.trim() },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const totalConversations = tickets.length;
    const activeConversations = tickets.filter(
      (t) => t.status === SupportTicketStatus.OPEN || t.status === SupportTicketStatus.IN_PROGRESS
    ).length;
    const resolvedConversations = tickets.filter(
      (t) => t.status === SupportTicketStatus.RESOLVED || t.status === SupportTicketStatus.CLOSED
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
          const timeDiff =
            new Date(currMsg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
          totalResponseTime += timeDiff;
          responseCount++;
        }
      }
    });

    const averageResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount / 60000) : 0;

    // Placeholder satisfaction metric; replace with real feedback aggregation when available
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

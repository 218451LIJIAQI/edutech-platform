import {
  Prisma,
  SupportTicketPriority,
  SupportTicketStatus,
  UserRole,
} from "@prisma/client";
import prisma from "../config/database";
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from "../utils/errors";
import {
  ensureUrlOrUploadPathForFolders,
  normalizeOptionalUrlOrPath,
} from "../utils/url-or-path";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";

const ticketUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const ticketWithDetailsInclude = {
  user: {
    select: ticketUserSelect,
  },
  messages: {
    include: {
      sender: {
        select: ticketUserSelect,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  },
} satisfies Prisma.SupportTicketInclude;

const messageWithSenderInclude = {
  sender: {
    select: ticketUserSelect,
  },
} satisfies Prisma.SupportTicketMessageInclude;

type SupportTicketWithDetails = Prisma.SupportTicketGetPayload<{
  include: typeof ticketWithDetailsInclude;
}>;

type SupportTicketMessageWithSender = Prisma.SupportTicketMessageGetPayload<{
  include: typeof messageWithSenderInclude;
}>;

const SUPPORT_TICKET_STATUSES = Object.values(
  SupportTicketStatus,
) as SupportTicketStatus[];
const SUPPORT_TICKET_PRIORITIES = Object.values(
  SupportTicketPriority,
) as SupportTicketPriority[];

const MAX_MESSAGE_LENGTH = 5000;
const MAX_RESOLUTION_LENGTH = 5000;

const normalizeRequiredText = (
  value: string | undefined,
  fieldName: string,
): string => {
  const normalizedValue =
    value === undefined ? undefined : sanitizeUserPlainText(value);

  if (!normalizedValue) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return normalizedValue;
};

const normalizeLongText = (
  value: string | undefined,
  fieldName: string,
  maxLength: number,
): string => {
  const normalizedValue = normalizeRequiredText(value, fieldName);

  if (normalizedValue.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return normalizedValue;
};

const parseOptionalTicketStatus = (
  status?: string,
): SupportTicketStatus | undefined => {
  const normalizedStatus = status?.trim().toUpperCase();

  if (!normalizedStatus) {
    return undefined;
  }

  if (
    !SUPPORT_TICKET_STATUSES.includes(normalizedStatus as SupportTicketStatus)
  ) {
    throw new ValidationError(
      `Invalid support ticket status. Allowed values: ${SUPPORT_TICKET_STATUSES.join(", ")}`,
    );
  }

  return normalizedStatus as SupportTicketStatus;
};

const parseOptionalTicketPriority = (
  priority?: string,
): SupportTicketPriority | undefined => {
  const normalizedPriority = priority?.trim().toUpperCase();

  if (!normalizedPriority) {
    return undefined;
  }

  if (
    !SUPPORT_TICKET_PRIORITIES.includes(
      normalizedPriority as SupportTicketPriority,
    )
  ) {
    throw new ValidationError(
      `Invalid support ticket priority. Allowed values: ${SUPPORT_TICKET_PRIORITIES.join(", ")}`,
    );
  }

  return normalizedPriority as SupportTicketPriority;
};

const normalizePagination = (
  limit: number = 50,
  offset: number = 0,
): { safeLimit: number; safeOffset: number } => ({
  safeLimit: Number.isFinite(limit)
    ? Math.min(Math.max(Math.floor(limit), 1), 100)
    : 50,
  safeOffset: Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0,
});

const normalizeSupportAttachment = (
  attachment?: string,
): string | null | undefined =>
  normalizeOptionalUrlOrPath(
    attachment
      ? ensureUrlOrUploadPathForFolders(
          attachment,
          ["support-attachments"],
          "Support attachments must be an external URL or use the /uploads/support-attachments/ folder",
        )
      : attachment,
  );

const fetchTicketWithDetails = async (
  ticketId: string,
): Promise<SupportTicketWithDetails> => {
  const ticket = await prisma.supportTicket.findUnique({
    where: {
      id: ticketId,
    },
    include: ticketWithDetailsInclude,
  });

  if (!ticket) {
    throw new NotFoundError("Support ticket not found");
  }

  return ticket;
};

const ensureActiveAdmin = async (adminId: string): Promise<void> => {
  const normalizedAdminId = normalizeRequiredText(adminId, "Admin ID");

  const admin = await prisma.user.findUnique({
    where: {
      id: normalizedAdminId,
    },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!admin) {
    throw new NotFoundError("Admin user not found");
  }

  if (admin.role !== UserRole.ADMIN) {
    throw new AuthorizationError("Only admins can manage support tickets");
  }

  if (!admin.isActive) {
    throw new AuthorizationError(
      "Inactive admins cannot manage support tickets",
    );
  }
};

/**
 * Admin Support Ticket Management Service
 * Handles support ticket management by admins.
 */
class SupportAdminService {
  /**
   * Get all support tickets with optional filters.
   */
  async getAllTickets(
    status?: string,
    priority?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{
    tickets: SupportTicketWithDetails[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const parsedStatus = parseOptionalTicketStatus(status);
    const parsedPriority = parseOptionalTicketPriority(priority);
    const { safeLimit, safeOffset } = normalizePagination(limit, offset);

    const where: Prisma.SupportTicketWhereInput = {
      ...(parsedStatus ? { status: parsedStatus } : {}),
      ...(parsedPriority ? { priority: parsedPriority } : {}),
    };

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: ticketWithDetailsInclude,
        orderBy: {
          updatedAt: "desc",
        },
        take: safeLimit,
        skip: safeOffset,
      }),
      prisma.supportTicket.count({
        where,
      }),
    ]);

    return {
      tickets,
      total,
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  /**
   * Get support ticket by ID.
   */
  async getTicketById(ticketId: string): Promise<SupportTicketWithDetails> {
    const normalizedTicketId = normalizeRequiredText(
      ticketId,
      "Support ticket ID",
    );
    return fetchTicketWithDetails(normalizedTicketId);
  }

  /**
   * Assign a support ticket to an admin.
   */
  async assignTicket(
    ticketId: string,
    adminId: string,
  ): Promise<SupportTicketWithDetails> {
    const normalizedTicketId = normalizeRequiredText(
      ticketId,
      "Support ticket ID",
    );
    const normalizedAdminId = normalizeRequiredText(adminId, "Admin ID");

    await ensureActiveAdmin(normalizedAdminId);

    const updatedCount = await prisma.supportTicket.updateMany({
      where: {
        id: normalizedTicketId,
        status: {
          not: SupportTicketStatus.CLOSED,
        },
      },
      data: {
        assignedTo: normalizedAdminId,
        status: SupportTicketStatus.IN_PROGRESS,
        resolution: null,
        resolvedAt: null,
      },
    });

    if (updatedCount.count !== 1) {
      const existingTicket = await prisma.supportTicket.findUnique({
        where: {
          id: normalizedTicketId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!existingTicket) {
        throw new NotFoundError("Support ticket not found");
      }

      throw new ValidationError("Closed tickets cannot be assigned");
    }

    return fetchTicketWithDetails(normalizedTicketId);
  }

  /**
   * Add an admin response to a support ticket.
   */
  async addAdminResponse(
    ticketId: string,
    adminId: string,
    message: string,
    attachment?: string,
  ): Promise<SupportTicketMessageWithSender> {
    const normalizedTicketId = normalizeRequiredText(
      ticketId,
      "Support ticket ID",
    );
    const normalizedAdminId = normalizeRequiredText(adminId, "Admin ID");
    const normalizedMessage = normalizeLongText(
      message,
      "Message",
      MAX_MESSAGE_LENGTH,
    );
    const normalizedAttachment = normalizeSupportAttachment(attachment);

    await ensureActiveAdmin(normalizedAdminId);

    return prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.findUnique({
        where: {
          id: normalizedTicketId,
        },
        select: {
          id: true,
          status: true,
          assignedTo: true,
        },
      });

      if (!ticket) {
        throw new NotFoundError("Support ticket not found");
      }

      if (ticket.status === SupportTicketStatus.CLOSED) {
        throw new ValidationError(
          "Closed tickets cannot receive new responses",
        );
      }

      const createdMessage = await tx.supportTicketMessage.create({
        data: {
          ticketId: normalizedTicketId,
          senderId: normalizedAdminId,
          message: normalizedMessage,
          attachment: normalizedAttachment,
        },
        include: messageWithSenderInclude,
      });

      await tx.supportTicket.update({
        where: {
          id: normalizedTicketId,
        },
        data: {
          assignedTo: ticket.assignedTo ?? normalizedAdminId,
          status: SupportTicketStatus.IN_PROGRESS,
          ...(ticket.status === SupportTicketStatus.RESOLVED
            ? {
                resolution: null,
                resolvedAt: null,
              }
            : {}),
        },
      });

      return createdMessage;
    });
  }

  /**
   * Resolve a support ticket.
   */
  async resolveTicket(
    ticketId: string,
    resolution: string,
  ): Promise<SupportTicketWithDetails> {
    const normalizedTicketId = normalizeRequiredText(
      ticketId,
      "Support ticket ID",
    );
    const normalizedResolution = normalizeLongText(
      resolution,
      "Resolution",
      MAX_RESOLUTION_LENGTH,
    );

    const updatedCount = await prisma.supportTicket.updateMany({
      where: {
        id: normalizedTicketId,
        status: {
          notIn: [SupportTicketStatus.CLOSED, SupportTicketStatus.RESOLVED],
        },
      },
      data: {
        status: SupportTicketStatus.RESOLVED,
        resolution: normalizedResolution,
        resolvedAt: new Date(),
      },
    });

    if (updatedCount.count !== 1) {
      const existingTicket = await prisma.supportTicket.findUnique({
        where: {
          id: normalizedTicketId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!existingTicket) {
        throw new NotFoundError("Support ticket not found");
      }

      if (existingTicket.status === SupportTicketStatus.CLOSED) {
        throw new ValidationError("Closed tickets cannot be resolved");
      }

      throw new ValidationError("Support ticket is already resolved");
    }

    return fetchTicketWithDetails(normalizedTicketId);
  }

  /**
   * Close a support ticket.
   */
  async closeTicket(ticketId: string): Promise<SupportTicketWithDetails> {
    const normalizedTicketId = normalizeRequiredText(
      ticketId,
      "Support ticket ID",
    );

    const ticket = await prisma.supportTicket.findUnique({
      where: {
        id: normalizedTicketId,
      },
      select: {
        id: true,
        status: true,
        resolvedAt: true,
      },
    });

    if (!ticket) {
      throw new NotFoundError("Support ticket not found");
    }

    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new ValidationError("Support ticket is already closed");
    }

    await prisma.supportTicket.update({
      where: {
        id: normalizedTicketId,
      },
      data: {
        status: SupportTicketStatus.CLOSED,
        resolvedAt: ticket.resolvedAt ?? new Date(),
      },
    });

    return fetchTicketWithDetails(normalizedTicketId);
  }

  /**
   * Get support ticket statistics.
   */
  async getTicketStats(): Promise<{
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    total: number;
  }> {
    const groupedTickets = await prisma.supportTicket.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    });

    const stats = {
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      total: 0,
    };

    for (const item of groupedTickets) {
      const count = item._count._all;
      stats.total += count;

      if (item.status === SupportTicketStatus.OPEN) stats.open = count;
      if (item.status === SupportTicketStatus.IN_PROGRESS)
        stats.inProgress = count;
      if (item.status === SupportTicketStatus.RESOLVED) stats.resolved = count;
      if (item.status === SupportTicketStatus.CLOSED) stats.closed = count;
    }

    return stats;
  }
}

export default new SupportAdminService();

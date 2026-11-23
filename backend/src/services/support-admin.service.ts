import {
  Prisma,
  SupportTicketPriority,
  SupportTicketStatus,
} from "@prisma/client";
import prisma from "../config/database";
import { NotFoundError, ValidationError } from "../utils/errors";
import { normalizeOffsetPagination } from "./shared/pagination";
import {
  ensureActiveAdmin,
  normalizeRequiredSanitizedText,
  normalizeSupportAttachment,
} from "./shared/service-helpers";

const ticketUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const ticketWithDetailsInclude = {
  user: { select: ticketUserSelect },
  messages: {
    include: {
      sender: { select: ticketUserSelect },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.SupportTicketInclude;

const messageWithSenderInclude = {
  sender: { select: ticketUserSelect },
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

const parseOptionalTicketEnum = <T extends string>(
  raw: string | undefined,
  allowed: T[],
  label: string,
): T | undefined => {
  const normalized = raw?.trim().toUpperCase();
  if (!normalized) return undefined;

  if (!allowed.includes(normalized as T)) {
    throw new ValidationError(
      `Invalid ${label}. Allowed values: ${allowed.join(", ")}`,
    );
  }
  return normalized as T;
};

const fetchTicketWithDetails = async (
  ticketId: string,
): Promise<SupportTicketWithDetails> => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: ticketWithDetailsInclude,
  });

  if (!ticket) {
    throw new NotFoundError("Support ticket not found");
  }

  return ticket;
};

class SupportAdminService {
  async getAllTickets(
    status?: string,
    priority?: string,
    limit = 50,
    offset = 0,
  ): Promise<{
    tickets: SupportTicketWithDetails[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const parsedStatus = parseOptionalTicketEnum(
      status,
      SUPPORT_TICKET_STATUSES,
      "support ticket status",
    );
    const parsedPriority = parseOptionalTicketEnum(
      priority,
      SUPPORT_TICKET_PRIORITIES,
      "support ticket priority",
    );
    const pagination = normalizeOffsetPagination(limit, offset, {
      defaultLimit: 50,
      maxLimit: 100,
    });

    const where: Prisma.SupportTicketWhereInput = {
      ...(parsedStatus ? { status: parsedStatus } : {}),
      ...(parsedPriority ? { priority: parsedPriority } : {}),
    };

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: ticketWithDetailsInclude,
        orderBy: { updatedAt: "desc" },
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      total,
      limit: pagination.limit,
      offset: pagination.offset,
    };
  }

  async getTicketById(ticketId: string): Promise<SupportTicketWithDetails> {
    return fetchTicketWithDetails(
      normalizeRequiredSanitizedText(ticketId, "Support ticket ID"),
    );
  }

  async assignTicket(
    ticketId: string,
    adminId: string,
  ): Promise<SupportTicketWithDetails> {
    const normalizedTicketId = normalizeRequiredSanitizedText(
      ticketId,
      "Support ticket ID",
    );
    const normalizedAdminId = await ensureActiveAdmin(
      adminId,
      "manage support tickets",
    );

    const updatedCount = await prisma.supportTicket.updateMany({
      where: {
        id: normalizedTicketId,
        status: { not: SupportTicketStatus.CLOSED },
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
        where: { id: normalizedTicketId },
        select: { id: true },
      });

      if (!existingTicket) {
        throw new NotFoundError("Support ticket not found");
      }

      throw new ValidationError("Closed tickets cannot be assigned");
    }

    return fetchTicketWithDetails(normalizedTicketId);
  }

  async addAdminResponse(
    ticketId: string,
    adminId: string,
    message: string,
    attachment?: string,
  ): Promise<SupportTicketMessageWithSender> {
    const normalizedTicketId = normalizeRequiredSanitizedText(
      ticketId,
      "Support ticket ID",
    );
    const normalizedAdminId = await ensureActiveAdmin(
      adminId,
      "manage support tickets",
    );
    const normalizedMessage = normalizeRequiredSanitizedText(
      message,
      "Message",
      MAX_MESSAGE_LENGTH,
    );
    const normalizedAttachment = normalizeSupportAttachment(attachment);

    return prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.findUnique({
        where: { id: normalizedTicketId },
        select: { id: true, status: true, assignedTo: true },
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
        where: { id: normalizedTicketId },
        data: {
          assignedTo: ticket.assignedTo ?? normalizedAdminId,
          status: SupportTicketStatus.IN_PROGRESS,
          ...(ticket.status === SupportTicketStatus.RESOLVED
            ? { resolution: null, resolvedAt: null }
            : {}),
        },
      });

      return createdMessage;
    });
  }

  async resolveTicket(
    ticketId: string,
    resolution: string,
  ): Promise<SupportTicketWithDetails> {
    const normalizedTicketId = normalizeRequiredSanitizedText(
      ticketId,
      "Support ticket ID",
    );
    const normalizedResolution = normalizeRequiredSanitizedText(
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
        where: { id: normalizedTicketId },
        select: { id: true, status: true },
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

  async closeTicket(ticketId: string): Promise<SupportTicketWithDetails> {
    const normalizedTicketId = normalizeRequiredSanitizedText(
      ticketId,
      "Support ticket ID",
    );

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: normalizedTicketId },
      select: { id: true, status: true, resolvedAt: true },
    });

    if (!ticket) {
      throw new NotFoundError("Support ticket not found");
    }

    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new ValidationError("Support ticket is already closed");
    }

    await prisma.supportTicket.update({
      where: { id: normalizedTicketId },
      data: {
        status: SupportTicketStatus.CLOSED,
        resolvedAt: ticket.resolvedAt ?? new Date(),
      },
    });

    return fetchTicketWithDetails(normalizedTicketId);
  }

  async getTicketStats(): Promise<{
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    total: number;
  }> {
    const groupedTickets = await prisma.supportTicket.groupBy({
      by: ["status"],
      _count: { _all: true },
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

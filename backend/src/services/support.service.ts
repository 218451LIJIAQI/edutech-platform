import { randomInt } from "crypto";
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
import { buildProtectedAssetDescriptor } from "../utils/protected-asset";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";

const supportUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const supportTicketWithMessagesInclude = {
  messages: {
    include: {
      sender: {
        select: supportUserSelect,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  user: {
    select: supportUserSelect,
  },
} satisfies Prisma.SupportTicketInclude;

const supportTicketMessageWithSenderInclude = {
  sender: {
    select: supportUserSelect,
  },
} satisfies Prisma.SupportTicketMessageInclude;

type SupportTicketWithMessages = Prisma.SupportTicketGetPayload<{
  include: typeof supportTicketWithMessagesInclude;
}>;

type SupportTicketMessageWithSender = Prisma.SupportTicketMessageGetPayload<{
  include: typeof supportTicketMessageWithSenderInclude;
}>;

const SUPPORT_TICKET_PRIORITIES = Object.values(
  SupportTicketPriority,
) as SupportTicketPriority[];

const MAX_SUBJECT_LENGTH = 150;
const MAX_CATEGORY_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_TICKET_NO_CREATE_ATTEMPTS = 5;
const DEFAULT_TICKET_LIMIT = 20;
const MAX_TICKET_LIMIT = 100;

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

const normalizeLimitedText = (
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

const normalizeOptionalText = (value?: string): string | undefined => {
  const normalizedValue =
    value === undefined ? undefined : sanitizeUserPlainText(value);
  return normalizedValue || undefined;
};

const parseSupportPriority = (
  priority: string | SupportTicketPriority = SupportTicketPriority.MEDIUM,
): SupportTicketPriority => {
  const normalizedPriority = String(priority || SupportTicketPriority.MEDIUM)
    .trim()
    .toUpperCase();

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

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "P2002";

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

/**
 * Generate a readable and unique support ticket number candidate.
 */
const generateTicketNo = (): string => {
  const now = new Date();
  const datePart = `${now.getFullYear()}${(now.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}`;
  const timePart = now.getTime();
  const randomPart = randomInt(1000, 10000).toString();

  return `TKT-${datePart}-${timePart}-${randomPart}`;
};

const ensureActiveUser = async (userId: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!user.isActive) {
    throw new AuthorizationError("Inactive users cannot use support tickets");
  }
};

const assertOrderBelongsToUser = async (
  userId: string,
  orderId?: string | null,
): Promise<string | null> => {
  const normalizedOrderId = normalizeOptionalText(orderId ?? undefined);

  if (!normalizedOrderId) {
    return null;
  }

  const order = await prisma.order.findFirst({
    where: {
      id: normalizedOrderId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  return order.id;
};

const fetchUserTicketWithMessages = async (
  userId: string,
  ticketId: string,
): Promise<SupportTicketWithMessages> => {
  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id: ticketId,
      userId,
    },
    include: supportTicketWithMessagesInclude,
  });

  if (!ticket) {
    throw new NotFoundError("Support ticket not found");
  }

  return ticket;
};

const normalizeTicketPagination = (
  page?: number,
  limit?: number,
): { skip?: number; take?: number } => {
  if (page === undefined && limit === undefined) {
    return {};
  }

  const safePage =
    Number.isFinite(page) && page && page > 0 ? Math.floor(page) : 1;
  const safeLimit =
    Number.isFinite(limit) && limit
      ? Math.min(Math.max(Math.floor(limit), 1), MAX_TICKET_LIMIT)
      : DEFAULT_TICKET_LIMIT;

  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
};

class SupportService {
  /**
   * Create a new support ticket.
   */
  async createTicket(
    userId: string,
    subject: string,
    description: string,
    category: string,
    orderId?: string,
    priority: string = SupportTicketPriority.MEDIUM,
    attachment?: string,
  ): Promise<SupportTicketWithMessages> {
    const normalizedUserId = normalizeRequiredText(userId, "User ID");
    const normalizedSubject = normalizeLimitedText(
      subject,
      "Subject",
      MAX_SUBJECT_LENGTH,
    );
    const normalizedDescription = normalizeLimitedText(
      description,
      "Description",
      MAX_DESCRIPTION_LENGTH,
    );
    const normalizedCategory = normalizeLimitedText(
      category,
      "Category",
      MAX_CATEGORY_LENGTH,
    );
    const normalizedPriority = parseSupportPriority(priority);
    const normalizedAttachment = normalizeSupportAttachment(attachment);

    await ensureActiveUser(normalizedUserId);
    const normalizedOrderId = await assertOrderBelongsToUser(
      normalizedUserId,
      orderId,
    );

    for (
      let attempt = 1;
      attempt <= MAX_TICKET_NO_CREATE_ATTEMPTS;
      attempt += 1
    ) {
      try {
        return await prisma.supportTicket.create({
          data: {
            ticketNo: generateTicketNo(),
            userId: normalizedUserId,
            orderId: normalizedOrderId,
            subject: normalizedSubject,
            description: normalizedDescription,
            category: normalizedCategory,
            priority: normalizedPriority,
            status: SupportTicketStatus.OPEN,
            messages: {
              create: {
                senderId: normalizedUserId,
                message: normalizedDescription,
                attachment: normalizedAttachment,
              },
            },
          },
          include: supportTicketWithMessagesInclude,
        });
      } catch (error) {
        if (
          isUniqueConstraintError(error) &&
          attempt < MAX_TICKET_NO_CREATE_ATTEMPTS
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new ValidationError(
      "Unable to generate a unique support ticket number",
    );
  }

  /**
   * Build a protected descriptor for a support message attachment.
   * Admins can access all support attachments; users can access only their own ticket attachments.
   */
  async getMessageAttachmentAsset(
    requesterUserId: string,
    requesterRole: UserRole,
    messageId: string,
  ) {
    const normalizedRequesterUserId = normalizeRequiredText(
      requesterUserId,
      "User ID",
    );
    const normalizedMessageId = normalizeRequiredText(messageId, "Message ID");

    const message = await prisma.supportTicketMessage.findUnique({
      where: {
        id: normalizedMessageId,
      },
      select: {
        id: true,
        attachment: true,
        ticket: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!message || !message.attachment) {
      throw new NotFoundError("Support attachment not found");
    }

    if (
      requesterRole !== UserRole.ADMIN &&
      message.ticket.userId !== normalizedRequesterUserId
    ) {
      throw new NotFoundError("Support attachment not found");
    }

    return buildProtectedAssetDescriptor(message.attachment, {
      allowedFolders: ["support-attachments"],
      fallbackFileName: `support-attachment-${message.id}`,
    });
  }

  /**
   * Get all support tickets for a user.
   */
  async getUserTickets(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      status?: SupportTicketStatus;
    } = {},
  ): Promise<SupportTicketWithMessages[]> {
    const normalizedUserId = normalizeRequiredText(userId, "User ID");
    const pagination = normalizeTicketPagination(params.page, params.limit);

    return prisma.supportTicket.findMany({
      where: {
        userId: normalizedUserId,
        ...(params.status ? { status: params.status } : {}),
      },
      include: supportTicketWithMessagesInclude,
      orderBy: {
        updatedAt: "desc",
      },
      ...pagination,
    });
  }

  /**
   * Get support ticket by ID, scoped to the current user.
   */
  async getTicketById(
    userId: string,
    ticketId: string,
  ): Promise<SupportTicketWithMessages> {
    const normalizedUserId = normalizeRequiredText(userId, "User ID");
    const normalizedTicketId = normalizeRequiredText(ticketId, "Ticket ID");

    return fetchUserTicketWithMessages(normalizedUserId, normalizedTicketId);
  }

  /**
   * Add a user message to an existing support ticket.
   */
  async addMessage(
    userId: string,
    ticketId: string,
    message: string,
    attachment?: string,
  ): Promise<SupportTicketMessageWithSender> {
    const normalizedUserId = normalizeRequiredText(userId, "User ID");
    const normalizedTicketId = normalizeRequiredText(ticketId, "Ticket ID");
    const normalizedMessage = normalizeLimitedText(
      message,
      "Message",
      MAX_MESSAGE_LENGTH,
    );
    const normalizedAttachment = normalizeSupportAttachment(attachment);

    await ensureActiveUser(normalizedUserId);

    return prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.findFirst({
        where: {
          id: normalizedTicketId,
          userId: normalizedUserId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!ticket) {
        throw new NotFoundError("Support ticket not found");
      }

      if (ticket.status === SupportTicketStatus.CLOSED) {
        throw new ValidationError("Closed tickets cannot receive new messages");
      }

      const createdMessage = await tx.supportTicketMessage.create({
        data: {
          ticketId: normalizedTicketId,
          senderId: normalizedUserId,
          message: normalizedMessage,
          attachment: normalizedAttachment,
        },
        include: supportTicketMessageWithSenderInclude,
      });

      await tx.supportTicket.update({
        where: {
          id: normalizedTicketId,
        },
        data:
          ticket.status === SupportTicketStatus.RESOLVED
            ? {
                status: SupportTicketStatus.OPEN,
                resolution: null,
                resolvedAt: null,
              }
            : {
                status: ticket.status,
              },
      });

      return createdMessage;
    });
  }

  /**
   * Close a support ticket owned by the current user.
   */
  async closeTicket(
    userId: string,
    ticketId: string,
    resolution?: string,
  ): Promise<SupportTicketWithMessages> {
    const normalizedUserId = normalizeRequiredText(userId, "User ID");
    const normalizedTicketId = normalizeRequiredText(ticketId, "Ticket ID");
    const normalizedResolution = normalizeOptionalText(resolution);

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: normalizedTicketId,
        userId: normalizedUserId,
      },
      select: {
        id: true,
        status: true,
        resolution: true,
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
        resolution: normalizedResolution ?? ticket.resolution,
        resolvedAt: ticket.resolvedAt ?? new Date(),
      },
    });

    return fetchUserTicketWithMessages(normalizedUserId, normalizedTicketId);
  }

  /**
   * Get support tickets for a specific order owned by the current user.
   */
  async getTicketsByOrderId(
    userId: string,
    orderId: string,
  ): Promise<SupportTicketWithMessages[]> {
    const normalizedUserId = normalizeRequiredText(userId, "User ID");
    const normalizedOrderId = await assertOrderBelongsToUser(
      normalizedUserId,
      orderId,
    );

    return prisma.supportTicket.findMany({
      where: {
        userId: normalizedUserId,
        orderId: normalizedOrderId,
      },
      include: supportTicketWithMessagesInclude,
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  /**
   * Get support statistics for the current user.
   */
  async getStats(userId: string): Promise<{
    totalConversations: number;
    activeConversations: number;
    resolvedConversations: number;
    averageResponseTime: number;
    satisfactionRating: number | null;
  }> {
    const normalizedUserId = normalizeRequiredText(userId, "User ID");

    const tickets = await prisma.supportTicket.findMany({
      where: {
        userId: normalizedUserId,
      },
      select: {
        status: true,
        messages: {
          select: {
            senderId: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    const totalConversations = tickets.length;
    const activeConversations = tickets.filter(
      (ticket) =>
        ticket.status === SupportTicketStatus.OPEN ||
        ticket.status === SupportTicketStatus.IN_PROGRESS,
    ).length;
    const resolvedConversations = tickets.filter(
      (ticket) =>
        ticket.status === SupportTicketStatus.RESOLVED ||
        ticket.status === SupportTicketStatus.CLOSED,
    ).length;

    let totalResponseTimeMs = 0;
    let responseCount = 0;

    for (const ticket of tickets) {
      for (let index = 1; index < ticket.messages.length; index += 1) {
        const previousMessage = ticket.messages[index - 1];
        const currentMessage = ticket.messages[index];

        if (
          previousMessage.senderId === normalizedUserId &&
          currentMessage.senderId !== normalizedUserId
        ) {
          totalResponseTimeMs +=
            currentMessage.createdAt.getTime() -
            previousMessage.createdAt.getTime();
          responseCount += 1;
        }
      }
    }

    const averageResponseTime =
      responseCount > 0
        ? Math.round(totalResponseTimeMs / responseCount / 60000)
        : 0;

    return {
      totalConversations,
      activeConversations,
      resolvedConversations,
      averageResponseTime,
      satisfactionRating: null,
    };
  }
}

export default new SupportService();

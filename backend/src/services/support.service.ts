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
import { buildProtectedAssetDescriptor } from "../utils/protected-asset";
import { normalizePagination } from "./shared/pagination";
import {
  isUniqueConstraintError,
  normalizeOptionalSanitizedText,
  normalizeRequiredSanitizedText,
  normalizeSupportAttachment,
} from "./shared/service-helpers";

const supportUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const supportTicketWithMessagesInclude = {
  messages: {
    include: { sender: { select: supportUserSelect } },
    orderBy: { createdAt: "asc" },
  },
  user: { select: supportUserSelect },
} satisfies Prisma.SupportTicketInclude;

const supportTicketMessageWithSenderInclude = {
  sender: { select: supportUserSelect },
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
const MAX_RESOLUTION_LENGTH = 3000;
const MAX_TICKET_NO_CREATE_ATTEMPTS = 5;
const DEFAULT_TICKET_LIMIT = 20;
const MAX_TICKET_LIMIT = 100;

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

const generateTicketNo = (): string => {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}${String(now.getDate()).padStart(2, "0")}`;
  return `TKT-${datePart}-${now.getTime()}-${randomInt(1000, 10000)}`;
};

const ensureActiveUser = async (userId: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true },
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
  const normalizedOrderId = normalizeOptionalSanitizedText(
    orderId ?? undefined,
  );
  if (!normalizedOrderId) return null;

  const order = await prisma.order.findFirst({
    where: { id: normalizedOrderId, userId },
    select: { id: true },
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
    where: { id: ticketId, userId },
    include: supportTicketWithMessagesInclude,
  });

  if (!ticket) {
    throw new NotFoundError("Support ticket not found");
  }

  return ticket;
};

class SupportService {
  async createTicket(
    userId: string,
    subject: string,
    description: string,
    category: string,
    orderId?: string,
    priority: string = SupportTicketPriority.MEDIUM,
    attachment?: string,
  ): Promise<SupportTicketWithMessages> {
    const normalizedUserId = normalizeRequiredSanitizedText(userId, "User ID");
    const normalizedSubject = normalizeRequiredSanitizedText(
      subject,
      "Subject",
      MAX_SUBJECT_LENGTH,
    );
    const normalizedDescription = normalizeRequiredSanitizedText(
      description,
      "Description",
      MAX_DESCRIPTION_LENGTH,
    );
    const normalizedCategory = normalizeRequiredSanitizedText(
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

  async getMessageAttachmentAsset(
    requesterUserId: string,
    requesterRole: UserRole,
    messageId: string,
  ) {
    const normalizedRequesterUserId = normalizeRequiredSanitizedText(
      requesterUserId,
      "User ID",
    );
    const normalizedMessageId = normalizeRequiredSanitizedText(
      messageId,
      "Message ID",
    );

    const message = await prisma.supportTicketMessage.findUnique({
      where: { id: normalizedMessageId },
      select: {
        id: true,
        attachment: true,
        ticket: { select: { userId: true } },
      },
    });

    if (
      !message?.attachment ||
      (requesterRole !== UserRole.ADMIN &&
        message.ticket.userId !== normalizedRequesterUserId)
    ) {
      throw new NotFoundError("Support attachment not found");
    }

    return buildProtectedAssetDescriptor(message.attachment, {
      allowedFolders: ["support-attachments"],
      fallbackFileName: `support-attachment-${message.id}`,
    });
  }

  async getUserTickets(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      status?: SupportTicketStatus;
    } = {},
  ): Promise<SupportTicketWithMessages[]> {
    const normalizedUserId = normalizeRequiredSanitizedText(userId, "User ID");
    const paginationWindow =
      params.page === undefined && params.limit === undefined
        ? undefined
        : normalizePagination(params.page, params.limit, {
            defaultLimit: DEFAULT_TICKET_LIMIT,
            maxLimit: MAX_TICKET_LIMIT,
          });

    return prisma.supportTicket.findMany({
      where: {
        userId: normalizedUserId,
        ...(params.status ? { status: params.status } : {}),
      },
      include: supportTicketWithMessagesInclude,
      orderBy: { updatedAt: "desc" },
      ...(paginationWindow
        ? { skip: paginationWindow.skip, take: paginationWindow.limit }
        : {}),
    });
  }

  async getTicketById(
    userId: string,
    ticketId: string,
  ): Promise<SupportTicketWithMessages> {
    return fetchUserTicketWithMessages(
      normalizeRequiredSanitizedText(userId, "User ID"),
      normalizeRequiredSanitizedText(ticketId, "Ticket ID"),
    );
  }

  async addMessage(
    userId: string,
    ticketId: string,
    message: string,
    attachment?: string,
  ): Promise<SupportTicketMessageWithSender> {
    const normalizedUserId = normalizeRequiredSanitizedText(userId, "User ID");
    const normalizedTicketId = normalizeRequiredSanitizedText(
      ticketId,
      "Ticket ID",
    );
    const normalizedMessage = normalizeRequiredSanitizedText(
      message,
      "Message",
      MAX_MESSAGE_LENGTH,
    );
    const normalizedAttachment = normalizeSupportAttachment(attachment);

    await ensureActiveUser(normalizedUserId);

    return prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.findFirst({
        where: { id: normalizedTicketId, userId: normalizedUserId },
        select: { id: true, status: true },
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
        where: { id: normalizedTicketId },
        data:
          ticket.status === SupportTicketStatus.RESOLVED
            ? {
                status: SupportTicketStatus.OPEN,
                resolution: null,
                resolvedAt: null,
              }
            : { status: ticket.status },
      });

      return createdMessage;
    });
  }

  async closeTicket(
    userId: string,
    ticketId: string,
    resolution?: string,
  ): Promise<SupportTicketWithMessages> {
    const normalizedUserId = normalizeRequiredSanitizedText(userId, "User ID");
    const normalizedTicketId = normalizeRequiredSanitizedText(
      ticketId,
      "Ticket ID",
    );
    const normalizedResolution = normalizeOptionalSanitizedText(
      resolution,
      "Resolution",
      MAX_RESOLUTION_LENGTH,
    );

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: normalizedTicketId, userId: normalizedUserId },
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
      where: { id: normalizedTicketId },
      data: {
        status: SupportTicketStatus.CLOSED,
        resolution: normalizedResolution ?? ticket.resolution,
        resolvedAt: ticket.resolvedAt ?? new Date(),
      },
    });

    return fetchUserTicketWithMessages(normalizedUserId, normalizedTicketId);
  }

  async getTicketsByOrderId(
    userId: string,
    orderId: string,
  ): Promise<SupportTicketWithMessages[]> {
    const normalizedUserId = normalizeRequiredSanitizedText(userId, "User ID");
    const normalizedOrderId = await assertOrderBelongsToUser(
      normalizedUserId,
      orderId,
    );

    return prisma.supportTicket.findMany({
      where: { userId: normalizedUserId, orderId: normalizedOrderId },
      include: supportTicketWithMessagesInclude,
      orderBy: { updatedAt: "desc" },
    });
  }

  async getStats(userId: string): Promise<{
    totalConversations: number;
    activeConversations: number;
    resolvedConversations: number;
    averageResponseTime: number;
    satisfactionRating: number | null;
  }> {
    const normalizedUserId = normalizeRequiredSanitizedText(userId, "User ID");

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: normalizedUserId },
      select: {
        status: true,
        messages: {
          select: { senderId: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    let activeConversations = 0;
    let resolvedConversations = 0;
    let totalResponseTimeMs = 0;
    let responseCount = 0;

    for (const ticket of tickets) {
      if (
        ticket.status === SupportTicketStatus.OPEN ||
        ticket.status === SupportTicketStatus.IN_PROGRESS
      ) {
        activeConversations += 1;
      } else if (
        ticket.status === SupportTicketStatus.RESOLVED ||
        ticket.status === SupportTicketStatus.CLOSED
      ) {
        resolvedConversations += 1;
      }

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

    return {
      totalConversations: tickets.length,
      activeConversations,
      resolvedConversations,
      averageResponseTime:
        responseCount > 0
          ? Math.round(totalResponseTimeMs / responseCount / 60000)
          : 0,
      satisfactionRating: null,
    };
  }
}

export default new SupportService();

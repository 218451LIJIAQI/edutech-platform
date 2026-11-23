import { Prisma, UserRole } from "@prisma/client";
import prisma from "../config/database";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/errors";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";

export const MAX_MESSAGE_LENGTH = 5000;
export const DEFAULT_MESSAGE_LIMIT = 20;
export const MAX_MESSAGE_LIMIT = 100;

type ParticipantThread = {
  participantIds: string;
  participants?: Array<{ id: string }>;
};

const messageSenderSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatar: true,
} satisfies Prisma.UserSelect;

const contactSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatar: true,
  role: true,
} satisfies Prisma.UserSelect;

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

/**
 * Generates a canonical participant key for one-to-one message threads.
 * Sorting ensures `(A, B)` and `(B, A)` always resolve to the same unique key.
 */
export const buildCanonicalParticipantKey = (
  userId: string,
  otherUserId: string,
): string => {
  const ids = Array.from(new Set([userId.trim(), otherUserId.trim()])).sort();

  if (ids.length !== 2 || ids.some((id) => id.length === 0)) {
    throw new ValidationError(
      "A message thread requires exactly two different users",
    );
  }

  return JSON.stringify(ids);
};

export const canMessageRole = (
  initiatorRole: UserRole,
  recipientRole: UserRole,
): boolean => {
  if (initiatorRole === UserRole.ADMIN) {
    return true;
  }

  if (initiatorRole === UserRole.STUDENT) {
    return (
      recipientRole === UserRole.TEACHER || recipientRole === UserRole.ADMIN
    );
  }

  if (initiatorRole === UserRole.TEACHER) {
    return (
      recipientRole === UserRole.STUDENT || recipientRole === UserRole.ADMIN
    );
  }

  return false;
};

const normalizeParticipantIds = (participantIds: unknown): string[] => {
  if (!Array.isArray(participantIds)) {
    return [];
  }

  return Array.from(
    new Set(
      participantIds
        .filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0,
        )
        .map((id) => id.trim()),
    ),
  );
};

const extractParticipantIds = (thread: ParticipantThread): string[] => {
  const fallbackIds = normalizeParticipantIds(
    thread.participants?.map((participant) => participant.id),
  );

  try {
    const parsed = JSON.parse(thread.participantIds);
    const normalized = normalizeParticipantIds(parsed);
    if (normalized.length > 0) {
      return normalized;
    }
  } catch {
    // Fall back to the relation join table when legacy JSON is malformed.
  }

  return fallbackIds;
};

const normalizeMessageContent = (rawContent: string): string => {
  const content = sanitizeUserPlainText(rawContent);

  if (!content) {
    throw new ValidationError("Message content cannot be empty");
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    throw new ValidationError(
      `Message content must not exceed ${MAX_MESSAGE_LENGTH} characters`,
    );
  }

  return content;
};

class MessageService {
  private async getActiveUserRole(userId: string): Promise<UserRole> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new NotFoundError("User not found or inactive");
    }

    return user.role;
  }

  private async assertContactMessagingAllowed(
    userId: string,
    contactId: string,
  ): Promise<void> {
    if (contactId === userId) {
      throw new ValidationError("You cannot create a conversation with yourself");
    }

    const [currentUser, otherUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isActive: true },
      }),
      prisma.user.findUnique({
        where: { id: contactId },
        select: { id: true, role: true, isActive: true },
      }),
    ]);

    if (!currentUser || !currentUser.isActive) {
      throw new NotFoundError("User not found or inactive");
    }

    if (!otherUser || !otherUser.isActive) {
      throw new NotFoundError("Contact not found or inactive");
    }

    if (!canMessageRole(currentUser.role, otherUser.role)) {
      throw new AuthorizationError("You are not allowed to message this user");
    }
  }

  private async assertThreadMessagingAllowed(
    userId: string,
    participantIds: string[],
  ): Promise<void> {
    const normalizedIds = normalizeParticipantIds(participantIds);

    if (!normalizedIds.includes(userId)) {
      throw new AuthorizationError("Not authorized to access this thread");
    }

    if (normalizedIds.length !== 2) {
      throw new ConflictError("Invalid thread participants");
    }

    const participants = await prisma.user.findMany({
      where: { id: { in: normalizedIds } },
      select: { id: true, role: true, isActive: true },
    });

    if (
      participants.length !== 2 ||
      participants.some((participant) => !participant.isActive)
    ) {
      throw new AuthorizationError("One or more thread participants are unavailable");
    }

    const currentUser = participants.find((p) => p.id === userId);
    const otherUser = participants.find((p) => p.id !== userId);

    if (!currentUser || !otherUser) {
      throw new ConflictError("Invalid thread participants");
    }

    if (!canMessageRole(currentUser.role, otherUser.role)) {
      throw new AuthorizationError("You are not allowed to message this user");
    }
  }

  private async getAuthorizedThread(threadId: string, userId: string) {
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        participantIds: true,
        participants: { select: { id: true } },
      },
    });

    if (!thread) {
      throw new NotFoundError("Thread not found");
    }

    const participantIds = extractParticipantIds(thread);
    await this.assertThreadMessagingAllowed(userId, participantIds);

    return thread;
  }

  private async findThreadBetweenUsers(userId: string, contactId: string) {
    return prisma.messageThread.findFirst({
      where: {
        AND: [
          { participants: { some: { id: userId } } },
          { participants: { some: { id: contactId } } },
        ],
      },
      select: { id: true, participantIds: true },
    });
  }

  private async loadThreadMessages(
    threadId: string,
    limit: number,
    cursor?: string,
  ) {
    if (cursor) {
      const cursorMessage = await prisma.message.findFirst({
        where: { id: cursor, threadId },
        select: { id: true },
      });

      if (!cursorMessage) {
        throw new ValidationError("Message cursor is invalid for this thread");
      }
    }

    const messagesDesc = await prisma.message.findMany({
      where: { threadId },
      include: { sender: { select: messageSenderSelect } },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    return {
      items: [...messagesDesc].reverse(),
      nextCursor:
        messagesDesc.length === limit
          ? messagesDesc[messagesDesc.length - 1].id
          : null,
    };
  }

  private async appendMessageToThread(
    threadId: string,
    senderId: string,
    rawContent: string,
  ) {
    const content = normalizeMessageContent(rawContent);

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { threadId, senderId, content },
        include: { sender: { select: messageSenderSelect } },
      }),
      prisma.messageThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return message;
  }

  /**
   * Lists active allowed contacts with batched per-contact unread counts,
   * avoiding N+1 unread-count requests from the client.
   */
  async getContacts(userId: string) {
    const currentUserRole = await this.getActiveUserRole(userId);

    const where: Prisma.UserWhereInput = {
      id: { not: userId },
      isActive: true,
    };

    if (currentUserRole === UserRole.STUDENT) {
      where.role = { in: [UserRole.TEACHER, UserRole.ADMIN] };
    } else if (currentUserRole === UserRole.TEACHER) {
      where.role = { in: [UserRole.STUDENT, UserRole.ADMIN] };
    }

    const [rawContacts, primaryAdmin, userThreads] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: [{ role: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
        select: contactSelect,
      }),
      currentUserRole === UserRole.STUDENT ||
      currentUserRole === UserRole.TEACHER
        ? prisma.user.findFirst({
            where: {
              role: UserRole.ADMIN,
              isActive: true,
              id: { not: userId },
            },
            orderBy: { createdAt: "asc" },
            select: contactSelect,
          })
        : Promise.resolve(null),
      prisma.messageThread.findMany({
        where: { participants: { some: { id: userId } } },
        select: { id: true },
      }),
    ]);

    const contacts = primaryAdmin
      ? [
          primaryAdmin,
          ...rawContacts.filter((contact) => contact.id !== primaryAdmin.id),
        ]
      : rawContacts;

    const unreadBySenderId = new Map<string, number>();
    if (userThreads.length > 0) {
      const groupedUnread = await prisma.message.groupBy({
        by: ["senderId"],
        where: {
          threadId: { in: userThreads.map((thread) => thread.id) },
          senderId: { not: userId },
          isRead: false,
        },
        _count: { _all: true },
      });

      for (const entry of groupedUnread) {
        unreadBySenderId.set(entry.senderId, entry._count._all);
      }
    }

    return contacts.map((contact) => ({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      avatar: contact.avatar || undefined,
      role: contact.role,
      unreadCount: unreadBySenderId.get(contact.id) ?? 0,
    }));
  }

  async getOrCreateThread(userId: string, contactId: string) {
    await this.assertContactMessagingAllowed(userId, contactId);

    const participantKey = buildCanonicalParticipantKey(userId, contactId);
    let thread = await this.findThreadBetweenUsers(userId, contactId);

    if (!thread) {
      try {
        thread = await prisma.messageThread.create({
          data: {
            participantIds: participantKey,
            participants: {
              connect: [{ id: userId }, { id: contactId }],
            },
          },
          select: { id: true, participantIds: true },
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }

        const existingThread = await prisma.messageThread.findUnique({
          where: { participantIds: participantKey },
          select: { id: true, participantIds: true },
        });

        if (!existingThread) {
          throw error;
        }

        thread = existingThread;
      }
    } else if (thread.participantIds !== participantKey) {
      thread = await prisma.messageThread.update({
        where: { id: thread.id },
        data: { participantIds: participantKey },
        select: { id: true, participantIds: true },
      });
    }

    return thread;
  }

  async getMessages(
    userId: string,
    threadId: string,
    limit = DEFAULT_MESSAGE_LIMIT,
    cursor?: string,
  ) {
    await this.getAuthorizedThread(threadId, userId);
    return this.loadThreadMessages(threadId, limit, cursor);
  }

  async sendMessage(userId: string, threadId: string, rawContent: string) {
    await this.getAuthorizedThread(threadId, userId);
    return this.appendMessageToThread(threadId, userId, rawContent);
  }

  async getMessagesWithContact(
    userId: string,
    contactId: string,
    limit = DEFAULT_MESSAGE_LIMIT,
    cursor?: string,
  ) {
    await this.assertContactMessagingAllowed(userId, contactId);

    const thread = await this.findThreadBetweenUsers(userId, contactId);
    if (!thread) {
      return {
        threadId: null,
        items: [],
        nextCursor: null,
      };
    }

    const { items, nextCursor } = await this.loadThreadMessages(
      thread.id,
      limit,
      cursor,
    );

    return {
      threadId: thread.id,
      items,
      nextCursor,
    };
  }

  async sendMessageToContact(
    userId: string,
    contactId: string,
    rawContent: string,
  ) {
    const thread = await this.getOrCreateThread(userId, contactId);
    return this.appendMessageToThread(thread.id, userId, rawContent);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.message.count({
      where: {
        thread: {
          participants: { some: { id: userId } },
        },
        senderId: { not: userId },
        isRead: false,
      },
    });
  }

  async markMessagesAsRead(userId: string, threadId: string): Promise<number> {
    await this.getAuthorizedThread(threadId, userId);

    const result = await prisma.message.updateMany({
      where: {
        threadId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  async getContactUnreadCount(
    userId: string,
    contactId: string,
  ): Promise<number> {
    await this.assertContactMessagingAllowed(userId, contactId);

    const thread = await this.findThreadBetweenUsers(userId, contactId);
    if (!thread) {
      return 0;
    }

    return prisma.message.count({
      where: {
        threadId: thread.id,
        senderId: contactId,
        isRead: false,
      },
    });
  }
}

export default new MessageService();

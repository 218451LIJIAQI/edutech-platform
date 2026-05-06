import { Request, Response } from "express";
import { Prisma, UserRole } from "@prisma/client";
import asyncHandler from "../utils/async-handler";
import { AppError } from "../utils/errors";
import prisma from "../config/database";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";

/**
 * Message Controller
 * Handles user-to-user messaging functionality.
 */

type ParticipantThread = {
  participantIds: string;
  participants?: Array<{ id: string }>;
};

const MAX_MESSAGE_LENGTH = 5000;
const DEFAULT_MESSAGE_LIMIT = 20;
const MAX_MESSAGE_LIMIT = 100;

const sendSuccess = (
  res: Response,
  data?: unknown,
  message?: string,
  statusCode = 200,
) => {
  res.status(statusCode).json({
    status: "success",
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
  });
};

const getAuthenticatedUserId = (req: Request): string => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError("User not authenticated", 401);
  }

  return userId;
};

const parseRequiredString = (
  value: unknown,
  fieldName: string,
  statusCode = 400,
): string => {
  if (typeof value !== "string") {
    throw new AppError(`${fieldName} is required`, statusCode);
  }

  const parsed = value.trim();

  if (parsed.length === 0) {
    throw new AppError(`${fieldName} cannot be empty`, statusCode);
  }

  return parsed;
};

const parsePositiveInteger = (
  value: unknown,
  fallback: number,
  fieldName: string,
  max = MAX_MESSAGE_LIMIT,
): number => {
  if (value === undefined || value === null || value === "") return fallback;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError(`${fieldName} must be a positive integer`, 400);
  }

  return Math.min(parsed, max);
};

/**
 * Generates a stable participant key for one-to-one message threads.
 * IDs are sorted so the same two users always produce the same key.
 */
function getParticipantIds(userId: string, otherUserId: string): string {
  const ids = Array.from(new Set([userId.trim(), otherUserId.trim()])).sort();

  if (ids.length !== 2) {
    throw new AppError(
      "A message thread requires exactly two different users",
      400,
    );
  }

  return JSON.stringify(ids);
}

function canMessageRole(
  initiatorRole: UserRole,
  recipientRole: UserRole,
): boolean {
  if (initiatorRole === UserRole.ADMIN) return true;

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
}

function normalizeParticipantIds(participantIds: unknown): string[] {
  if (!Array.isArray(participantIds)) return [];

  return Array.from(
    new Set(
      participantIds
        .filter(
          (participantId): participantId is string =>
            typeof participantId === "string" &&
            participantId.trim().length > 0,
        )
        .map((participantId) => participantId.trim()),
    ),
  );
}

function extractParticipantIds(thread: ParticipantThread): string[] {
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
    // Fall back to relation data when legacy participant_ids payload is malformed.
  }

  return fallbackIds;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function getActiveUserRole(userId: string): Promise<UserRole> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError("User not found or inactive", 404);
  }

  return user.role;
}

async function assertThreadMessagingAllowed(
  userId: string,
  participantIds: string[],
): Promise<void> {
  const normalizedParticipantIds = normalizeParticipantIds(participantIds);

  if (!normalizedParticipantIds.includes(userId)) {
    throw new AppError("Not authorized to access this thread", 403);
  }

  if (normalizedParticipantIds.length !== 2) {
    throw new AppError("Invalid thread participants", 409);
  }

  const participants = await prisma.user.findMany({
    where: {
      id: { in: normalizedParticipantIds },
    },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (
    participants.length !== 2 ||
    participants.some((participant) => !participant.isActive)
  ) {
    throw new AppError("One or more thread participants are unavailable", 403);
  }

  const currentUser = participants.find(
    (participant) => participant.id === userId,
  );
  const otherUser = participants.find(
    (participant) => participant.id !== userId,
  );

  if (!currentUser || !otherUser) {
    throw new AppError("Invalid thread participants", 409);
  }

  if (!canMessageRole(currentUser.role, otherUser.role)) {
    throw new AppError("You are not allowed to message this user", 403);
  }
}

async function getThreadForUser(threadId: string, userId: string) {
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      participantIds: true,
      participants: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!thread) {
    throw new AppError("Thread not found", 404);
  }

  const participantIds = extractParticipantIds(thread);

  await assertThreadMessagingAllowed(userId, participantIds);

  return {
    thread,
    participantIds,
  };
}

async function assertContactMessagingAllowed(
  userId: string,
  contactId: string,
): Promise<void> {
  if (contactId === userId) {
    throw new AppError("You cannot create a conversation with yourself", 400);
  }

  const [currentUser, otherUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        isActive: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    }),
  ]);

  if (!currentUser || !currentUser.isActive) {
    throw new AppError("User not found or inactive", 404);
  }

  if (!otherUser || !otherUser.isActive) {
    throw new AppError("Contact not found or inactive", 404);
  }

  if (!canMessageRole(currentUser.role, otherUser.role)) {
    throw new AppError("You are not allowed to message this user", 403);
  }
}

async function findThreadBetweenUsers(userId: string, contactId: string) {
  return prisma.messageThread.findFirst({
    where: {
      AND: [
        { participants: { some: { id: userId } } },
        { participants: { some: { id: contactId } } },
      ],
    },
    select: {
      id: true,
      participantIds: true,
    },
  });
}

async function getOrCreateMessageThread(userId: string, contactId: string) {
  await assertContactMessagingAllowed(userId, contactId);

  const participantIdsStr = getParticipantIds(userId, contactId);

  let thread = await findThreadBetweenUsers(userId, contactId);

  if (!thread) {
    try {
      thread = await prisma.messageThread.create({
        data: {
          participantIds: participantIdsStr,
          participants: {
            connect: [{ id: userId }, { id: contactId }],
          },
        },
        select: {
          id: true,
          participantIds: true,
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const existingThread = await prisma.messageThread.findUnique({
        where: {
          participantIds: participantIdsStr,
        },
        select: {
          id: true,
          participantIds: true,
        },
      });

      if (!existingThread) {
        throw error;
      }

      thread = existingThread;
    }
  } else if (thread.participantIds !== participantIdsStr) {
    thread = await prisma.messageThread.update({
      where: {
        id: thread.id,
      },
      data: {
        participantIds: participantIdsStr,
      },
      select: {
        id: true,
        participantIds: true,
      },
    });
  }

  return thread;
}

async function loadMessagesForThread(
  threadId: string,
  userId: string,
  limit: number,
  cursor?: string,
) {
  await getThreadForUser(threadId, userId);

  if (cursor) {
    const cursorMessage = await prisma.message.findFirst({
      where: {
        id: cursor,
        threadId,
      },
      select: {
        id: true,
      },
    });

    if (!cursorMessage) {
      throw new AppError("Message cursor is invalid for this thread", 400);
    }
  }

  const messagesDesc = await prisma.message.findMany({
    where: {
      threadId,
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    ...(cursor
      ? {
          skip: 1,
          cursor: {
            id: cursor,
          },
        }
      : {}),
  });

  return {
    items: [...messagesDesc].reverse(),
    nextCursor:
      messagesDesc.length === limit ? messagesDesc[messagesDesc.length - 1].id : null,
  };
}

function parseMessageContent(value: unknown): string {
  const content = sanitizeUserPlainText(
    parseRequiredString(value, "Message content"),
  );

  if (!content) {
    throw new AppError("Message content cannot be empty", 400);
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(
      `Message content must not exceed ${MAX_MESSAGE_LENGTH} characters`,
      400,
    );
  }

  return content;
}

async function createMessageInThread(
  threadId: string,
  userId: string,
  content: string,
) {
  await getThreadForUser(threadId, userId);

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        threadId,
        senderId: userId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    }),
    prisma.messageThread.update({
      where: {
        id: threadId,
      },
      data: {
        updatedAt: new Date(),
      },
    }),
  ]);

  return message;
}

/**
 * Get contacts for the current user.
 * Returns active users that the current user is allowed to message.
 */
export const getContacts = asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const currentUserRole = await getActiveUserRole(userId);

  const where: Prisma.UserWhereInput = {
    id: { not: userId },
    isActive: true,
  };

  if (currentUserRole === UserRole.STUDENT) {
    where.role = { in: [UserRole.TEACHER, UserRole.ADMIN] };
  } else if (currentUserRole === UserRole.TEACHER) {
    where.role = { in: [UserRole.STUDENT, UserRole.ADMIN] };
  }

  let contacts = await prisma.user.findMany({
    where,
    orderBy: [{ role: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      role: true,
    },
  });

  // Pin the primary admin contact for students and teachers.
  if (
    currentUserRole === UserRole.STUDENT ||
    currentUserRole === UserRole.TEACHER
  ) {
    const primaryAdmin = await prisma.user.findFirst({
      where: {
        role: UserRole.ADMIN,
        isActive: true,
        id: { not: userId },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
      },
    });

    if (primaryAdmin) {
      contacts = contacts.filter((contact) => contact.id !== primaryAdmin.id);
      contacts = [primaryAdmin, ...contacts];
    }
  }

  const formattedContacts = contacts.map((contact) => ({
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    avatar: contact.avatar || undefined,
    role: contact.role,
  }));

  sendSuccess(res, formattedContacts);
});

/**
 * Get or create a thread with a user.
 */
export const getOrCreateThread = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const contactId = parseRequiredString(req.body?.contactId, "contactId");

    const thread = await getOrCreateMessageThread(userId, contactId);

    sendSuccess(res, { id: thread.id });
  },
);

/**
 * Get messages in a thread.
 */
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const threadId = parseRequiredString(req.params.threadId, "Thread ID");
  const limit = parsePositiveInteger(
    req.query.limit,
    DEFAULT_MESSAGE_LIMIT,
    "limit",
    MAX_MESSAGE_LIMIT,
  );
  const cursor = req.query.cursor
    ? parseRequiredString(req.query.cursor, "cursor")
    : undefined;

  const { items, nextCursor } = await loadMessagesForThread(
    threadId,
    userId,
    limit,
    cursor,
  );

  sendSuccess(res, {
    items,
    nextCursor,
  });
});

/**
 * Send a message.
 */
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const threadId = parseRequiredString(req.params.threadId, "Thread ID");
  const content = parseMessageContent(req.body?.content);

  const message = await createMessageInThread(threadId, userId, content);

  sendSuccess(res, message, undefined, 201);
});

/**
 * Get messages with a contact without creating an empty thread.
 */
export const getMessagesWithContact = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const contactId = parseRequiredString(req.params.contactId, "Contact ID");
    const limit = parsePositiveInteger(
      req.query.limit,
      DEFAULT_MESSAGE_LIMIT,
      "limit",
      MAX_MESSAGE_LIMIT,
    );
    const cursor = req.query.cursor
      ? parseRequiredString(req.query.cursor, "cursor")
      : undefined;

    await assertContactMessagingAllowed(userId, contactId);

    const thread = await findThreadBetweenUsers(userId, contactId);

    if (!thread) {
      sendSuccess(res, {
        threadId: null,
        items: [],
        nextCursor: null,
      });
      return;
    }

    const { items, nextCursor } = await loadMessagesForThread(
      thread.id,
      userId,
      limit,
      cursor,
    );

    sendSuccess(res, {
      threadId: thread.id,
      items,
      nextCursor,
    });
  },
);

/**
 * Send a message to a contact, creating the one-to-one thread if needed.
 */
export const sendMessageToContact = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const contactId = parseRequiredString(req.params.contactId, "Contact ID");
    const content = parseMessageContent(req.body?.content);

    const thread = await getOrCreateMessageThread(userId, contactId);
    const message = await createMessageInThread(thread.id, userId, content);

    sendSuccess(res, message, undefined, 201);
  },
);

/**
 * Get unread message count for the current user.
 */
export const getUnreadCount = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const unreadCount = await prisma.message.count({
      where: {
        thread: {
          participants: {
            some: {
              id: userId,
            },
          },
        },
        senderId: {
          not: userId,
        },
        isRead: false,
      },
    });

    sendSuccess(res, { unreadCount });
  },
);

/**
 * Mark messages as read in a thread.
 */
export const markMessagesAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const threadId = parseRequiredString(req.params.threadId, "Thread ID");

    await getThreadForUser(threadId, userId);

    const result = await prisma.message.updateMany({
      where: {
        threadId,
        senderId: {
          not: userId,
        },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    sendSuccess(res, {
      updatedCount: result.count,
    });
  },
);

/**
 * Get unread count for a specific contact.
 */
export const getContactUnreadCount = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const contactId = parseRequiredString(req.params.contactId, "Contact ID");

    if (contactId === userId) {
      throw new AppError("Contact ID cannot be the current user ID", 400);
    }

    const currentUserRole = await getActiveUserRole(userId);

    const contact = await prisma.user.findUnique({
      where: {
        id: contactId,
      },
      select: {
        role: true,
        isActive: true,
      },
    });

    if (!contact || !contact.isActive) {
      throw new AppError("Contact not found or inactive", 404);
    }

    if (!canMessageRole(currentUserRole, contact.role)) {
      throw new AppError("You are not allowed to message this user", 403);
    }

    const thread = await prisma.messageThread.findFirst({
      where: {
        AND: [
          {
            participants: {
              some: {
                id: userId,
              },
            },
          },
          {
            participants: {
              some: {
                id: contactId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    const unreadCount = thread
      ? await prisma.message.count({
          where: {
            threadId: thread.id,
            senderId: contactId,
            isRead: false,
          },
        })
      : 0;

    sendSuccess(res, { unreadCount });
  },
);

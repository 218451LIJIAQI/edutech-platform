import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import prisma from '../config/database';
import { UserRole } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * Message Controller
 * Handles messaging functionality
 */

/**
 * Helper function to generate consistent participant IDs
 * Always sorts IDs to ensure consistent ordering
 */
function getParticipantIds(userId: string, otherUserId: string): string {
  const ids = [userId, otherUserId].sort();
  return JSON.stringify(ids);
}

/**
 * Get contacts for current user
 * Returns list of users they can message
 */
export const getContacts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!currentUser) {
    throw new AppError('User not found', 404);
  }

  // Build query based on user role
  const where: Prisma.UserWhereInput = {
    id: { not: userId }, // Exclude self
  };

  // Students can message teachers and admins
  if (currentUser.role === 'STUDENT') {
    where.role = { in: [UserRole.TEACHER, UserRole.ADMIN] };
  }
  // Teachers can message students and admins
  else if (currentUser.role === 'TEACHER') {
    where.role = { in: [UserRole.STUDENT, UserRole.ADMIN] };
  }
  // Admins can message everyone
  // else if (currentUser.role === 'ADMIN') {
  //   // No additional filter
  // }

  let contacts = await prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      role: true,
    },
  });

  // Ensure a primary Admin contact exists and is pinned for Students and Teachers
  if (currentUser.role === 'STUDENT' || currentUser.role === 'TEACHER') {
    const primaryAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
      },
    });

    if (primaryAdmin && primaryAdmin.id !== userId) {
      // Remove any duplicate admin(s) from list and insert primary at top
      contacts = contacts.filter((c) => c.role !== 'ADMIN' || c.id === primaryAdmin.id);
      const exists = contacts.some((c) => c.id === primaryAdmin.id);
      if (!exists) {
        // Type-safe insertion: primaryAdmin matches the contact structure from select
        contacts = [primaryAdmin, ...contacts];
      } else {
        // Move to front
        const adminIndex = contacts.findIndex((c) => c.id === primaryAdmin.id);
        const [adminContact] = contacts.splice(adminIndex, 1);
        contacts = [adminContact, ...contacts];
      }
    }
  }

  const formattedContacts = contacts.map((contact) => ({
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    avatar: contact.avatar || undefined,
    role: contact.role,
    lastMessageAt: undefined,
    unreadCount: 0,
  }));

  res.status(200).json({
    status: 'success',
    data: formattedContacts,
  });
});

/**
 * Get or create thread with a user
 */
export const getOrCreateThread = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { contactId } = req.body as { contactId?: string };

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  if (!contactId || typeof contactId !== 'string' || !contactId.trim()) {
    throw new AppError('contactId is required and must be a non-empty string', 400);
  }

  // Check if other user exists
  const otherUser = await prisma.user.findUnique({
    where: { id: contactId },
  });

  if (!otherUser) {
    throw new AppError('User not found', 404);
  }

  // Create participant IDs array (sorted for consistency)
  const participantIdsStr = getParticipantIds(userId, contactId);

  // Find existing thread via participants relation (robust against legacy participantIds formatting)
  let thread = await prisma.messageThread.findFirst({
    where: {
      AND: [
        { participants: { some: { id: userId } } },
        { participants: { some: { id: contactId } } },
      ],
    },
    include: {
      participants: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  // Create new thread if doesn't exist
  if (!thread) {
    thread = await prisma.messageThread.create({
      data: {
        participantIds: participantIdsStr,
        participants: {
          connect: [{ id: userId }, { id: contactId }],
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      id: thread.id,
      participantIds: JSON.parse(thread.participantIds),
      participants: thread.participants,
      updatedAt: thread.updatedAt,
      lastMessage: thread.messages[0] || null,
    },
  });
});

/**
 * Get messages in a thread
 */
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { threadId } = req.params;
  const { cursor, limit } = req.query as { cursor?: string; limit?: string };

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  if (!threadId || typeof threadId !== 'string' || !threadId.trim()) {
    throw new AppError('Thread ID is required', 400);
  }

  // Verify user is part of this thread
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId.trim() },
  });

  if (!thread) {
    throw new AppError('Thread not found', 404);
  }

  const participantIds = JSON.parse(thread.participantIds);
  if (!participantIds.includes(userId)) {
    throw new AppError('Not authorized to view this thread', 403);
  }

  const parsedLimit = limit 
    ? Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100) 
    : 20;

  const trimmedCursor = cursor && typeof cursor === 'string' ? cursor.trim() : undefined;

  const messages = await prisma.message.findMany({
    where: { threadId: threadId.trim() },
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
    orderBy: { createdAt: 'desc' },
    take: parsedLimit,
    ...(trimmedCursor ? { skip: 1, cursor: { id: trimmedCursor } } : {}),
  });

  const reversedMessages = messages.reverse();
  res.status(200).json({
    status: 'success',
    data: {
      items: reversedMessages,
      nextCursor: reversedMessages.length > 0 ? reversedMessages[0].id : null, // after reverse, messages[0] is oldest item
    },
  });
});

/**
 * Send a message
 */
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { threadId } = req.params;
  const { content } = req.body as { content?: string };

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  if (!threadId || typeof threadId !== 'string' || !threadId.trim()) {
    throw new AppError('Thread ID is required', 400);
  }

  if (!content || typeof content !== 'string' || !content.trim()) {
    throw new AppError('Message content is required', 400);
  }

  if (content.trim().length > 5000) {
    throw new AppError('Message content must not exceed 5000 characters', 400);
  }

  // Verify user is part of this thread
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId.trim() },
  });

  if (!thread) {
    throw new AppError('Thread not found', 404);
  }

  const participantIds = JSON.parse(thread.participantIds);
  if (!participantIds.includes(userId)) {
    throw new AppError('Not authorized to send messages in this thread', 403);
  }

  const message = await prisma.message.create({
    data: {
      threadId: threadId.trim(),
      senderId: userId,
      content: content.trim(),
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
  });

  // Update thread updatedAt
  await prisma.messageThread.update({
    where: { id: threadId.trim() },
    data: { updatedAt: new Date() },
  });

  res.status(201).json({
    status: 'success',
    data: message,
  });
});

/**
 * Get unread message count for current user
 */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const unreadCount = await prisma.message.count({
    where: {
      thread: {
        participants: {
          some: { id: userId },
        },
      },
      senderId: { not: userId },
      isRead: false,
    },
  });

  res.status(200).json({
    status: 'success',
    data: { unreadCount },
  });
});

/**
 * Mark messages as read in a thread
 */
export const markMessagesAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { threadId } = req.params;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  if (!threadId || typeof threadId !== 'string' || !threadId.trim()) {
    throw new AppError('Thread ID is required', 400);
  }

  // Verify user is part of this thread
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId.trim() },
  });

  if (!thread) {
    throw new AppError('Thread not found', 404);
  }

  const participantIds = JSON.parse(thread.participantIds);
  if (!participantIds.includes(userId)) {
    throw new AppError('Not authorized to access this thread', 403);
  }

  // Mark all unread messages from other users as read
  const result = await prisma.message.updateMany({
    where: {
      threadId: threadId.trim(),
      senderId: { not: userId },
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  res.status(200).json({
    status: 'success',
    data: { updatedCount: result.count },
  });
});

/**
 * Get unread count for a specific contact
 */
export const getContactUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { contactId } = req.params;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  if (!contactId || typeof contactId !== 'string' || !contactId.trim()) {
    throw new AppError('Contact ID is required', 400);
  }

  // Find thread with this contact using participants relation (handles legacy participantIds ordering)
  const thread = await prisma.messageThread.findFirst({
    where: {
      AND: [
        { participants: { some: { id: userId } } },
        { participants: { some: { id: contactId } } },
      ],
    },
  });

  let unreadCount = 0;
  if (thread) {
    unreadCount = await prisma.message.count({
      where: {
        threadId: thread.id,
        senderId: contactId.trim(),
        isRead: false,
      },
    });
  }

  res.status(200).json({
    status: 'success',
    data: { unreadCount },
  });
});

/**
 * Get threads for current user
 */
export const getThreads = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const threads = await prisma.messageThread.findMany({
    where: {
      participants: {
        some: { id: userId },
      },
    },
    include: {
      participants: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Calculate unread count for each thread
  const formattedThreads = await Promise.all(
    threads.map(async (thread) => {
      const unreadCount = await prisma.message.count({
        where: {
          threadId: thread.id,
          senderId: { not: userId },
          isRead: false,
        },
      });

      return {
        id: thread.id,
        participantIds: JSON.parse(thread.participantIds),
        participants: thread.participants,
        updatedAt: thread.updatedAt,
        lastMessage: thread.messages[0] || null,
        unreadCount,
      };
    })
  );

  res.status(200).json({
    status: 'success',
    data: formattedThreads,
  });
});

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import asyncHandler from '../utils/asyncHandler';
import { AppError } from '../utils/errors';

const prisma = new PrismaClient();

/**
 * Message Controller
 * Handles messaging functionality
 */

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
  let where: any = {
    id: { not: userId }, // Exclude self
  };

  // Students can message teachers and admins
  if (currentUser.role === 'STUDENT') {
    where.role = { in: ['TEACHER', 'ADMIN'] };
  }
  // Teachers can message students and admins
  else if (currentUser.role === 'TEACHER') {
    where.role = { in: ['STUDENT', 'ADMIN'] };
  }
  // Admins can message everyone
  // else if (currentUser.role === 'ADMIN') {
  //   // No additional filter
  // }

  const contacts = await prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      role: true,
    },
  });

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
  const { withUserId } = req.body;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  if (!withUserId) {
    throw new AppError('withUserId is required', 400);
  }

  // Check if other user exists
  const otherUser = await prisma.user.findUnique({
    where: { id: withUserId },
  });

  if (!otherUser) {
    throw new AppError('User not found', 404);
  }

  // Create participant IDs array (sorted for consistency)
  const participantIds = [userId, withUserId].sort();

  // Find existing thread
  let thread = await prisma.messageThread.findFirst({
    where: {
      participantIds: JSON.stringify(participantIds),
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
        participantIds: JSON.stringify(participantIds),
        participants: {
          connect: [{ id: userId }, { id: withUserId }],
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
  const { cursor, limit = 20 } = req.query;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  // Verify user is part of this thread
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId as string },
  });

  if (!thread) {
    throw new AppError('Thread not found', 404);
  }

  const participantIds = JSON.parse(thread.participantIds);
  if (!participantIds.includes(userId)) {
    throw new AppError('Not authorized to view this thread', 403);
  }

  const messages = await prisma.message.findMany({
    where: { threadId: threadId as string },
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
    take: parseInt(limit as string) || 20,
    ...(cursor && { skip: 1, cursor: { id: cursor as string } }),
  });

  res.status(200).json({
    status: 'success',
    data: {
      items: messages.reverse(),
      nextCursor: messages.length > 0 ? messages[0].id : null,
    },
  });
});

/**
 * Send a message
 */
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { threadId } = req.params;
  const { content } = req.body;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  if (!content || !content.trim()) {
    throw new AppError('Message content is required', 400);
  }

  // Verify user is part of this thread
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId as string },
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
      threadId: threadId as string,
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
    where: { id: threadId as string },
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

  // Verify user is part of this thread
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId as string },
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
      threadId: threadId as string,
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

  // Find thread with this contact
  const participantIds = [userId, contactId].sort();
  const thread = await prisma.messageThread.findFirst({
    where: {
      participantIds: JSON.stringify(participantIds),
    },
  });

  let unreadCount = 0;
  if (thread) {
    unreadCount = await prisma.message.count({
      where: {
        threadId: thread.id,
        senderId: contactId,
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


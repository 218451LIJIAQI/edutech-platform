import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserRole, LiveSessionStatus } from '@prisma/client';
import prisma from '../config/database';
import config from '../config/env';
import logger from '../utils/logger';

/**
 * Interface for authenticated socket
 */
interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: UserRole;
}

/**
 * Live Session Handler
 * Manages real-time communication for live classes
 */
export class LiveSessionHandler {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.initialize();
  }

  /**
   * Initialize socket handlers
   */
  private initialize() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        let token = (socket.handshake.auth as any)?.token as string | undefined;
        const authHeader = (socket.handshake.headers?.authorization as string | undefined) ?? undefined;

        if (!token && authHeader?.startsWith('Bearer ')) {
          token = authHeader.slice('Bearer '.length);
        }

        if (!token) {
          return next(new Error('Authentication required'));
        }

        if (!config.JWT_SECRET) {
          return next(new Error('Server misconfiguration'));
        }

        // Verify token
        const decoded = jwt.verify(token, config.JWT_SECRET) as {
          id: string;
          role: UserRole;
        };

        socket.userId = decoded.id;
        socket.userRole = decoded.role;

        return next();
      } catch (error) {
        return next(new Error('Invalid token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`User connected: ${socket.userId}`);

      // Join live session room
      socket.on('join-session', async (data: { sessionId?: string }) => {
        await this.handleJoinSession(socket, data?.sessionId);
      });

      // Leave live session room
      socket.on('leave-session', (data: { sessionId?: string }) => {
        this.handleLeaveSession(socket, data?.sessionId);
      });

      // Send chat message
      socket.on('chat-message', async (data: { sessionId?: string; message?: string }) => {
        await this.handleChatMessage(socket, data?.sessionId ?? '', data?.message ?? '');
      });

      // Raise hand
      socket.on('raise-hand', (data: { sessionId?: string }) => {
        this.handleRaiseHand(socket, data?.sessionId ?? '');
      });

      // Start session (Teacher only)
      socket.on('start-session', async (data: { sessionId?: string }) => {
        await this.handleStartSession(socket, data?.sessionId ?? '');
      });

      // End session (Teacher only)
      socket.on('end-session', async (data: { sessionId?: string }) => {
        await this.handleEndSession(socket, data?.sessionId ?? '');
      });

      // Disconnect handler
      socket.on('disconnect', () => {
        logger.info(`User disconnected: ${socket.userId}`);
      });
    });
  }

  /**
   * Handle joining a live session
   */
  private async handleJoinSession(socket: AuthenticatedSocket, sessionId?: string) {
    try {
      if (!sessionId || typeof sessionId !== 'string') {
        socket.emit('error', { message: 'Invalid session identifier' });
        return;
      }

      // Get session details
      const session = await prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: {
          lesson: {
            include: {
              course: {
                include: {
                  teacherProfile: true,
                },
              },
            },
          },
        },
      });

      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      // Check if user has access
      const isTeacher =
        socket.userRole === UserRole.TEACHER &&
        !!session.lesson?.course?.teacherProfile &&
        session.lesson.course.teacherProfile.userId === socket.userId;

      let hasEnrollment = false;
      if (!isTeacher) {
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            userId: socket.userId!,
            package: {
              courseId: session.lesson.courseId,
            },
            isActive: true,
          },
        });
        hasEnrollment = !!enrollment;
      }

      if (!isTeacher && !hasEnrollment) {
        socket.emit('error', { message: 'You do not have access to this session' });
        return;
      }

      // Join room
      socket.join(sessionId);

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: socket.userId! },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      });

      // Notify room
      this.io.to(sessionId).emit('user-joined', {
        user,
        timestamp: new Date().toISOString(),
      });

      // Send session info to the user
      socket.emit('session-joined', {
        session: {
          id: session.id,
          title: session.title,
          description: session.description,
          scheduledAt: session.scheduledAt,
          status: session.status,
          meetingUrl: session.meetingUrl,
        },
      });

      logger.info(`User ${socket.userId} joined session ${sessionId}`);
    } catch (error) {
      logger.error('Error joining session:', error);
      socket.emit('error', { message: 'Failed to join session' });
    }
  }

  /**
   * Handle leaving a live session
   */
  private handleLeaveSession(socket: AuthenticatedSocket, sessionId?: string) {
    if (!sessionId || typeof sessionId !== 'string') {
      socket.emit('error', { message: 'Invalid session identifier' });
      return;
    }

    socket.leave(sessionId);

    this.io.to(sessionId).emit('user-left', {
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    });

    logger.info(`User ${socket.userId} left session ${sessionId}`);
  }

  /**
   * Handle chat message
   */
  private async handleChatMessage(
    socket: AuthenticatedSocket,
    sessionId: string,
    message: string
  ) {
    try {
      if (!sessionId || typeof sessionId !== 'string') {
        socket.emit('error', { message: 'Invalid session identifier' });
        return;
      }

      const text = (message ?? '').toString().trim();
      if (!text) {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }

      // Optional: verify the user is in the room
      if (!socket.rooms.has(sessionId)) {
        socket.emit('error', { message: 'You are not in this session' });
        return;
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: socket.userId! },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      });

      // Broadcast message to room
      this.io.to(sessionId).emit('chat-message', {
        user,
        message: text,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error sending chat message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle raise hand
   */
  private handleRaiseHand(socket: AuthenticatedSocket, sessionId: string) {
    if (!sessionId || typeof sessionId !== 'string') {
      socket.emit('error', { message: 'Invalid session identifier' });
      return;
    }

    // Optional: verify the user is in the room
    if (!socket.rooms.has(sessionId)) {
      socket.emit('error', { message: 'You are not in this session' });
      return;
    }

    this.io.to(sessionId).emit('hand-raised', {
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle start session (Teacher only)
   */
  private async handleStartSession(socket: AuthenticatedSocket, sessionId: string) {
    try {
      if (!sessionId || typeof sessionId !== 'string') {
        socket.emit('error', { message: 'Invalid session identifier' });
        return;
      }

      if (socket.userRole !== UserRole.TEACHER) {
        socket.emit('error', { message: 'Only teachers can start sessions' });
        return;
      }

      // Verify ownership
      const session = await prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: {
          lesson: {
            include: {
              course: { include: { teacherProfile: true } },
            },
          },
        },
      });

      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      const isOwner = !!session.lesson?.course?.teacherProfile &&
        session.lesson.course.teacherProfile.userId === socket.userId;

      if (!isOwner) {
        socket.emit('error', { message: 'You are not authorized to start this session' });
        return;
      }

      if (session.status === LiveSessionStatus.ONGOING) {
        socket.emit('error', { message: 'Session already started' });
        return;
      }

      if (session.status === LiveSessionStatus.COMPLETED) {
        socket.emit('error', { message: 'Session already completed' });
        return;
      }

      // Update session status
      const updated = await prisma.liveSession.update({
        where: { id: sessionId },
        data: {
          status: LiveSessionStatus.ONGOING,
          startedAt: new Date(),
        },
      });

      // Notify all participants
      this.io.to(sessionId).emit('session-started', {
        session: updated,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Session ${sessionId} started by ${socket.userId}`);
    } catch (error) {
      logger.error('Error starting session:', error);
      socket.emit('error', { message: 'Failed to start session' });
    }
  }

  /**
   * Handle end session (Teacher only)
   */
  private async handleEndSession(socket: AuthenticatedSocket, sessionId: string) {
    try {
      if (!sessionId || typeof sessionId !== 'string') {
        socket.emit('error', { message: 'Invalid session identifier' });
        return;
      }

      if (socket.userRole !== UserRole.TEACHER) {
        socket.emit('error', { message: 'Only teachers can end sessions' });
        return;
      }

      // Verify ownership
      const session = await prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: {
          lesson: {
            include: {
              course: { include: { teacherProfile: true } },
            },
          },
        },
      });

      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      const isOwner = !!session.lesson?.course?.teacherProfile &&
        session.lesson.course.teacherProfile.userId === socket.userId;

      if (!isOwner) {
        socket.emit('error', { message: 'You are not authorized to end this session' });
        return;
      }

      if (session.status === LiveSessionStatus.COMPLETED) {
        socket.emit('error', { message: 'Session already completed' });
        return;
      }

      // Update session status
      const updated = await prisma.liveSession.update({
        where: { id: sessionId },
        data: {
          status: LiveSessionStatus.COMPLETED,
          endedAt: new Date(),
        },
      });

      // Notify all participants
      this.io.to(sessionId).emit('session-ended', {
        session: updated,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Session ${sessionId} ended by ${socket.userId}`);
    } catch (error) {
      logger.error('Error ending session:', error);
      socket.emit('error', { message: 'Failed to end session' });
    }
  }
}

export default LiveSessionHandler;

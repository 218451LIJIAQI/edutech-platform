import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
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
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify token
        const decoded = jwt.verify(token, config.JWT_SECRET) as {
          id: string;
          role: UserRole;
        };

        socket.userId = decoded.id;
        socket.userRole = decoded.role;

        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`User connected: ${socket.userId}`);

      // Join live session room
      socket.on('join-session', async (data: { sessionId: string }) => {
        await this.handleJoinSession(socket, data.sessionId);
      });

      // Leave live session room
      socket.on('leave-session', (data: { sessionId: string }) => {
        this.handleLeaveSession(socket, data.sessionId);
      });

      // Send chat message
      socket.on('chat-message', async (data: { sessionId: string; message: string }) => {
        await this.handleChatMessage(socket, data.sessionId, data.message);
      });

      // Raise hand
      socket.on('raise-hand', (data: { sessionId: string }) => {
        this.handleRaiseHand(socket, data.sessionId);
      });

      // Start session (Teacher only)
      socket.on('start-session', async (data: { sessionId: string }) => {
        await this.handleStartSession(socket, data.sessionId);
      });

      // End session (Teacher only)
      socket.on('end-session', async (data: { sessionId: string }) => {
        await this.handleEndSession(socket, data.sessionId);
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
  private async handleJoinSession(socket: AuthenticatedSocket, sessionId: string) {
    try {
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
        session.lesson.course.teacherProfile.userId === socket.userId;

      const hasEnrollment = await prisma.enrollment.findFirst({
        where: {
          userId: socket.userId!,
          package: {
            courseId: session.lesson.courseId,
          },
          isActive: true,
        },
      });

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
        timestamp: new Date(),
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
  private handleLeaveSession(socket: AuthenticatedSocket, sessionId: string) {
    socket.leave(sessionId);

    this.io.to(sessionId).emit('user-left', {
      userId: socket.userId,
      timestamp: new Date(),
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
        message,
        timestamp: new Date(),
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
    this.io.to(sessionId).emit('hand-raised', {
      userId: socket.userId,
      timestamp: new Date(),
    });
  }

  /**
   * Handle start session (Teacher only)
   */
  private async handleStartSession(socket: AuthenticatedSocket, sessionId: string) {
    try {
      if (socket.userRole !== UserRole.TEACHER) {
        socket.emit('error', { message: 'Only teachers can start sessions' });
        return;
      }

      // Update session status
      const session = await prisma.liveSession.update({
        where: { id: sessionId },
        data: {
          status: 'ONGOING',
          startedAt: new Date(),
        },
      });

      // Notify all participants
      this.io.to(sessionId).emit('session-started', {
        session,
        timestamp: new Date(),
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
      if (socket.userRole !== UserRole.TEACHER) {
        socket.emit('error', { message: 'Only teachers can end sessions' });
        return;
      }

      // Update session status
      const session = await prisma.liveSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
        },
      });

      // Notify all participants
      this.io.to(sessionId).emit('session-ended', {
        session,
        timestamp: new Date(),
      });

      logger.info(`Session ${sessionId} ended by ${socket.userId}`);
    } catch (error) {
      logger.error('Error ending session:', error);
      socket.emit('error', { message: 'Failed to end session' });
    }
  }
}

export default LiveSessionHandler;


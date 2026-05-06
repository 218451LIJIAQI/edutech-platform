import type { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { LiveSessionStatus, UserRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import prisma from "../config/database";
import config from "../config/env";
import logger from "../utils/logger";
import { buildCurrentEnrollmentWhere } from "../services/shared/enrollment-access";
import {
  getTokenVersionFromPayload,
  unlockUserIfLockExpired,
} from "../utils/auth-session";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";

const MAX_CHAT_MESSAGE_LENGTH = 1000;

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: UserRole;
}

type AuthTokenPayload = JwtPayload & {
  id: string;
  tokenVersion?: unknown;
};

const liveSessionAccessInclude = {
  lesson: {
    include: {
      course: {
        include: {
          teacherProfile: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.LiveSessionInclude;

type LiveSessionAccessRecord = Prisma.LiveSessionGetPayload<{
  include: typeof liveSessionAccessInclude;
}>;

/**
 * Live Session Handler
 * Manages real-time communication for live classes.
 */
class LiveSessionHandler {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.initialize();
  }

  private initialize(): void {
    this.io.use(async (socket, next) => {
      const authenticatedSocket = socket as AuthenticatedSocket;

      try {
        const token = this.extractToken(authenticatedSocket);

        if (!token) {
          return next(new Error("Authentication required"));
        }

        if (!config.JWT_SECRET) {
          return next(new Error("Server misconfiguration"));
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);

        if (!this.isValidAuthPayload(decoded)) {
          return next(new Error("Invalid token"));
        }

        const userId = decoded.id.trim();

        const tokenVersion = getTokenVersionFromPayload(decoded.tokenVersion);

        if (tokenVersion < 0) {
          return next(new Error("Invalid token"));
        }

        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            role: true,
            isActive: true,
            isLocked: true,
            lockedUntil: true,
            failedLoginAttempts: true,
            tokenVersion: true,
          },
        });

        if (!currentUser) {
          return next(new Error("User not found"));
        }

        if (!currentUser.isActive) {
          return next(new Error("User account is inactive"));
        }

        const unlockedUser = await unlockUserIfLockExpired(currentUser);

        if (unlockedUser.isLocked) {
          return next(new Error("User account is locked"));
        }

        if (unlockedUser.tokenVersion !== tokenVersion) {
          return next(new Error("Session expired"));
        }

        authenticatedSocket.userId = unlockedUser.id;
        authenticatedSocket.userRole = unlockedUser.role;

        return next();
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          return next(new Error("Token expired"));
        }

        return next(new Error("Invalid token"));
      }
    });

    this.io.on("connection", (socket) => {
      const authenticatedSocket = socket as AuthenticatedSocket;

      logger.info(`User connected: ${authenticatedSocket.userId}`);

      authenticatedSocket.on("join-session", (data: { sessionId?: string }) => {
        void this.handleJoinSession(authenticatedSocket, data?.sessionId);
      });

      authenticatedSocket.on(
        "leave-session",
        (data: { sessionId?: string }) => {
          this.handleLeaveSession(authenticatedSocket, data?.sessionId);
        },
      );

      authenticatedSocket.on(
        "chat-message",
        (data: { sessionId?: string; message?: string }) => {
          void this.handleChatMessage(
            authenticatedSocket,
            data?.sessionId,
            data?.message,
          );
        },
      );

      authenticatedSocket.on("raise-hand", (data: { sessionId?: string }) => {
        void this.handleRaiseHand(authenticatedSocket, data?.sessionId);
      });

      authenticatedSocket.on(
        "start-session",
        (data: { sessionId?: string }) => {
          void this.handleStartSession(authenticatedSocket, data?.sessionId);
        },
      );

      authenticatedSocket.on("end-session", (data: { sessionId?: string }) => {
        void this.handleEndSession(authenticatedSocket, data?.sessionId);
      });

      authenticatedSocket.on("disconnect", () => {
        logger.info(`User disconnected: ${authenticatedSocket.userId}`);
      });
    });
  }

  private extractToken(socket: AuthenticatedSocket): string | null {
    const auth = socket.handshake.auth as { token?: unknown } | undefined;

    if (typeof auth?.token === "string" && auth.token.trim()) {
      return auth.token.trim();
    }

    const authHeader = socket.handshake.headers.authorization;

    const bearerMatch =
      typeof authHeader === "string"
        ? authHeader.match(/^\s*Bearer\s+(.+)$/i)
        : null;

    if (bearerMatch) {
      const token = bearerMatch[1].trim();
      return token || null;
    }

    return null;
  }

  private isValidAuthPayload(
    decoded: string | JwtPayload,
  ): decoded is AuthTokenPayload {
    return (
      typeof decoded === "object" &&
      decoded !== null &&
      typeof (decoded as AuthTokenPayload).id === "string" &&
      (decoded as AuthTokenPayload).id.trim().length > 0
    );
  }

  private normalizeIdentifier(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private sanitizeChatMessage(value: string): string {
    return sanitizeUserPlainText(value);
  }

  private emitSocketError(socket: AuthenticatedSocket, message: string): void {
    socket.emit("error", { message });
  }

  private isAuthenticated(
    socket: AuthenticatedSocket,
  ): socket is AuthenticatedSocket & { userId: string; userRole: UserRole } {
    return Boolean(socket.userId && socket.userRole);
  }

  private async findLiveSessionWithAccess(
    sessionId: string,
  ): Promise<LiveSessionAccessRecord | null> {
    return prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: liveSessionAccessInclude,
    });
  }

  private isTeacherOwner(
    socket: AuthenticatedSocket,
    session: LiveSessionAccessRecord,
  ): boolean {
    return (
      socket.userRole === UserRole.TEACHER &&
      Boolean(socket.userId) &&
      session.lesson.course.teacherProfile.userId === socket.userId
    );
  }

  private buildSessionPayload(
    session: LiveSessionAccessRecord,
    exposeMeetingUrl: boolean,
  ) {
    return {
      id: session.id,
      title: session.title,
      description: session.description,
      scheduledAt: session.scheduledAt,
      status: session.status,
      meetingUrl: exposeMeetingUrl ? session.meetingUrl : null,
    };
  }

  private async handleJoinSession(
    socket: AuthenticatedSocket,
    sessionId?: string,
  ): Promise<void> {
    try {
      const normalizedSessionId = this.normalizeIdentifier(sessionId);

      if (!normalizedSessionId) {
        this.emitSocketError(socket, "Invalid session identifier");
        return;
      }

      if (!this.isAuthenticated(socket)) {
        this.emitSocketError(socket, "Authentication required");
        return;
      }

      const session = await this.findLiveSessionWithAccess(normalizedSessionId);

      if (!session) {
        this.emitSocketError(socket, "Session not found");
        return;
      }

      if (session.status === LiveSessionStatus.CANCELLED) {
        this.emitSocketError(socket, "Cancelled sessions cannot be joined");
        return;
      }

      if (session.status === LiveSessionStatus.COMPLETED) {
        this.emitSocketError(
          socket,
          "Completed sessions are no longer available",
        );
        return;
      }

      const isTeacher = this.isTeacherOwner(socket, session);

      let hasEnrollment = false;

      if (!isTeacher) {
        const enrollment = await prisma.enrollment.findFirst({
          where: buildCurrentEnrollmentWhere({
            userId: socket.userId,
            package: {
              courseId: session.lesson.courseId,
            },
          }),
          select: {
            id: true,
          },
        });

        hasEnrollment = Boolean(enrollment);
      }

      if (!isTeacher && !hasEnrollment) {
        this.emitSocketError(socket, "You do not have access to this session");
        return;
      }

      if (!isTeacher && session.maxParticipants) {
        const room = this.io.sockets.adapter.rooms.get(normalizedSessionId);
        const participantCount = room?.size ?? 0;

        if (participantCount >= session.maxParticipants) {
          this.emitSocketError(
            socket,
            "This session has reached its participant limit",
          );
          return;
        }
      }

      const exposeMeetingUrl =
        isTeacher || session.status === LiveSessionStatus.ONGOING;

      if (socket.rooms.has(normalizedSessionId)) {
        socket.emit("session-joined", {
          session: this.buildSessionPayload(session, exposeMeetingUrl),
        });
        return;
      }

      socket.join(normalizedSessionId);

      const user = await prisma.user.findUnique({
        where: { id: socket.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      });

      if (!user) {
        this.emitSocketError(socket, "User not found");
        return;
      }

      this.io.to(normalizedSessionId).emit("user-joined", {
        user,
        timestamp: new Date().toISOString(),
      });

      socket.emit("session-joined", {
        session: this.buildSessionPayload(session, exposeMeetingUrl),
      });

      logger.info(
        `User ${socket.userId} joined session ${normalizedSessionId}`,
      );
    } catch (error) {
      logger.error("Error joining session:", error);
      this.emitSocketError(socket, "Failed to join session");
    }
  }

  private handleLeaveSession(
    socket: AuthenticatedSocket,
    sessionId?: string,
  ): void {
    const normalizedSessionId = this.normalizeIdentifier(sessionId);

    if (!normalizedSessionId) {
      this.emitSocketError(socket, "Invalid session identifier");
      return;
    }

    if (!socket.rooms.has(normalizedSessionId)) {
      this.emitSocketError(socket, "You are not in this session");
      return;
    }

    socket.leave(normalizedSessionId);

    this.io.to(normalizedSessionId).emit("user-left", {
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    });

    logger.info(`User ${socket.userId} left session ${normalizedSessionId}`);
  }

  private async handleChatMessage(
    socket: AuthenticatedSocket,
    sessionId?: string,
    message?: string,
  ): Promise<void> {
    try {
      const normalizedSessionId = this.normalizeIdentifier(sessionId);

      if (!normalizedSessionId) {
        this.emitSocketError(socket, "Invalid session identifier");
        return;
      }

      if (!this.isAuthenticated(socket)) {
        this.emitSocketError(socket, "Authentication required");
        return;
      }

      const text =
        typeof message === "string" ? this.sanitizeChatMessage(message) : "";

      if (!text) {
        this.emitSocketError(socket, "Message cannot be empty");
        return;
      }

      if (text.length > MAX_CHAT_MESSAGE_LENGTH) {
        this.emitSocketError(
          socket,
          `Message cannot exceed ${MAX_CHAT_MESSAGE_LENGTH} characters`,
        );
        return;
      }

      if (!socket.rooms.has(normalizedSessionId)) {
        this.emitSocketError(socket, "You are not in this session");
        return;
      }

      const session = await prisma.liveSession.findUnique({
        where: { id: normalizedSessionId },
        select: {
          status: true,
        },
      });

      if (!session) {
        this.emitSocketError(socket, "Session not found");
        return;
      }

      if (session.status !== LiveSessionStatus.ONGOING) {
        this.emitSocketError(
          socket,
          "Chat is only available during an ongoing session",
        );
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: socket.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      });

      if (!user) {
        this.emitSocketError(socket, "User not found");
        return;
      }

      this.io.to(normalizedSessionId).emit("chat-message", {
        user,
        message: text,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error sending chat message:", error);
      this.emitSocketError(socket, "Failed to send message");
    }
  }

  private async handleRaiseHand(
    socket: AuthenticatedSocket,
    sessionId?: string,
  ): Promise<void> {
    try {
      const normalizedSessionId = this.normalizeIdentifier(sessionId);

      if (!normalizedSessionId) {
        this.emitSocketError(socket, "Invalid session identifier");
        return;
      }

      if (!this.isAuthenticated(socket)) {
        this.emitSocketError(socket, "Authentication required");
        return;
      }

      if (!socket.rooms.has(normalizedSessionId)) {
        this.emitSocketError(socket, "You are not in this session");
        return;
      }

      const session = await prisma.liveSession.findUnique({
        where: { id: normalizedSessionId },
        select: {
          status: true,
        },
      });

      if (!session) {
        this.emitSocketError(socket, "Session not found");
        return;
      }

      if (session.status !== LiveSessionStatus.ONGOING) {
        this.emitSocketError(
          socket,
          "Hand raising is only available during an ongoing session",
        );
        return;
      }

      this.io.to(normalizedSessionId).emit("hand-raised", {
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error raising hand:", error);
      this.emitSocketError(socket, "Failed to raise hand");
    }
  }

  private async handleStartSession(
    socket: AuthenticatedSocket,
    sessionId?: string,
  ): Promise<void> {
    try {
      const normalizedSessionId = this.normalizeIdentifier(sessionId);

      if (!normalizedSessionId) {
        this.emitSocketError(socket, "Invalid session identifier");
        return;
      }

      if (!this.isAuthenticated(socket)) {
        this.emitSocketError(socket, "Authentication required");
        return;
      }

      if (socket.userRole !== UserRole.TEACHER) {
        this.emitSocketError(socket, "Only teachers can start sessions");
        return;
      }

      const session = await this.findLiveSessionWithAccess(normalizedSessionId);

      if (!session) {
        this.emitSocketError(socket, "Session not found");
        return;
      }

      if (!this.isTeacherOwner(socket, session)) {
        this.emitSocketError(
          socket,
          "You are not authorized to start this session",
        );
        return;
      }

      if (session.status === LiveSessionStatus.ONGOING) {
        this.emitSocketError(socket, "Session already started");
        return;
      }

      if (session.status === LiveSessionStatus.COMPLETED) {
        this.emitSocketError(socket, "Session already completed");
        return;
      }

      if (session.status === LiveSessionStatus.CANCELLED) {
        this.emitSocketError(socket, "Cancelled sessions cannot be started");
        return;
      }

      if (session.status !== LiveSessionStatus.SCHEDULED) {
        this.emitSocketError(socket, "Only scheduled sessions can be started");
        return;
      }

      const updateResult = await prisma.liveSession.updateMany({
        where: {
          id: normalizedSessionId,
          status: LiveSessionStatus.SCHEDULED,
        },
        data: {
          status: LiveSessionStatus.ONGOING,
          startedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        this.emitSocketError(
          socket,
          "Session status changed. Please refresh and try again",
        );
        return;
      }

      const updated = await prisma.liveSession.findUnique({
        where: { id: normalizedSessionId },
      });

      this.io.to(normalizedSessionId).emit("session-started", {
        session: updated,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Session ${normalizedSessionId} started by ${socket.userId}`);
    } catch (error) {
      logger.error("Error starting session:", error);
      this.emitSocketError(socket, "Failed to start session");
    }
  }

  private async handleEndSession(
    socket: AuthenticatedSocket,
    sessionId?: string,
  ): Promise<void> {
    try {
      const normalizedSessionId = this.normalizeIdentifier(sessionId);

      if (!normalizedSessionId) {
        this.emitSocketError(socket, "Invalid session identifier");
        return;
      }

      if (!this.isAuthenticated(socket)) {
        this.emitSocketError(socket, "Authentication required");
        return;
      }

      if (socket.userRole !== UserRole.TEACHER) {
        this.emitSocketError(socket, "Only teachers can end sessions");
        return;
      }

      const session = await this.findLiveSessionWithAccess(normalizedSessionId);

      if (!session) {
        this.emitSocketError(socket, "Session not found");
        return;
      }

      if (!this.isTeacherOwner(socket, session)) {
        this.emitSocketError(
          socket,
          "You are not authorized to end this session",
        );
        return;
      }

      if (session.status === LiveSessionStatus.COMPLETED) {
        this.emitSocketError(socket, "Session already completed");
        return;
      }

      if (session.status === LiveSessionStatus.CANCELLED) {
        this.emitSocketError(socket, "Cancelled sessions cannot be ended");
        return;
      }

      if (session.status !== LiveSessionStatus.ONGOING) {
        this.emitSocketError(socket, "Only ongoing sessions can be ended");
        return;
      }

      const updateResult = await prisma.liveSession.updateMany({
        where: {
          id: normalizedSessionId,
          status: LiveSessionStatus.ONGOING,
        },
        data: {
          status: LiveSessionStatus.COMPLETED,
          endedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        this.emitSocketError(
          socket,
          "Session status changed. Please refresh and try again",
        );
        return;
      }

      const updated = await prisma.liveSession.findUnique({
        where: { id: normalizedSessionId },
      });

      this.io.to(normalizedSessionId).emit("session-ended", {
        session: updated,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Session ${normalizedSessionId} ended by ${socket.userId}`);
    } catch (error) {
      logger.error("Error ending session:", error);
      this.emitSocketError(socket, "Failed to end session");
    }
  }
}

export default LiveSessionHandler;

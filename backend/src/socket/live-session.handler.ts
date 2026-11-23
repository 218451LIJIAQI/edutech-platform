import type { Server, Socket } from "socket.io";
import { LiveSessionStatus, RegistrationStatus, UserRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import prisma from "../config/database";
import logger from "../utils/logger";
import { authenticateAccessToken, extractBearerToken } from "../middleware/auth";
import { AuthenticationError } from "../utils/errors";
import { buildCurrentEnrollmentWhere } from "../services/shared/enrollment-access";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";

const MAX_CHAT_MESSAGE_LENGTH = 1000;

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: UserRole;
  tokenVersion?: number;
}

interface SerializableLiveSession {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: Date;
  status: LiveSessionStatus;
  meetingUrl: string | null;
}

const liveSessionAccessInclude = {
  lesson: {
    include: {
      course: {
        include: {
          teacherProfile: {
            select: {
              userId: true,
              registrationStatus: true,
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
 * Manages real-time classroom presence, chat, hand-raising, and teacher lifecycle controls.
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

        const user = await authenticateAccessToken(token);
        authenticatedSocket.userId = user.id;
        authenticatedSocket.userRole = user.role;
        authenticatedSocket.tokenVersion = user.tokenVersion;
        return next();
      } catch (error) {
        if (error instanceof AuthenticationError) {
          const message = error.message.startsWith("Session expired")
            ? "Session expired"
            : error.message;
          return next(new Error(message));
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

      authenticatedSocket.on("disconnecting", () => {
        if (!authenticatedSocket.userId) {
          return;
        }
        const timestamp = new Date().toISOString();
        for (const roomId of authenticatedSocket.rooms) {
          if (roomId !== authenticatedSocket.id) {
            authenticatedSocket.to(roomId).emit("user-left", {
              userId: authenticatedSocket.userId,
              timestamp,
            });
          }
        }
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

    return extractBearerToken(socket.handshake.headers.authorization);
  }

  private normalizeIdentifier(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private emitSocketError(socket: AuthenticatedSocket, message: string): void {
    socket.emit("error", { message });
  }

  private isAuthenticated(
    socket: AuthenticatedSocket,
  ): socket is AuthenticatedSocket & { userId: string; userRole: UserRole } {
    return Boolean(socket.userId && socket.userRole);
  }

  private async verifyLiveSocketUser(socket: AuthenticatedSocket) {
    if (!this.isAuthenticated(socket)) {
      this.emitSocketError(socket, "Authentication required");
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: socket.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isActive: true,
        isLocked: true,
        lockedUntil: true,
        tokenVersion: true,
      },
    });

    const isCurrentlyLocked =
      Boolean(user?.isLocked) &&
      (!user?.lockedUntil || user.lockedUntil.getTime() > Date.now());

    if (
      !user ||
      !user.isActive ||
      isCurrentlyLocked ||
      (socket.tokenVersion !== undefined &&
        user.tokenVersion !== socket.tokenVersion)
    ) {
      this.emitSocketError(socket, "Session expired");
      socket.disconnect(true);
      return null;
    }

    socket.userRole = user.role;
    return user;
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
      session.lesson.course.teacherProfile.userId === socket.userId &&
      session.lesson.course.teacherProfile.registrationStatus ===
        RegistrationStatus.APPROVED
    );
  }

  private async hasStudentSessionAccess(
    userId: string,
    session: LiveSessionAccessRecord,
  ): Promise<boolean> {
    if (session.lesson.isFree && session.lesson.course.isPublished) {
      return true;
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: buildCurrentEnrollmentWhere({
        userId,
        package: { courseId: session.lesson.courseId },
      }),
      select: { id: true },
    });

    return Boolean(enrollment);
  }

  private countStudentParticipantsInRoom(
    roomId: string,
    teacherUserId: string,
  ): number {
    const roomSockets = this.io.sockets.adapter.rooms.get(roomId);
    if (!roomSockets) {
      return 0;
    }

    const activeStudentIds = new Set<string>();
    for (const socketId of roomSockets) {
      const peer = this.io.sockets.sockets.get(socketId) as
        | AuthenticatedSocket
        | undefined;
      if (peer?.userId && peer.userId !== teacherUserId) {
        activeStudentIds.add(peer.userId);
      }
    }

    return activeStudentIds.size;
  }

  private buildSessionPayload(
    session: SerializableLiveSession,
    exposeMeetingUrl: boolean,
    isTeacher = false,
  ) {
    return {
      id: session.id,
      title: session.title,
      description: session.description,
      scheduledAt: session.scheduledAt,
      status: session.status,
      meetingUrl: exposeMeetingUrl ? session.meetingUrl : null,
      isTeacher,
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

      const liveUser = await this.verifyLiveSocketUser(socket);
      if (!liveUser) {
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
      if (!isTeacher) {
        const hasAccess = await this.hasStudentSessionAccess(
          liveUser.id,
          session,
        );
        if (!hasAccess) {
          this.emitSocketError(
            socket,
            "You do not have access to this session",
          );
          return;
        }
      }

      const exposeMeetingUrl =
        isTeacher || session.status === LiveSessionStatus.ONGOING;

      if (socket.rooms.has(normalizedSessionId)) {
        socket.emit("session-joined", {
          session: this.buildSessionPayload(
            session,
            exposeMeetingUrl,
            isTeacher,
          ),
        });
        return;
      }

      if (!isTeacher && session.maxParticipants) {
        const teacherUserId = session.lesson.course.teacherProfile.userId;
        const currentStudentCount = this.countStudentParticipantsInRoom(
          normalizedSessionId,
          teacherUserId,
        );
        const alreadyCountedUser = Array.from(
          this.io.sockets.adapter.rooms.get(normalizedSessionId) ?? [],
        ).some(
          (sid) =>
            (this.io.sockets.sockets.get(sid) as AuthenticatedSocket | undefined)
              ?.userId === liveUser.id,
        );

        if (
          !alreadyCountedUser &&
          currentStudentCount >= session.maxParticipants
        ) {
          this.emitSocketError(
            socket,
            "This session has reached its participant limit",
          );
          return;
        }
      }

      socket.join(normalizedSessionId);

      const publicUser = {
        id: liveUser.id,
        firstName: liveUser.firstName,
        lastName: liveUser.lastName,
        avatar: liveUser.avatar,
      };

      this.io.to(normalizedSessionId).emit("user-joined", {
        user: publicUser,
        timestamp: new Date().toISOString(),
      });

      socket.emit("session-joined", {
        session: this.buildSessionPayload(session, exposeMeetingUrl, isTeacher),
      });

      logger.info(
        `User ${liveUser.id} joined session ${normalizedSessionId}`,
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
      return;
    }

    socket.leave(normalizedSessionId);

    this.io.to(normalizedSessionId).emit("user-left", {
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    });

    logger.info(`User ${socket.userId} left session ${normalizedSessionId}`);
  }

  private async verifyOngoingParticipantSession(
    socket: AuthenticatedSocket,
    sessionId: string,
    unavailableMessage: string,
  ) {
    const liveUser = await this.verifyLiveSocketUser(socket);
    if (!liveUser) {
      return null;
    }

    if (!socket.rooms.has(sessionId)) {
      this.emitSocketError(socket, "You are not in this session");
      return null;
    }

    const session = await this.findLiveSessionWithAccess(sessionId);
    if (!session) {
      this.emitSocketError(socket, "Session not found");
      return null;
    }

    if (session.status !== LiveSessionStatus.ONGOING) {
      this.emitSocketError(socket, unavailableMessage);
      return null;
    }

    const isTeacher = this.isTeacherOwner(socket, session);
    if (!isTeacher) {
      const hasAccess = await this.hasStudentSessionAccess(
        liveUser.id,
        session,
      );
      if (!hasAccess) {
        socket.leave(sessionId);
        this.emitSocketError(
          socket,
          "Your enrollment access to this session is no longer active",
        );
        return null;
      }
    }

    return liveUser;
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

      const text =
        typeof message === "string" ? sanitizeUserPlainText(message) : "";
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

      const liveUser = await this.verifyOngoingParticipantSession(
        socket,
        normalizedSessionId,
        "Chat is only available during an ongoing session",
      );
      if (!liveUser) {
        return;
      }

      this.io.to(normalizedSessionId).emit("chat-message", {
        user: {
          id: liveUser.id,
          firstName: liveUser.firstName,
          lastName: liveUser.lastName,
          avatar: liveUser.avatar,
        },
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

      const liveUser = await this.verifyOngoingParticipantSession(
        socket,
        normalizedSessionId,
        "Hand raising is only available during an ongoing session",
      );
      if (!liveUser) {
        return;
      }

      this.io.to(normalizedSessionId).emit("hand-raised", {
        userId: liveUser.id,
        user: {
          id: liveUser.id,
          firstName: liveUser.firstName,
          lastName: liveUser.lastName,
        },
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

      const liveUser = await this.verifyLiveSocketUser(socket);
      if (!liveUser) {
        return;
      }

      if (liveUser.role !== UserRole.TEACHER) {
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

      if (updated) {
        this.io.to(normalizedSessionId).emit("session-started", {
          session: this.buildSessionPayload(updated, true),
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`Session ${normalizedSessionId} started by ${liveUser.id}`);
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

      const liveUser = await this.verifyLiveSocketUser(socket);
      if (!liveUser) {
        return;
      }

      if (liveUser.role !== UserRole.TEACHER) {
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

      if (updated) {
        this.io.to(normalizedSessionId).emit("session-ended", {
          session: this.buildSessionPayload(updated, false),
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`Session ${normalizedSessionId} ended by ${liveUser.id}`);
    } catch (error) {
      logger.error("Error ending session:", error);
      this.emitSocketError(socket, "Failed to end session");
    }
  }
}

export default LiveSessionHandler;

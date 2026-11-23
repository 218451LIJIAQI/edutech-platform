import type { Server, Socket } from "socket.io";
import { LiveSessionStatus, UserRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import prisma from "../config/database";
import logger from "../utils/logger";
import {
  authenticateAccessToken,
  extractBearerToken,
  verifyActiveAuthenticatedUser,
  type AuthenticatedUser,
} from "../middleware/auth";
import { AuthenticationError } from "../utils/errors";
import { buildCurrentEnrollmentWhere } from "../services/shared/enrollment-access";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";

const MAX_CHAT_MESSAGE_LENGTH = 1000;

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: UserRole;
  tokenVersion?: number;
}

export interface SerializableLiveSession {
  id: string;
  lessonId?: string;
  title: string;
  description: string | null;
  scheduledAt: Date;
  startedAt?: Date | null;
  endedAt?: Date | null;
  duration?: number | null;
  maxParticipants?: number | null;
  status: LiveSessionStatus;
  meetingUrl: string | null;
  recordingUrl?: string | null;
}

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

let activeLiveSessionHandler: LiveSessionHandler | null = null;

export const broadcastLiveSessionStarted = (
  session: SerializableLiveSession,
): void => {
  activeLiveSessionHandler?.emitSessionStarted(session);
};

export const broadcastLiveSessionEnded = (
  session: SerializableLiveSession,
): void => {
  activeLiveSessionHandler?.emitSessionEnded(session);
};

export const broadcastLiveSessionCancelled = (
  session: SerializableLiveSession,
): void => {
  activeLiveSessionHandler?.emitSessionCancelled(session);
};

/**
 * Manages real-time classroom presence, chat, hand-raising, and teacher lifecycle controls.
 */
class LiveSessionHandler {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    activeLiveSessionHandler = this;
    this.initialize();
  }

  public emitSessionStarted(session: SerializableLiveSession): void {
    this.io.to(session.id).emit("session-started", {
      session: this.buildSessionPayload(session, {
        exposeMeetingUrl: true,
        exposeRecordingUrl: false,
      }),
      timestamp: new Date().toISOString(),
    });
  }

  public emitSessionEnded(session: SerializableLiveSession): void {
    this.io.to(session.id).emit("session-ended", {
      session: this.buildSessionPayload(session, {
        exposeMeetingUrl: false,
        exposeRecordingUrl: true,
      }),
      timestamp: new Date().toISOString(),
    });
  }

  public emitSessionCancelled(session: SerializableLiveSession): void {
    this.io.to(session.id).emit("session-ended", {
      session: this.buildSessionPayload(session, {
        exposeMeetingUrl: false,
        exposeRecordingUrl: false,
      }),
      timestamp: new Date().toISOString(),
    });
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

  /**
   * Re-verifies account status (`isActive`, `!isLocked`, `tokenVersion`) on every
   * stateful Socket.IO action so banned/locked/logged-out users are disconnected immediately.
   */
  private async requireLiveAccount(
    socket: AuthenticatedSocket,
  ): Promise<AuthenticatedUser | null> {
    if (!socket.userId || !socket.userRole) {
      this.emitSocketError(socket, "Authentication required");
      return null;
    }

    try {
      const verified = await verifyActiveAuthenticatedUser(
        socket.userId,
        socket.tokenVersion,
      );
      socket.userRole = verified.role;
      return verified;
    } catch (error) {
      const message =
        error instanceof AuthenticationError &&
        error.message.startsWith("Session expired")
          ? "Session expired"
          : error instanceof AuthenticationError
            ? error.message
            : "Authentication required";
      this.emitSocketError(socket, message);
      socket.disconnect(true);
      return null;
    }
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

  private async hasSessionParticipantAccess(
    socket: AuthenticatedSocket,
    session: LiveSessionAccessRecord,
  ): Promise<boolean> {
    if (!socket.userId) {
      return false;
    }

    if (
      this.isTeacherOwner(socket, session) ||
      socket.userRole === UserRole.ADMIN
    ) {
      return true;
    }

    if (session.lesson.isFree && session.lesson.course.isPublished) {
      return true;
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: buildCurrentEnrollmentWhere({
        userId: socket.userId,
        package: { courseId: session.lesson.courseId },
      }),
      select: { id: true },
    });

    return Boolean(enrollment);
  }

  private countDistinctConnectedStudents(
    sessionId: string,
    teacherOwnerUserId: string,
  ): Set<string> {
    const socketIds = this.io.sockets.adapter.rooms.get(sessionId);
    const studentUserIds = new Set<string>();

    if (!socketIds) {
      return studentUserIds;
    }

    for (const socketId of socketIds) {
      const peerSocket = this.io.sockets.sockets.get(socketId) as
        | AuthenticatedSocket
        | undefined;
      if (!peerSocket?.userId) {
        continue;
      }
      if (
        peerSocket.userId === teacherOwnerUserId ||
        peerSocket.userRole === UserRole.ADMIN
      ) {
        continue;
      }
      studentUserIds.add(peerSocket.userId);
    }

    return studentUserIds;
  }

  private buildSessionPayload(
    session: SerializableLiveSession,
    options: { exposeMeetingUrl: boolean; exposeRecordingUrl: boolean },
  ) {
    return {
      id: session.id,
      lessonId: session.lessonId,
      title: session.title,
      description: session.description,
      scheduledAt: session.scheduledAt,
      startedAt: session.startedAt ?? null,
      endedAt: session.endedAt ?? null,
      duration: session.duration ?? null,
      maxParticipants: session.maxParticipants ?? null,
      status: session.status,
      meetingUrl: options.exposeMeetingUrl ? session.meetingUrl : null,
      recordingUrl: options.exposeRecordingUrl
        ? (session.recordingUrl ?? null)
        : null,
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

      const activeUser = await this.requireLiveAccount(socket);
      if (!activeUser) {
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
      const isAdmin = activeUser.role === UserRole.ADMIN;

      if (!isTeacher && !isAdmin) {
        const hasAccess = await this.hasSessionParticipantAccess(
          socket,
          session,
        );
        if (!hasAccess) {
          this.emitSocketError(
            socket,
            "You do not have access to this session",
          );
          return;
        }

        if (session.maxParticipants) {
          const connectedStudents = this.countDistinctConnectedStudents(
            normalizedSessionId,
            session.lesson.course.teacherProfile.userId,
          );

          if (
            !connectedStudents.has(activeUser.id) &&
            connectedStudents.size >= session.maxParticipants
          ) {
            this.emitSocketError(
              socket,
              "This session has reached its participant limit",
            );
            return;
          }
        }
      }

      const exposeMeetingUrl =
        isTeacher || isAdmin || session.status === LiveSessionStatus.ONGOING;
      const exposeRecordingUrl =
        isTeacher || isAdmin || session.status === LiveSessionStatus.COMPLETED;

      if (socket.rooms.has(normalizedSessionId)) {
        socket.emit("session-joined", {
          session: this.buildSessionPayload(session, {
            exposeMeetingUrl,
            exposeRecordingUrl,
          }),
        });
        return;
      }

      socket.join(normalizedSessionId);

      const user = await prisma.user.findUnique({
        where: { id: activeUser.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      });

      if (!user) {
        socket.leave(normalizedSessionId);
        this.emitSocketError(socket, "User not found");
        return;
      }

      this.io.to(normalizedSessionId).emit("user-joined", {
        user,
        timestamp: new Date().toISOString(),
      });

      socket.emit("session-joined", {
        session: this.buildSessionPayload(session, {
          exposeMeetingUrl,
          exposeRecordingUrl,
        }),
      });

      logger.info(
        `User ${activeUser.id} joined session ${normalizedSessionId}`,
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

  private async verifyOngoingParticipantSession(
    socket: AuthenticatedSocket,
    sessionId: string,
    unavailableMessage: string,
  ): Promise<boolean> {
    if (!socket.rooms.has(sessionId)) {
      this.emitSocketError(socket, "You are not in this session");
      return false;
    }

    const session = await this.findLiveSessionWithAccess(sessionId);

    if (!session) {
      this.emitSocketError(socket, "Session not found");
      return false;
    }

    if (session.status !== LiveSessionStatus.ONGOING) {
      this.emitSocketError(socket, unavailableMessage);
      return false;
    }

    const stillHasAccess = await this.hasSessionParticipantAccess(
      socket,
      session,
    );
    if (!stillHasAccess) {
      socket.leave(sessionId);
      this.emitSocketError(socket, "You no longer have access to this session");
      return false;
    }

    return true;
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

      const activeUser = await this.requireLiveAccount(socket);
      if (!activeUser) {
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

      const canSend = await this.verifyOngoingParticipantSession(
        socket,
        normalizedSessionId,
        "Chat is only available during an ongoing session",
      );
      if (!canSend) {
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: activeUser.id },
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

      const activeUser = await this.requireLiveAccount(socket);
      if (!activeUser) {
        return;
      }

      const canRaise = await this.verifyOngoingParticipantSession(
        socket,
        normalizedSessionId,
        "Hand raising is only available during an ongoing session",
      );
      if (!canRaise) {
        return;
      }

      this.io.to(normalizedSessionId).emit("hand-raised", {
        userId: activeUser.id,
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

      const activeUser = await this.requireLiveAccount(socket);
      if (!activeUser) {
        return;
      }

      if (activeUser.role !== UserRole.TEACHER) {
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
        this.emitSessionStarted(updated);
      }

      logger.info(`Session ${normalizedSessionId} started by ${activeUser.id}`);
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

      const activeUser = await this.requireLiveAccount(socket);
      if (!activeUser) {
        return;
      }

      if (activeUser.role !== UserRole.TEACHER) {
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

      const now = new Date();
      const endedAt =
        session.startedAt && now < session.startedAt ? session.startedAt : now;

      const updateResult = await prisma.liveSession.updateMany({
        where: {
          id: normalizedSessionId,
          status: LiveSessionStatus.ONGOING,
        },
        data: {
          status: LiveSessionStatus.COMPLETED,
          endedAt,
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
        this.emitSessionEnded(updated);
      }

      logger.info(`Session ${normalizedSessionId} ended by ${activeUser.id}`);
    } catch (error) {
      logger.error("Error ending session:", error);
      this.emitSocketError(socket, "Failed to end session");
    }
  }
}

export default LiveSessionHandler;

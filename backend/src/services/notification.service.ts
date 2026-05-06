import prisma from "../config/database";
import { NotFoundError, ValidationError } from "../utils/errors";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";
import type { Notification, Prisma } from "@prisma/client";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_BULK_NOTIFICATION_USERS = 1000;

const MAX_NOTIFICATION_TITLE_LENGTH = 150;
const MAX_NOTIFICATION_MESSAGE_LENGTH = 1000;
const MAX_NOTIFICATION_TYPE_LENGTH = 50;

const DEFAULT_NOTIFICATION_TYPE = "general";
const NOTIFICATION_TYPE_PATTERN = /^[a-z0-9_-]+$/i;

type NotificationPagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type NotificationListResponse = {
  notifications: Notification[];
  pagination: NotificationPagination;
};

const normalizeRequiredId = (value: string, fieldName: string): string => {
  const normalized = value?.trim();

  if (!normalized) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return normalized;
};

const normalizePagination = (
  page: number = DEFAULT_PAGE,
  limit: number = DEFAULT_LIMIT,
) => {
  const safePage =
    Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE;

  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.floor(limit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const normalizeRequiredText = (
  value: string,
  fieldName: string,
  maxLength: number,
): string => {
  const normalized = sanitizeUserPlainText(value).replace(/\s+/g, " ");

  if (!normalized) {
    throw new ValidationError(`${fieldName} is required`);
  }

  if (normalized.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return normalized;
};

const normalizeNotificationType = (type?: string): string => {
  const normalized = (type?.trim() || DEFAULT_NOTIFICATION_TYPE).toLowerCase();

  if (normalized.length > MAX_NOTIFICATION_TYPE_LENGTH) {
    throw new ValidationError(
      `Notification type must not exceed ${MAX_NOTIFICATION_TYPE_LENGTH} characters`,
    );
  }

  if (!NOTIFICATION_TYPE_PATTERN.test(normalized)) {
    throw new ValidationError(
      "Notification type can only contain letters, numbers, underscores, and hyphens",
    );
  }

  return normalized;
};

const normalizeUniqueUserIds = (userIds: string[]): string[] => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return [];
  }

  const uniqueUserIds = Array.from(
    new Set(
      userIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  );

  if (uniqueUserIds.length > MAX_BULK_NOTIFICATION_USERS) {
    throw new ValidationError(
      `A maximum of ${MAX_BULK_NOTIFICATION_USERS} users can be notified at once`,
    );
  }

  return uniqueUserIds;
};

/**
 * Notification Service
 * Handles notification listing, unread counts, read status updates, deletion,
 * and bulk notification creation.
 */
class NotificationService {
  /**
   * Get a user's notifications with safe pagination.
   */
  async getUserNotifications(
    userId: string,
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_LIMIT,
  ): Promise<NotificationListResponse> {
    const normalizedUserId = normalizeRequiredId(userId, "User ID");
    const pagination = normalizePagination(page, limit);

    const where: Prisma.NotificationWhereInput = {
      userId: normalizedUserId,
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }

  /**
   * Get unread notification count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const normalizedUserId = normalizeRequiredId(userId, "User ID");

    return prisma.notification.count({
      where: {
        userId: normalizedUserId,
        isRead: false,
      },
    });
  }

  /**
   * Mark one notification as read. Scoped to the notification owner.
   */
  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const normalizedNotificationId = normalizeRequiredId(
      notificationId,
      "Notification ID",
    );
    const normalizedUserId = normalizeRequiredId(userId, "User ID");

    const notification = await prisma.notification.findFirst({
      where: {
        id: normalizedNotificationId,
        userId: normalizedUserId,
      },
    });

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    if (notification.isRead) {
      return notification;
    }

    return prisma.notification.update({
      where: { id: normalizedNotificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all unread notifications as read for one user.
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const normalizedUserId = normalizeRequiredId(userId, "User ID");

    return prisma.notification.updateMany({
      where: {
        userId: normalizedUserId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  /**
   * Delete one notification. Scoped to the notification owner.
   */
  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const normalizedNotificationId = normalizeRequiredId(
      notificationId,
      "Notification ID",
    );
    const normalizedUserId = normalizeRequiredId(userId, "User ID");

    const { count } = await prisma.notification.deleteMany({
      where: {
        id: normalizedNotificationId,
        userId: normalizedUserId,
      },
    });

    if (count === 0) {
      throw new NotFoundError("Notification not found");
    }
  }

  /**
   * Create notifications for multiple existing active users.
   * Invalid or inactive user IDs are skipped to prevent foreign-key failures.
   */
  async createBulkNotifications(
    userIds: string[],
    title: string,
    message: string,
    type: string = DEFAULT_NOTIFICATION_TYPE,
  ): Promise<{ count: number }> {
    const uniqueUserIds = normalizeUniqueUserIds(userIds);

    if (uniqueUserIds.length === 0) {
      return { count: 0 };
    }

    const normalizedTitle = normalizeRequiredText(
      title,
      "Notification title",
      MAX_NOTIFICATION_TITLE_LENGTH,
    );
    const normalizedMessage = normalizeRequiredText(
      message,
      "Notification message",
      MAX_NOTIFICATION_MESSAGE_LENGTH,
    );
    const normalizedType = normalizeNotificationType(type);

    const existingUsers = await prisma.user.findMany({
      where: {
        id: { in: uniqueUserIds },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (existingUsers.length === 0) {
      return { count: 0 };
    }

    const notifications = existingUsers.map((user) => ({
      userId: user.id,
      title: normalizedTitle,
      message: normalizedMessage,
      type: normalizedType,
    }));

    return prisma.notification.createMany({
      data: notifications,
    });
  }
}

export default new NotificationService();

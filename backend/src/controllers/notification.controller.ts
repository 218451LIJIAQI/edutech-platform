import { Request, Response } from "express";
import notificationService from "../services/notification.service";
import asyncHandler from "../utils/async-handler";
import { AuthenticationError, BadRequestError } from "../utils/errors";

/**
 * Notification Controller
 * Handles HTTP requests for notification-related endpoints.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

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
  if (!req.user) {
    throw new AuthenticationError("Authentication required");
  }

  return req.user.id;
};

const parseRequiredId = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} is required`);
  }

  const parsed = value.trim();

  if (parsed.length === 0) {
    throw new BadRequestError(`${fieldName} cannot be empty`);
  }

  return parsed;
};

const parsePositiveInteger = (
  value: unknown,
  fallback: number,
  fieldName: string,
  max = MAX_LIMIT,
): number => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestError(`${fieldName} must be a positive integer`);
  }

  return Math.min(parsed, max);
};

class NotificationController {
  /**
   * Get current user's notifications.
   * GET /api/notifications
   */
  getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE, "page");
    const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT, "limit");

    const result = await notificationService.getUserNotifications(
      userId,
      page,
      limit,
    );

    sendSuccess(res, {
      items: result.notifications,
      pagination: result.pagination,
    });
  });

  /**
   * Get unread notification count.
   * GET /api/notifications/unread-count
   */
  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const count = await notificationService.getUnreadCount(userId);

    sendSuccess(res, { count });
  });

  /**
   * Mark a notification as read.
   * PUT /api/notifications/:id/read
   */
  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const notificationId = parseRequiredId(req.params.id, "Notification ID");

    const notification = await notificationService.markAsRead(
      notificationId,
      userId,
    );

    sendSuccess(res, notification, "Notification marked as read");
  });

  /**
   * Mark all current user's notifications as read.
   * PUT /api/notifications/read-all
   */
  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    await notificationService.markAllAsRead(userId);

    sendSuccess(res, undefined, "All notifications marked as read");
  });

  /**
   * Delete a notification.
   * DELETE /api/notifications/:id
   */
  deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const notificationId = parseRequiredId(req.params.id, "Notification ID");

    await notificationService.deleteNotification(notificationId, userId);

    sendSuccess(res, undefined, "Notification deleted successfully");
  });
}

export default new NotificationController();

import { Request, Response } from "express";
import notificationService from "../services/notification.service";
import asyncHandler from "../utils/async-handler";
import {
  parseQueryPositiveInt,
  parseRequiredParam,
  requireAuthUserId,
  sendSuccess,
} from "../utils/http";

class NotificationController {
  getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
    const result = await notificationService.getUserNotifications(
      requireAuthUserId(req),
      parseQueryPositiveInt(req.query.page, "page", { fallback: 1 }) as number,
      parseQueryPositiveInt(req.query.limit, "limit", {
        fallback: 10,
        max: 100,
      }) as number,
    );

    sendSuccess(res, {
      items: result.notifications,
      pagination: result.pagination,
    });
  });

  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const count = await notificationService.getUnreadCount(
      requireAuthUserId(req),
    );
    sendSuccess(res, { count });
  });

  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const notification = await notificationService.markAsRead(
      parseRequiredParam(req.params.id, "Notification ID"),
      requireAuthUserId(req),
    );
    sendSuccess(res, notification, "Notification marked as read");
  });

  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markAllAsRead(requireAuthUserId(req));
    sendSuccess(res, undefined, "All notifications marked as read");
  });

  deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    await notificationService.deleteNotification(
      parseRequiredParam(req.params.id, "Notification ID"),
      requireAuthUserId(req),
    );
    sendSuccess(res, undefined, "Notification deleted successfully");
  });
}

export default new NotificationController();

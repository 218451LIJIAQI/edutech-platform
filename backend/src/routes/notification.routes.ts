import { Router } from "express";
import { param, query } from "express-validator";

import notificationController from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

const notificationIdParam = param("id")
  .notEmpty()
  .withMessage("id is required")
  .bail()
  .isUUID()
  .withMessage("Invalid id");

const paginationValidation = [
  query("page")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("page must be >= 1"),

  query("limit")
    .optional({ values: "falsy" })
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be 1-100"),
];

/**
 * Notification routes.
 *
 * All notification routes require authentication.
 */

router.use(authenticate);

router.get(
  "/",
  validate(paginationValidation),
  notificationController.getMyNotifications,
);

router.get("/unread-count", notificationController.getUnreadCount);

router.put("/read-all", notificationController.markAllAsRead);

router.put(
  "/:id/read",
  validate(notificationIdParam),
  notificationController.markAsRead,
);

router.delete(
  "/:id",
  validate(notificationIdParam),
  notificationController.deleteNotification,
);

export default router;

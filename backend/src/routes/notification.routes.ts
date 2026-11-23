import { Router } from "express";
import notificationController from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { paginationQueryValidators, uuidParam } from "../validators/common.validator";

const router = Router();
const notificationIdParam = uuidParam("id");

router.use(authenticate);

router.get(
  "/",
  validate(paginationQueryValidators(100)),
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

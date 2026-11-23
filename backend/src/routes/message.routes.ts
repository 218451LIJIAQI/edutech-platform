import { Router } from "express";
import { body, query } from "express-validator";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { uuidParam } from "../validators/common.validator";
import {
  MAX_MESSAGE_LENGTH,
  MAX_MESSAGE_LIMIT,
} from "../services/message.service";
import {
  getContacts,
  getOrCreateThread,
  getMessages,
  getMessagesWithContact,
  sendMessage,
  sendMessageToContact,
  getUnreadCount,
  markMessagesAsRead,
  getContactUnreadCount,
} from "../controllers/message.controller";

const router = Router();

const contactIdParam = uuidParam("contactId", "contactId");
const threadIdParam = uuidParam("threadId", "threadId");

const contactIdBodyValidation = body("contactId")
  .notEmpty()
  .withMessage("contactId is required")
  .bail()
  .isUUID()
  .withMessage("Invalid contactId");

const messageListQueryValidation = [
  query("cursor")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("cursor must be a string")
    .bail()
    .isLength({ max: 200 })
    .withMessage("cursor too long"),
  query("limit")
    .optional({ values: "falsy" })
    .isInt({ min: 1, max: MAX_MESSAGE_LIMIT })
    .withMessage(`limit must be 1-${MAX_MESSAGE_LIMIT}`)
    .toInt(),
];

const messageBodyValidation = body("content")
  .isString()
  .withMessage("content must be a string")
  .bail()
  .trim()
  .notEmpty()
  .withMessage("content is required")
  .bail()
  .isLength({ min: 1, max: MAX_MESSAGE_LENGTH })
  .withMessage(
    `content must be between 1 and ${MAX_MESSAGE_LENGTH} characters`,
  );

router.use(authenticate);

router.get("/contacts", getContacts);
router.get("/unread-count", getUnreadCount);

router.get(
  "/contacts/:contactId/unread-count",
  validate(contactIdParam),
  getContactUnreadCount,
);

router.get(
  "/contacts/:contactId/messages",
  validate([contactIdParam, ...messageListQueryValidation]),
  getMessagesWithContact,
);

router.post(
  "/contacts/:contactId/messages",
  validate([contactIdParam, messageBodyValidation]),
  sendMessageToContact,
);

router.post("/threads", validate(contactIdBodyValidation), getOrCreateThread);

router.get(
  "/threads/:threadId/messages",
  validate([threadIdParam, ...messageListQueryValidation]),
  getMessages,
);

router.post(
  "/threads/:threadId/messages",
  validate([threadIdParam, messageBodyValidation]),
  sendMessage,
);

router.put(
  "/threads/:threadId/mark-as-read",
  validate(threadIdParam),
  markMessagesAsRead,
);

export default router;

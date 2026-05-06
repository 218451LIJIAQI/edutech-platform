import { Router } from "express";
import { body, param, query } from "express-validator";

import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

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

const uuidParam = (name: string) =>
  param(name)
    .notEmpty()
    .withMessage(`${name} is required`)
    .bail()
    .isUUID()
    .withMessage(`Invalid ${name}`);

const contactIdParam = uuidParam("contactId");
const threadIdParam = uuidParam("threadId");

const contactIdBodyValidation = body("contactId")
  .notEmpty()
  .withMessage("contactId is required")
  .bail()
  .isUUID()
  .withMessage("Invalid contactId");

const getMessagesValidation = [
  threadIdParam,

  query("cursor")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("cursor must be a string")
    .bail()
    .isLength({ max: 200 })
    .withMessage("cursor too long"),

  query("limit")
    .optional({ values: "falsy" })
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be 1-100"),
];

const sendMessageValidation = [
  threadIdParam,

  body("content")
    .trim()
    .notEmpty()
    .withMessage("content is required")
    .bail()
    .isLength({ min: 1, max: 5000 })
    .withMessage("content must be between 1 and 5000 characters"),
];

const sendContactMessageValidation = [
  contactIdParam,

  body("content")
    .trim()
    .notEmpty()
    .withMessage("content is required")
    .bail()
    .isLength({ min: 1, max: 5000 })
    .withMessage("content must be between 1 and 5000 characters"),
];

/**
 * Message routes.
 *
 * All message routes require authentication.
 */

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
  validate([contactIdParam, ...getMessagesValidation.slice(1)]),
  getMessagesWithContact,
);

router.post(
  "/contacts/:contactId/messages",
  validate(sendContactMessageValidation),
  sendMessageToContact,
);

router.post("/threads", validate(contactIdBodyValidation), getOrCreateThread);

router.get(
  "/threads/:threadId/messages",
  validate(getMessagesValidation),
  getMessages,
);

router.post(
  "/threads/:threadId/messages",
  validate(sendMessageValidation),
  sendMessage,
);

router.put(
  "/threads/:threadId/mark-as-read",
  validate(threadIdParam),
  markMessagesAsRead,
);

export default router;

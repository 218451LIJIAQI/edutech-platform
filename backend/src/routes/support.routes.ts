import { Router } from "express";
import { SupportTicketPriority, SupportTicketStatus } from "@prisma/client";
import { body, param, query } from "express-validator";

import supportController from "../controllers/support.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { validateUrlOrUploadPathForFolders } from "../utils/url-or-path";

const router = Router();

const ticketIdParam = param("id")
  .notEmpty()
  .withMessage("id is required")
  .bail()
  .isUUID()
  .withMessage("Invalid id");

const orderIdParam = param("orderId")
  .notEmpty()
  .withMessage("orderId is required")
  .bail()
  .isUUID()
  .withMessage("Invalid orderId");

const messageIdParam = param("messageId")
  .notEmpty()
  .withMessage("messageId is required")
  .bail()
  .isUUID()
  .withMessage("Invalid messageId");

const attachmentValidation = body("attachment")
  .optional({ values: "falsy" })
  .isString()
  .withMessage("attachment must be a string")
  .bail()
  .isLength({ max: 500 })
  .withMessage("attachment too long")
  .bail()
  .custom(
    validateUrlOrUploadPathForFolders(
      "Attachment must be an external URL or use the /uploads/support-attachments/ folder",
      ["support-attachments"],
    ),
  );

const paginationValidation = [
  query("page")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("page must be >= 1"),

  query("limit")
    .optional({ values: "falsy" })
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be 1-100"),

  query("status")
    .optional({ values: "falsy" })
    .isIn(Object.values(SupportTicketStatus))
    .withMessage("Invalid support ticket status"),
];

const createTicketValidation = [
  body("subject")
    .trim()
    .notEmpty()
    .withMessage("subject is required")
    .bail()
    .isLength({ max: 150 })
    .withMessage("subject too long"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("description is required")
    .bail()
    .isLength({ max: 2000 })
    .withMessage("description too long"),

  body("category")
    .trim()
    .notEmpty()
    .withMessage("category is required")
    .bail()
    .isLength({ max: 50 })
    .withMessage("category too long"),

  body("orderId")
    .optional({ values: "falsy" })
    .isUUID()
    .withMessage("Invalid orderId"),

  body("priority")
    .optional({ values: "falsy" })
    .isIn(Object.values(SupportTicketPriority))
    .withMessage("priority must be LOW, MEDIUM, HIGH, or URGENT"),

  attachmentValidation,
];

const addMessageValidation = [
  ticketIdParam,

  body("message")
    .trim()
    .notEmpty()
    .withMessage("message is required")
    .bail()
    .isLength({ max: 2000 })
    .withMessage("message too long"),

  attachmentValidation,
];

const closeTicketValidation = [
  ticketIdParam,

  body("resolution")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 2000 })
    .withMessage("resolution too long"),
];

/**
 * Support ticket routes.
 *
 * All support routes require authentication.
 * Users can create tickets, view their tickets, add messages, view attachments, and close tickets.
 */

router.use(authenticate);

router.post(
  "/",
  validate(createTicketValidation),
  supportController.createTicket,
);

router.get(
  "/",
  validate(paginationValidation),
  supportController.getUserTickets,
);

router.get("/stats", supportController.getStats);

router.get(
  "/messages/:messageId/attachment",
  validate(messageIdParam),
  supportController.getMessageAttachment,
);

router.get(
  "/order/:orderId",
  validate(orderIdParam),
  supportController.getTicketsByOrderId,
);

router.get("/:id", validate(ticketIdParam), supportController.getTicketById);

router.post(
  "/:id/messages",
  validate(addMessageValidation),
  supportController.addMessage,
);

router.post(
  "/:id/close",
  validate(closeTicketValidation),
  supportController.closeTicket,
);

export default router;

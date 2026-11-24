import { Router } from "express";
import { SupportTicketPriority, SupportTicketStatus } from "@prisma/client";
import { body, query } from "express-validator";
import supportController from "../controllers/support.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  paginationQueryValidators,
  supportAttachmentBodyField,
  uuidParam,
} from "../validators/common.validator";

const router = Router();

const ticketIdParam = uuidParam("id");
const orderIdParam = uuidParam("orderId");
const messageIdParam = uuidParam("messageId");
const attachmentValidation = supportAttachmentBodyField();

const listTicketsValidation = [
  ...paginationQueryValidators(100),
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
    .isLength({ max: 5000 })
    .withMessage("description too long"),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("category is required")
    .bail()
    .isLength({ max: 80 })
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
    .isLength({ max: 5000 })
    .withMessage("message too long"),
  attachmentValidation,
];

const closeTicketValidation = [
  ticketIdParam,
  body("resolution")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 3000 })
    .withMessage("resolution too long"),
];

router.use(authenticate);

router.post(
  "/",
  validate(createTicketValidation),
  supportController.createTicket,
);

router.get(
  "/",
  validate(listTicketsValidation),
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

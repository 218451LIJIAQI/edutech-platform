import { Router } from "express";
import { RefundMethod, UserRole } from "@prisma/client";
import { body, param } from "express-validator";

import ordersController from "../controllers/orders.controller";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

const orderIdParam = param("id")
  .notEmpty()
  .withMessage("id is required")
  .bail()
  .isUUID()
  .withMessage("Invalid order id");

const cancelOrderValidation = [
  orderIdParam,

  body("reason")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 500 })
    .withMessage("reason too long"),
];

const refundRequestValidation = [
  orderIdParam,

  body("amount")
    .notEmpty()
    .withMessage("amount is required")
    .bail()
    .isFloat({ gt: 0 })
    .withMessage("amount must be greater than 0"),

  body("reason")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 500 })
    .withMessage("reason too long"),

  body("reasonCategory")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 100 })
    .withMessage("reasonCategory too long"),

  body("refundMethod")
    .optional({ values: "falsy" })
    .trim()
    .isIn(Object.values(RefundMethod))
    .withMessage("Invalid refund method"),

  body("bankDetails")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 1000 })
    .withMessage("bankDetails too long"),

  body("notes")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 1000 })
    .withMessage("notes too long"),
];

/**
 * Order routes.
 *
 * All order routes are restricted to authenticated students.
 */
router.use(authenticate);
router.use(authorize(UserRole.STUDENT));

router.get("/", ordersController.getMyOrders);

// Must be before /:id to avoid route conflict.
router.get("/refunds/list", ordersController.getUserRefunds);

router.get("/:id", validate(orderIdParam), ordersController.getOrderById);

router.post(
  "/:id/cancel",
  validate(cancelOrderValidation),
  ordersController.cancelOrder,
);

router.post(
  "/:id/refund-request",
  validate(refundRequestValidation),
  ordersController.requestRefund,
);

router.get(
  "/:id/refunds",
  validate(orderIdParam),
  ordersController.getRefundsByOrderId,
);

router.get(
  "/:id/refund",
  validate(orderIdParam),
  ordersController.getRefundByOrderId,
);

export default router;

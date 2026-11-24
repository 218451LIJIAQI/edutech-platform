import { Router } from "express";
import { RefundMethod } from "@prisma/client";
import { body } from "express-validator";
import ordersController from "../controllers/orders.controller";
import { studentOnly } from "../middleware/teacher-access";
import { validate } from "../middleware/validate";
import { uuidParam } from "../validators/common.validator";

const router = Router();
const orderIdParam = uuidParam("id", "order id");
const ALLOWED_STUDENT_REFUND_METHODS = [
  RefundMethod.ORIGINAL_PAYMENT,
  RefundMethod.BANK_TRANSFER,
] as const;

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
    .isIn(ALLOWED_STUDENT_REFUND_METHODS)
    .withMessage(
      "Invalid refund method. Allowed values: ORIGINAL_PAYMENT, BANK_TRANSFER",
    ),
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

router.use(studentOnly);

router.get("/", ordersController.getMyOrders);
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

import { Router } from "express";
import {
  PayoutMethodType,
  PayoutRequestStatus,
  UserRole,
  WalletTransactionSource,
  WalletTransactionType,
} from "@prisma/client";
import { body, query } from "express-validator";
import walletController from "../controllers/wallet.controller";
import { authenticate, authorize } from "../middleware/auth";
import { ensureTeacherApproved } from "../middleware/teacher-access";
import { validate } from "../middleware/validate";
import {
  offsetPaginationQueryValidators,
  uuidParam,
} from "../validators/common.validator";

const router = Router();
const payoutMethodIdParam = uuidParam("id");
const paginationValidation = offsetPaginationQueryValidators(100);

const transactionQueryValidation = [
  ...paginationValidation,
  query("type")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("type must be a string")
    .bail()
    .trim()
    .toUpperCase()
    .isIn(Object.values(WalletTransactionType))
    .withMessage("Invalid wallet transaction type"),
  query("source")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("source must be a string")
    .bail()
    .trim()
    .toUpperCase()
    .isIn(Object.values(WalletTransactionSource))
    .withMessage("Invalid wallet transaction source"),
];

const payoutQueryValidation = [
  ...paginationValidation,
  query("status")
    .optional({ values: "falsy" })
    .isIn(Object.values(PayoutRequestStatus))
    .withMessage("Invalid payout request status"),
];

const addPayoutMethodValidation = [
  body("type")
    .notEmpty()
    .withMessage("type is required")
    .bail()
    .isIn(Object.values(PayoutMethodType))
    .withMessage("Invalid payout method type"),
  body("label")
    .isString()
    .withMessage("label must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("label is required")
    .bail()
    .isLength({ max: 100 })
    .withMessage("label too long"),
  body("details")
    .notEmpty()
    .withMessage("details is required")
    .bail()
    .isObject()
    .withMessage("details must be an object"),
  body("isDefault")
    .optional({ values: "undefined" })
    .isBoolean()
    .withMessage("isDefault must be a boolean"),
];

const updatePayoutMethodValidation = [
  payoutMethodIdParam,
  body()
    .custom(
      (value) =>
        Boolean(value) &&
        typeof value === "object" &&
        ("label" in value || "details" in value || "isDefault" in value),
    )
    .withMessage("At least one payout method field is required"),
  body("type")
    .not()
    .exists()
    .withMessage("Payout method type cannot be changed"),
  body("label")
    .optional({ values: "undefined" })
    .isString()
    .withMessage("label must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("label cannot be empty")
    .bail()
    .isLength({ max: 100 })
    .withMessage("label too long"),
  body("details")
    .optional({ values: "undefined" })
    .isObject()
    .withMessage("details must be an object"),
  body("isDefault")
    .optional({ values: "undefined" })
    .isBoolean()
    .withMessage("isDefault must be a boolean"),
];

const requestPayoutValidation = [
  body("amount")
    .notEmpty()
    .withMessage("amount is required")
    .bail()
    .isFloat({ gt: 0 })
    .withMessage("amount must be greater than 0"),
  body("methodId")
    .optional({ values: "falsy" })
    .isUUID()
    .withMessage("Invalid methodId"),
  body("note")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("note must be a string")
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage("note too long"),
];

router.use(authenticate);

router.get("/me", walletController.getMySummary);

router.get(
  "/me/transactions",
  validate(transactionQueryValidation),
  walletController.getMyTransactions,
);

router.use(authorize(UserRole.TEACHER), ensureTeacherApproved);

router.get("/me/payout-methods", walletController.listMyPayoutMethods);

router.post(
  "/me/payout-methods",
  validate(addPayoutMethodValidation),
  walletController.addPayoutMethod,
);

router.put(
  "/me/payout-methods/:id",
  validate(updatePayoutMethodValidation),
  walletController.updatePayoutMethod,
);

router.delete(
  "/me/payout-methods/:id",
  validate(payoutMethodIdParam),
  walletController.deletePayoutMethod,
);

router.post(
  "/me/payouts",
  validate(requestPayoutValidation),
  walletController.requestPayout,
);

router.get(
  "/me/payouts",
  validate(payoutQueryValidation),
  walletController.listMyPayouts,
);

export default router;

import { Router } from "express";
import { UserRole } from "@prisma/client";
import { body, param } from "express-validator";

import paymentController from "../controllers/payment.controller";
import { authenticate, authorize } from "../middleware/auth";
import { ensureTeacherApproved } from "../middleware/teacher-access";
import { validate } from "../middleware/validate";

const router = Router();

const uuidParam = (name: string, label: string) =>
  param(name)
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .isUUID()
    .withMessage(`Invalid ${label.toLowerCase()}`);

const paymentIdParam = uuidParam("id", "Payment ID");

const packageIdBodyValidation = body("packageId")
  .notEmpty()
  .withMessage("Package ID is required")
  .bail()
  .isUUID()
  .withMessage("Invalid package ID");

const paymentIdBodyValidation = body("paymentId")
  .notEmpty()
  .withMessage("Payment ID is required")
  .bail()
  .isUUID()
  .withMessage("Invalid payment ID");

const studentOnly = [authenticate, authorize(UserRole.STUDENT)];

const approvedTeacherOnly = [
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
];

const adminOnly = [authenticate, authorize(UserRole.ADMIN)];

/**
 * Payment routes.
 *
 * Students can create and confirm payments.
 * Approved teachers can view their earnings.
 * Admins can manage payment refunds.
 *
 * More specific routes are declared before generic /:id routes.
 */

// ================================
// STUDENT PAYMENT ROUTES
// ================================

router.post(
  "/create-intent",
  studentOnly,
  validate(packageIdBodyValidation),
  paymentController.createPaymentIntent,
);

router.post(
  "/cart/create-intent",
  studentOnly,
  paymentController.createCartPaymentIntent,
);

router.post(
  "/confirm",
  studentOnly,
  validate(paymentIdBodyValidation),
  paymentController.confirmPayment,
);

router.get("/my-payments", studentOnly, paymentController.getMyPayments);

// ================================
// TEACHER PAYMENT ROUTES
// ================================

router.get(
  "/teacher/earnings",
  approvedTeacherOnly,
  paymentController.getTeacherEarnings,
);

router.get(
  "/teacher/earnings-by-course",
  approvedTeacherOnly,
  paymentController.getTeacherEarningsByCourse,
);

// ================================
// ADMIN PAYMENT ROUTES
// ================================

router.post(
  "/:id/refund",
  adminOnly,
  validate(paymentIdParam),
  paymentController.requestRefund,
);

// ================================
// GENERIC PAYMENT DETAIL ROUTE
// ================================
// Keep this after specific paths such as /teacher/earnings.

router.get(
  "/:id",
  studentOnly,
  validate(paymentIdParam),
  paymentController.getPaymentById,
);

export default router;

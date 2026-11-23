import { Router } from "express";
import paymentController from "../controllers/payment.controller";
import {
  adminOnly,
  approvedTeacherOnly,
  studentOnly,
} from "../middleware/teacher-access";
import { validate } from "../middleware/validate";
import { uuidBodyField, uuidParam } from "../validators/common.validator";

const router = Router();
const paymentIdParam = uuidParam("id", "payment ID");

router.post(
  "/create-intent",
  studentOnly,
  validate(uuidBodyField("packageId", "Package ID")),
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
  validate(uuidBodyField("paymentId", "Payment ID")),
  paymentController.confirmPayment,
);

router.get("/my-payments", studentOnly, paymentController.getMyPayments);

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

router.post(
  "/:id/refund",
  adminOnly,
  validate(paymentIdParam),
  paymentController.requestRefund,
);

router.get(
  "/:id",
  studentOnly,
  validate(paymentIdParam),
  paymentController.getPaymentById,
);

export default router;

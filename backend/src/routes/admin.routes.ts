import { Router } from "express";
import { body } from "express-validator";
import adminController from "../controllers/admin.controller";
import refundAdminController from "../controllers/refund-admin.controller";
import supportAdminController from "../controllers/support-admin.controller";
import walletAdminController from "../controllers/wallet-admin.controller";
import adsController from "../controllers/ads.controller";
import financialReportController from "../controllers/financial-report.controller";
import { adminOnly } from "../middleware/teacher-access";
import { validate } from "../middleware/validate";
import {
  supportAttachmentBodyField,
  uuidParam,
} from "../validators/common.validator";

const router = Router();
const idParam = uuidParam("id");

const supportResponseValidation = [
  idParam,
  body("message")
    .trim()
    .notEmpty()
    .withMessage("message is required")
    .bail()
    .isLength({ max: 2000 })
    .withMessage("message too long"),
  supportAttachmentBodyField({ nullableOnly: true }),
];

router.use(adminOnly);

router.get("/stats", adminController.getPlatformStats);
router.get("/activities", adminController.getRecentActivities);

router.get("/financials", adminController.getFinancials);
router.get("/financials/commissions", adminController.getTeacherCommissions);
router.put(
  "/financials/commissions/:userId",
  validate(uuidParam("userId")),
  adminController.updateTeacherCommission,
);
router.get("/financials/settlements", adminController.getSettlements);
router.get("/financials/invoices", adminController.getInvoices);
router.get("/financials/analytics", adminController.getRevenueAnalytics);

router.get("/users", adminController.getAllUsers);
router.get("/users/audit-logs", adminController.getUserAuditLogs);
router.post("/users/batch/delete", adminController.batchDeleteUsers);
router.post("/users/batch/status", adminController.batchUpdateUserStatus);
router.get("/users/:id", validate(idParam), adminController.getUserById);
router.post("/users", adminController.createUser);
router.put("/users/:id", validate(idParam), adminController.updateUser);
router.put("/users/:id/status", validate(idParam), adminController.updateUserStatus);
router.put("/users/:id/password", validate(idParam), adminController.resetUserPassword);
router.put("/users/:id/lock", validate(idParam), adminController.lockUserAccount);
router.delete("/users/:id", validate(idParam), adminController.deleteUser);

router.get("/courses", adminController.getAllCourses);
router.put("/courses/:id/publish", validate(idParam), adminController.updateCourseStatus);
router.delete("/courses/:id", validate(idParam), adminController.deleteCourse);

router.get("/ads", adsController.getAllAds);
router.post("/ads", adsController.createAd);
router.put("/ads/:id", validate(idParam), adsController.updateAd);
router.post("/ads/:id/move", validate(idParam), adsController.moveAd);
router.delete("/ads/:id", validate(idParam), adsController.deleteAd);

router.get("/verifications", adminController.getAllVerifications);
router.put("/verifications/:id", validate(idParam), adminController.reviewVerification);

router.get("/reports", adminController.getAllReports);
router.put("/reports/:id", validate(idParam), adminController.updateReportStatus);

router.get("/refunds/stats", refundAdminController.getStats);
router.get("/refunds", refundAdminController.getAllRefunds);
router.get("/refunds/:id", validate(idParam), refundAdminController.getRefundById);
router.post("/refunds/:id/approve", validate(idParam), refundAdminController.approveRefund);
router.post("/refunds/:id/reject", validate(idParam), refundAdminController.rejectRefund);
router.post("/refunds/:id/processing", validate(idParam), refundAdminController.markAsProcessing);
router.post("/refunds/:id/complete", validate(idParam), refundAdminController.completeRefund);

router.get("/support/stats", supportAdminController.getStats);
router.get("/support", supportAdminController.getAllTickets);
router.get("/support/:id", validate(idParam), supportAdminController.getTicketById);
router.post("/support/:id/assign", validate(idParam), supportAdminController.assignTicket);
router.post(
  "/support/:id/response",
  validate(supportResponseValidation),
  supportAdminController.addResponse,
);
router.post("/support/:id/resolve", validate(idParam), supportAdminController.resolveTicket);
router.post("/support/:id/close", validate(idParam), supportAdminController.closeTicket);

router.get("/wallet/payouts", walletAdminController.listPayouts);
router.post("/wallet/payouts/:id/review", validate(idParam), walletAdminController.reviewPayout);

router.get("/financial-reports/summary", financialReportController.getSummary);
router.get(
  "/financial-reports/teacher-settlements",
  financialReportController.getTeacherSettlements,
);
router.get("/financial-reports/export", financialReportController.exportData);
router.get(
  "/financial-reports/auto-verification-stats",
  financialReportController.getAutoVerificationStats,
);

export default router;

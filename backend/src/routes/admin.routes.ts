import { Router } from "express";
import { UserRole } from "@prisma/client";
import { body, param } from "express-validator";

import adminController from "../controllers/admin.controller";
import refundAdminController from "../controllers/refund-admin.controller";
import supportAdminController from "../controllers/support-admin.controller";
import walletAdminController from "../controllers/wallet-admin.controller";
import adsController from "../controllers/ads.controller";

import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { validateUrlOrUploadPathForFolders } from "../utils/url-or-path";

const router = Router();

const uuidParam = (name = "id") =>
  param(name)
    .notEmpty()
    .withMessage(`${name} is required`)
    .bail()
    .isUUID()
    .withMessage(`Invalid ${name}`);

const supportResponseValidation = [
  uuidParam("id"),
  body("message")
    .trim()
    .notEmpty()
    .withMessage("message is required")
    .bail()
    .isLength({ max: 2000 })
    .withMessage("message too long"),

  body("attachment")
    .optional({ values: "null" })
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
    ),
];

/**
 * Admin routes.
 *
 * All routes require authentication and ADMIN role authorization.
 */
router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

// ================================
// PLATFORM STATISTICS & FINANCIALS
// ================================

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

// ================================
// USER MANAGEMENT
// ================================

router.get("/users", adminController.getAllUsers);

// Static user routes must be declared before /users/:id
router.get("/users/audit-logs", adminController.getUserAuditLogs);
router.post("/users/batch/delete", adminController.batchDeleteUsers);
router.post("/users/batch/status", adminController.batchUpdateUserStatus);

router.get(
  "/users/:id",
  validate(uuidParam("id")),
  adminController.getUserById,
);

router.post("/users", adminController.createUser);

router.put("/users/:id", validate(uuidParam("id")), adminController.updateUser);

router.put(
  "/users/:id/status",
  validate(uuidParam("id")),
  adminController.updateUserStatus,
);

router.put(
  "/users/:id/password",
  validate(uuidParam("id")),
  adminController.resetUserPassword,
);

router.put(
  "/users/:id/lock",
  validate(uuidParam("id")),
  adminController.lockUserAccount,
);

router.delete(
  "/users/:id",
  validate(uuidParam("id")),
  adminController.deleteUser,
);

// ================================
// COURSE MANAGEMENT
// ================================

router.get("/courses", adminController.getAllCourses);

router.put(
  "/courses/:id/publish",
  validate(uuidParam("id")),
  adminController.updateCourseStatus,
);

router.delete(
  "/courses/:id",
  validate(uuidParam("id")),
  adminController.deleteCourse,
);

// ================================
// ADVERTISING MANAGEMENT
// ================================

router.get("/ads", adsController.getAllAds);
router.post("/ads", adsController.createAd);

router.put("/ads/:id", validate(uuidParam("id")), adsController.updateAd);

router.post("/ads/:id/move", validate(uuidParam("id")), adsController.moveAd);

router.delete("/ads/:id", validate(uuidParam("id")), adsController.deleteAd);

// ================================
// VERIFICATION MANAGEMENT
// ================================

router.get("/verifications", adminController.getAllVerifications);

router.put(
  "/verifications/:id",
  validate(uuidParam("id")),
  adminController.reviewVerification,
);

// ================================
// REPORT MANAGEMENT
// ================================

router.get("/reports", adminController.getAllReports);

router.put(
  "/reports/:id",
  validate(uuidParam("id")),
  adminController.updateReportStatus,
);

// ================================
// REFUND MANAGEMENT
// ================================

router.get("/refunds/stats", refundAdminController.getStats);
router.get("/refunds", refundAdminController.getAllRefunds);

router.get(
  "/refunds/:id",
  validate(uuidParam("id")),
  refundAdminController.getRefundById,
);

router.post(
  "/refunds/:id/approve",
  validate(uuidParam("id")),
  refundAdminController.approveRefund,
);

router.post(
  "/refunds/:id/reject",
  validate(uuidParam("id")),
  refundAdminController.rejectRefund,
);

router.post(
  "/refunds/:id/processing",
  validate(uuidParam("id")),
  refundAdminController.markAsProcessing,
);

router.post(
  "/refunds/:id/complete",
  validate(uuidParam("id")),
  refundAdminController.completeRefund,
);

// ================================
// SUPPORT TICKET MANAGEMENT
// ================================

router.get("/support/stats", supportAdminController.getStats);
router.get("/support", supportAdminController.getAllTickets);

router.get(
  "/support/:id",
  validate(uuidParam("id")),
  supportAdminController.getTicketById,
);

router.post(
  "/support/:id/assign",
  validate(uuidParam("id")),
  supportAdminController.assignTicket,
);

router.post(
  "/support/:id/response",
  validate(supportResponseValidation),
  supportAdminController.addResponse,
);

router.post(
  "/support/:id/resolve",
  validate(uuidParam("id")),
  supportAdminController.resolveTicket,
);

router.post(
  "/support/:id/close",
  validate(uuidParam("id")),
  supportAdminController.closeTicket,
);

// ================================
// WALLET PAYOUT REVIEW
// ================================

router.get("/wallet/payouts", walletAdminController.listPayouts);

router.post(
  "/wallet/payouts/:id/review",
  validate(uuidParam("id")),
  walletAdminController.reviewPayout,
);

export default router;

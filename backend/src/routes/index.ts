import { Router } from "express";

import authRoutes from "./auth.routes";
import teacherRoutes from "./teacher.routes";
import courseRoutes from "./course.routes";
import paymentRoutes from "./payment.routes";
import enrollmentRoutes from "./enrollment.routes";
import reviewRoutes from "./review.routes";
import reportRoutes from "./report.routes";
import uploadRoutes from "./upload.routes";
import notificationRoutes from "./notification.routes";
import walletRoutes from "./wallet.routes";
import messageRoutes from "./message.routes";
import communityRoutes from "./community.routes";
import supportRoutes from "./support.routes";
import cartRoutes from "./cart.routes";
import ordersRoutes from "./orders.routes";
import adsRoutes from "./ads.routes";
import adminRoutes from "./admin.routes";

const router = Router();

/**
 * API routes.
 *
 * All routes are mounted under /api/v1 by the main application.
 */

// ================================
// PUBLIC / AUTHENTICATION
// ================================

router.use("/auth", authRoutes);
router.use("/ads", adsRoutes);

// ================================
// CORE PLATFORM FEATURES
// ================================

router.use("/teachers", teacherRoutes);
router.use("/courses", courseRoutes);
router.use("/enrollments", enrollmentRoutes);
router.use("/payments", paymentRoutes);
router.use("/orders", ordersRoutes);
router.use("/cart", cartRoutes);

// ================================
// USER INTERACTION FEATURES
// ================================

router.use("/reviews", reviewRoutes);
router.use("/reports", reportRoutes);
router.use("/notifications", notificationRoutes);
router.use("/messages", messageRoutes);
router.use("/community", communityRoutes);
router.use("/support", supportRoutes);

// ================================
// FILES & WALLET
// ================================

router.use("/upload", uploadRoutes);
router.use("/wallet", walletRoutes);

// ================================
// ADMIN
// ================================

router.use("/admin", adminRoutes);

export default router;

import { Router } from 'express';
import authRoutes from './auth.routes';
import teacherRoutes from './teacher.routes';
import courseRoutes from './course.routes';
import paymentRoutes from './payment.routes';
import enrollmentRoutes from './enrollment.routes';
import reviewRoutes from './review.routes';
import reportRoutes from './report.routes';
import uploadRoutes from './upload.routes';
import notificationRoutes from './notification.routes';
import adminRoutes from './admin.routes';
import walletRoutes from './wallet.routes';
import messageRoutes from './message.routes';
import communityRoutes from './community.routes';
import supportRoutes from './support.routes';
import cartRoutes from './cart.routes';
import ordersRoutes from './orders.routes';
import healthRoutes from './health.routes';

const router = Router();

/**
 * API Routes
 * All routes are prefixed with /api/v1
 */

// Health check routes (enhanced)
router.use('/health', healthRoutes);

// Mount routes
router.use('/auth', authRoutes);
router.use('/teachers', teacherRoutes);
router.use('/courses', courseRoutes);
router.use('/payments', paymentRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/reports', reportRoutes);
router.use('/upload', uploadRoutes);
router.use('/notifications', notificationRoutes);

// Wallet routes
router.use('/wallet', walletRoutes);

// Message routes
router.use('/messages', messageRoutes);

// Community routes
router.use('/community', communityRoutes);

// Support routes
router.use('/support', supportRoutes);

// Cart routes
router.use('/cart', cartRoutes);

// Orders routes
router.use('/orders', ordersRoutes);

router.use('/admin', adminRoutes);

export default router;

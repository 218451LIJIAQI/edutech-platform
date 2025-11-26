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

const router = Router();

/**
 * API Routes
 * All routes are prefixed with /api/v1
 */

// Health check
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Edutech API is running',
    timestamp: new Date(),
  });
});

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

// New routes
import cartRoutes from './cart.routes';
import ordersRoutes from './orders.routes';
import communityRoutes from './community.routes';
import supportRoutes from './support.routes';
import messageRoutes from './message.routes';
router.use('/cart', cartRoutes);
router.use('/orders', ordersRoutes);
router.use('/community', communityRoutes);
router.use('/support', supportRoutes);
router.use('/messages', messageRoutes);

router.use('/admin', adminRoutes);

export default router;


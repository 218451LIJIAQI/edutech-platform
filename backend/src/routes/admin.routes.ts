import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { param } from 'express-validator';
import adminController from '../controllers/admin.controller';
import refundAdminController from '../controllers/refund-admin.controller';
import supportAdminController from '../controllers/support-admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import walletAdminController from '../controllers/wallet-admin.controller';
import { validate } from '../middleware/validate';

const router = Router();

/**
 * Admin Routes
 * All routes require ADMIN role
 */

// Apply authentication and authorization to all routes
router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

// Platform Statistics
router.get('/stats', adminController.getPlatformStats);
router.get('/activities', adminController.getRecentActivities);
router.get('/financials', adminController.getFinancials);
router.get('/financials/commissions', adminController.getTeacherCommissions);
router.put(
  '/financials/commissions/:userId',
  validate([param('userId').notEmpty().withMessage('userId is required').isUUID().withMessage('Invalid userId')]),
  adminController.updateTeacherCommission
);
router.get('/financials/settlements', adminController.getSettlements);
router.get('/financials/invoices', adminController.getInvoices);
router.get('/financials/analytics', adminController.getRevenueAnalytics);

// User Management
router.get('/users', adminController.getAllUsers);
router.get(
  '/users/:id',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  adminController.getUserById
);
router.post('/users', adminController.createUser);
router.put(
  '/users/:id',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  adminController.updateUser
);
router.put(
  '/users/:id/status',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  adminController.updateUserStatus
);
router.put(
  '/users/:id/password',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  adminController.resetUserPassword
);
router.put(
  '/users/:id/lock',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  adminController.lockUserAccount
);
router.delete(
  '/users/:id',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  adminController.deleteUser
);
router.post('/users/batch/delete', adminController.batchDeleteUsers);
router.post('/users/batch/status', adminController.batchUpdateUserStatus);
router.get('/users/audit-logs', adminController.getUserAuditLogs);

// Course Management
router.get('/courses', adminController.getAllCourses);
router.put(
  '/courses/:id/publish',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  adminController.updateCourseStatus
);
router.delete(
  '/courses/:id',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  adminController.deleteCourse
);

// Verification Management
router.get('/verifications', adminController.getAllVerifications);
router.put(
  '/verifications/:id',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  adminController.reviewVerification
);

// Report Management
router.get('/reports', adminController.getAllReports);
router.put(
  '/reports/:id',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  adminController.updateReportStatus
);

// Refund Management
router.get('/refunds/stats', refundAdminController.getStats);
router.get('/refunds', refundAdminController.getAllRefunds);
router.get(
  '/refunds/:id',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  refundAdminController.getRefundById
);
router.post(
  '/refunds/:id/approve',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  refundAdminController.approveRefund
);
router.post(
  '/refunds/:id/reject',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  refundAdminController.rejectRefund
);
router.post(
  '/refunds/:id/processing',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  refundAdminController.markAsProcessing
);
router.post(
  '/refunds/:id/complete',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  refundAdminController.completeRefund
);

// Support Ticket Management
router.get('/support/stats', supportAdminController.getStats);
router.get('/support', supportAdminController.getAllTickets);
router.get(
  '/support/:id',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  supportAdminController.getTicketById
);
router.post(
  '/support/:id/assign',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  supportAdminController.assignTicket
);
router.post(
  '/support/:id/response',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  supportAdminController.addResponse
);
router.post(
  '/support/:id/resolve',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  supportAdminController.resolveTicket
);
router.post(
  '/support/:id/close',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  supportAdminController.closeTicket
);

// Wallet payouts review
router.get('/wallet/payouts', walletAdminController.listPayouts);
router.post(
  '/wallet/payouts/:id/review',
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  walletAdminController.reviewPayout
);

export default router;

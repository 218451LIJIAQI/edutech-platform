import { Router } from 'express';
import { UserRole } from '@prisma/client';
import adminController from '../controllers/admin.controller';
import refundAdminController from '../controllers/refund-admin.controller';
import supportAdminController from '../controllers/support-admin.controller';
import { authenticate, authorize } from '../middleware/auth';

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
router.put('/financials/commissions/:userId', adminController.updateTeacherCommission);
router.get('/financials/settlements', adminController.getSettlements);
router.get('/financials/invoices', adminController.getInvoices);
router.get('/financials/analytics', adminController.getRevenueAnalytics);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.put('/users/:id/status', adminController.updateUserStatus);
router.put('/users/:id/password', adminController.resetUserPassword);
router.put('/users/:id/lock', adminController.lockUserAccount);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/batch/delete', adminController.batchDeleteUsers);
router.post('/users/batch/status', adminController.batchUpdateUserStatus);
router.get('/users/audit-logs', adminController.getUserAuditLogs);

// Course Management
router.get('/courses', adminController.getAllCourses);
router.put('/courses/:id/publish', adminController.updateCourseStatus);
router.delete('/courses/:id', adminController.deleteCourse);

// Verification Management
router.get('/verifications', adminController.getAllVerifications);
router.put('/verifications/:id', adminController.reviewVerification);

// Report Management
router.get('/reports', adminController.getAllReports);
router.put('/reports/:id', adminController.updateReportStatus);

// Refund Management
router.get('/refunds/stats', refundAdminController.getStats);
router.get('/refunds', refundAdminController.getAllRefunds);
router.get('/refunds/:id', refundAdminController.getRefundById);
router.post('/refunds/:id/approve', refundAdminController.approveRefund);
router.post('/refunds/:id/reject', refundAdminController.rejectRefund);
router.post('/refunds/:id/processing', refundAdminController.markAsProcessing);
router.post('/refunds/:id/complete', refundAdminController.completeRefund);

// Support Ticket Management
router.get('/support/stats', supportAdminController.getStats);
router.get('/support', supportAdminController.getAllTickets);
router.get('/support/:id', supportAdminController.getTicketById);
router.post('/support/:id/assign', supportAdminController.assignTicket);
router.post('/support/:id/response', supportAdminController.addResponse);
router.post('/support/:id/resolve', supportAdminController.resolveTicket);
router.post('/support/:id/close', supportAdminController.closeTicket);

export default router;


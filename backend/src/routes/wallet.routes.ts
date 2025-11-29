import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import walletController from '../controllers/wallet.controller';
import { validate } from '../middleware/validate';
import { param } from 'express-validator';

const router = Router();

// Teacher & Admin (own wallet)
router.use(authenticate);

// Summary & transactions
router.get('/me', authorize(UserRole.TEACHER), walletController.getMySummary);
router.get('/me/transactions', authorize(UserRole.TEACHER), walletController.getMyTransactions);

// Payout methods
router.get('/me/payout-methods', authorize(UserRole.TEACHER), walletController.listMyPayoutMethods);
router.post('/me/payout-methods', authorize(UserRole.TEACHER), walletController.addPayoutMethod);
router.put(
  '/me/payout-methods/:id',
  authorize(UserRole.TEACHER),
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  walletController.updatePayoutMethod
);
router.delete(
  '/me/payout-methods/:id',
  authorize(UserRole.TEACHER),
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  walletController.deletePayoutMethod
);

// Payout requests
router.post('/me/payouts', authorize(UserRole.TEACHER), walletController.requestPayout);
router.get('/me/payouts', authorize(UserRole.TEACHER), walletController.listMyPayouts);

export default router;

import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import cartController from '../controllers/cart.controller';

const router = Router();

// Get my cart
router.get(
  '/',
  authenticate,
  authorize(UserRole.STUDENT),
  cartController.getCart
);

// Add item
router.post(
  '/items',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([
    body('packageId').notEmpty().isUUID().withMessage('Invalid packageId'),
  ]),
  cartController.addItem
);

// Remove item
router.delete(
  '/items/:packageId',
  authenticate,
  authorize(UserRole.STUDENT),
  validate([param('packageId').isUUID().withMessage('Invalid packageId')]),
  cartController.removeItem
);

// Clear cart
router.delete(
  '/clear',
  authenticate,
  authorize(UserRole.STUDENT),
  cartController.clearCart
);

export default router;


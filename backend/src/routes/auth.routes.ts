import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';
import asyncHandler from '../utils/asyncHandler';
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  updateProfileValidation,
  changePasswordValidation,
} from '../validators/auth.validator';

const router = Router();

/**
 * Authentication Routes
 */

// Public routes
router.post(
  '/register',
  authLimiter,
  validate(registerValidation),
  asyncHandler(authController.register)
);

router.post(
  '/login',
  authLimiter,
  validate(loginValidation),
  asyncHandler(authController.login)
);

router.post(
  '/refresh',
  validate(refreshTokenValidation),
  asyncHandler(authController.refreshToken)
);

// Protected routes
router.get('/profile', authenticate, asyncHandler(authController.getProfile));

router.put(
  '/profile',
  authenticate,
  validate(updateProfileValidation),
  asyncHandler(authController.updateProfile)
);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordValidation),
  asyncHandler(authController.changePassword)
);

router.post('/logout', authenticate, asyncHandler(authController.logout));

// Danger Zone: delete current account
router.delete('/account', authenticate, asyncHandler(authController.deleteAccount));

export default router;

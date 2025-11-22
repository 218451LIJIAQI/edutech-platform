import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';
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
  authController.register
);

router.post(
  '/login',
  authLimiter,
  validate(loginValidation),
  authController.login
);

router.post(
  '/refresh',
  validate(refreshTokenValidation),
  authController.refreshToken
);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);

router.put(
  '/profile',
  authenticate,
  validate(updateProfileValidation),
  authController.updateProfile
);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordValidation),
  authController.changePassword
);

router.post('/logout', authenticate, authController.logout);

export default router;


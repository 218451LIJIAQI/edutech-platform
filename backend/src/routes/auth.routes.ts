import { Router } from "express";

import authController from "../controllers/auth.controller";
import { authenticate, optionalAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { authLimiter } from "../middleware/rate-limiter";

import {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  verifyPasswordResetCodeValidation,
  resetPasswordValidation,
  refreshTokenValidation,
  updateProfileValidation,
  changePasswordValidation,
} from "../validators/auth.validator";

const router = Router();

/**
 * Authentication routes.
 *
 * Public routes handle registration, login, password reset, and token refresh.
 * Protected routes require a valid access token.
 */

// ================================
// PUBLIC AUTH ROUTES
// ================================

router.post(
  "/register",
  authLimiter,
  validate(registerValidation),
  authController.register,
);

router.post(
  "/login",
  authLimiter,
  validate(loginValidation),
  authController.login,
);

router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordValidation),
  authController.forgotPassword,
);

router.post(
  "/verify-reset-code",
  authLimiter,
  validate(verifyPasswordResetCodeValidation),
  authController.verifyPasswordResetCode,
);

router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordValidation),
  authController.resetPassword,
);

router.post(
  "/refresh",
  authLimiter,
  validate(refreshTokenValidation),
  authController.refreshToken,
);

// ================================
// PROTECTED AUTH ROUTES
// ================================

router.get("/profile", authenticate, authController.getProfile);

router.put(
  "/profile",
  authenticate,
  validate(updateProfileValidation),
  authController.updateProfile,
);

router.post(
  "/change-password",
  authenticate,
  authLimiter,
  validate(changePasswordValidation),
  authController.changePassword,
);

router.post("/logout", optionalAuth, authController.logout);

router.delete(
  "/account",
  authenticate,
  authLimiter,
  authController.deleteAccount,
);

export default router;

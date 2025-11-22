import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import authService from '../services/auth.service';
import asyncHandler from '../utils/asyncHandler';

/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */
class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, role } = req.body;

    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      role: role || UserRole.STUDENT,
    });

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: result,
    });
  });

  /**
   * Login user
   * POST /api/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: result,
    });
  });

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    const tokens = await authService.refreshToken(refreshToken);

    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: tokens,
    });
  });

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const user = await authService.getProfile(userId);

    res.status(200).json({
      status: 'success',
      data: user,
    });
  });

  /**
   * Update current user profile
   * PUT /api/auth/profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { firstName, lastName, avatar } = req.body;

    const user = await authService.updateProfile(userId, {
      firstName,
      lastName,
      avatar,
    });

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: user,
    });
  });

  /**
   * Change password
   * POST /api/auth/change-password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    const result = await authService.changePassword(
      userId,
      currentPassword,
      newPassword
    );

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  });

  /**
   * Logout user (client-side token removal)
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (_req: Request, res: Response) => {
    // In a JWT-based auth system, logout is typically handled client-side
    // by removing the tokens from storage
    // This endpoint exists for consistency and can be used for logging/analytics

    res.status(200).json({
      status: 'success',
      message: 'Logout successful',
    });
  });
}

export default new AuthController();


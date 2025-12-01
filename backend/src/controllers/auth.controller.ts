import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import authService from '../services/auth.service';
import asyncHandler from '../utils/asyncHandler';
import { AuthenticationError } from '../utils/errors';
import { tokenBlacklistService } from '../services/tokenBlacklist.service';

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
    const { email, password, firstName, lastName, role } = req.body as {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role?: UserRole;
    };

    // Allow STUDENT or TEACHER role during registration
    // TEACHER accounts will require admin verification (handled via TeacherProfile status)
    // ADMIN role is NOT allowed during self-registration for security
    const allowedRoles: UserRole[] = [UserRole.STUDENT, UserRole.TEACHER];
    const selectedRole = role && allowedRoles.includes(role) ? role : UserRole.STUDENT;

    const result = await authService.register({
      email: email.trim().toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: selectedRole,
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
    const { email, password } = req.body as {
      email: string;
      password: string;
    };

    const result = await authService.login({
      email: email.trim().toLowerCase(),
      password,
    });

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
    const { refreshToken: refreshTokenValue } = req.body;

    const tokens = await authService.refreshToken(refreshTokenValue);

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
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    const userId = req.user.id;

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
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    const userId = req.user.id;
    const { firstName, lastName, avatar } = req.body as {
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };

    const user = await authService.updateProfile(userId, {
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
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
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

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
   * Logout user with token blacklisting
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      // Add token to blacklist
      await tokenBlacklistService.blacklist(token);
    }

    res.status(200).json({
      status: 'success',
      message: 'Logout successful',
    });
  });

  /**
   * Delete current user's account
   * DELETE /api/auth/account
   */
  deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    const userId = req.user.id;
    await authService.deleteAccount(userId);
    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully',
    });
  });
}

export default new AuthController();

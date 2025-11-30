/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Auth Service Unit Tests
 * 
 * These tests verify the authentication service functionality.
 * Note: These are example tests - in a real scenario, you would mock
 * the database and external dependencies.
 */

// Mock Prisma client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  teacherProfile: {
    create: jest.fn(),
  },
};

jest.mock('../../config/database', () => mockPrisma);

// Mock bcrypt
const mockBcrypt = {
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
};

jest.mock('bcrypt', () => mockBcrypt);

// Mock jsonwebtoken - must mock before importing auth.service
const mockJwtSign = jest.fn().mockReturnValue('mock_token');
jest.mock('jsonwebtoken', () => ({
  sign: mockJwtSign,
  verify: jest.fn(),
}));

// Mock token blacklist service
jest.mock('../../services/tokenBlacklist.service', () => ({
  tokenBlacklistService: {
    isBlacklisted: jest.fn().mockResolvedValue(false),
    isUserTokenInvalid: jest.fn().mockResolvedValue(false),
  },
}));

// Import after mocks
import authService from '../../services/auth.service';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('register', () => {
    it('should create a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT',
        createdAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await authService.register({
        email: 'test@example.com',
        password: 'securePassword123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT' as any,
      });

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      });

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'securePassword123',
          firstName: 'John',
          lastName: 'Doe',
          role: 'STUDENT' as any,
        })
      ).rejects.toThrow('User with this email already exists');
    });

    it('should throw error if password is too short', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'short',
          firstName: 'John',
          lastName: 'Doe',
          role: 'STUDENT' as any,
        })
      ).rejects.toThrow('Password must be at least 8 characters long');
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT',
        isActive: true,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        loginCount: 0,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'correctPassword',
      });

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      // Verify tokens object has the expected structure
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should throw error with incorrect password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password',
        isActive: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrongPassword',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error if user is inactive', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password',
        isActive: false,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password',
        })
      ).rejects.toThrow('Your account has been deactivated');
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password',
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'old_hashed_password',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        password: 'new_hashed_password',
      });

      const result = await authService.changePassword(
        'user-123',
        'oldPassword',
        'newSecurePassword'
      );

      expect(result.message).toBe('Password changed successfully');
    });

    it('should throw error if current password is incorrect', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.changePassword('user-123', 'wrongPassword', 'newPassword')
      ).rejects.toThrow('Current password is incorrect');
    });
  });
});

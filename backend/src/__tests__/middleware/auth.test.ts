/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';

/**
 * Auth Middleware Unit Tests
 */

// Mock dependencies
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

jest.mock('../../config/database', () => mockPrisma);

const mockJwt = {
  verify: jest.fn(),
  TokenExpiredError: class TokenExpiredError extends Error {
    constructor() {
      super('Token expired');
      this.name = 'TokenExpiredError';
    }
  },
  JsonWebTokenError: class JsonWebTokenError extends Error {
    constructor() {
      super('Invalid token');
      this.name = 'JsonWebTokenError';
    }
  },
};

jest.mock('jsonwebtoken', () => mockJwt);

jest.mock('../../config/env', () => ({
  JWT_SECRET: 'test-secret',
}));

// Mock token blacklist service
jest.mock('../../services/tokenBlacklist.service', () => ({
  tokenBlacklistService: {
    isBlacklisted: jest.fn().mockResolvedValue(false),
    isUserTokenInvalid: jest.fn().mockResolvedValue(false),
  },
}));

// Mock sentry
jest.mock('../../config/sentry', () => ({
  setUser: jest.fn(),
  clearUser: jest.fn(),
}));

import { authenticate, authorize, optionalAuth } from '../../middleware/auth';
import { UserRole } from '@prisma/client';

// Extended request type for tests
interface MockRequest extends Partial<Request> {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
  };
}

describe('Auth Middleware', () => {
  let mockRequest: MockRequest;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should call next with error if no token provided', async () => {
      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0] as Error;
      expect(error.message).toBe('No token provided');
    });

    it('should authenticate successfully with valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT',
        isActive: true,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid_token',
      };

      mockJwt.verify.mockReturnValue({
        id: 'user-123',
        email: 'test@example.com',
        role: 'STUDENT',
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe('user-123');
    });

    it('should reject inactive user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT',
        isActive: false,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid_token',
      };

      mockJwt.verify.mockReturnValue({
        id: 'user-123',
        email: 'test@example.com',
        role: 'STUDENT',
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0] as Error;
      expect(error.message).toBe('User account is inactive');
    });
  });

  describe('authorize', () => {
    it('should allow access for correct role', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        firstName: 'Admin',
        lastName: 'User',
      };

      const middleware = authorize('ADMIN' as any);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should deny access for incorrect role', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'student@example.com',
        role: UserRole.STUDENT,
        firstName: 'Student',
        lastName: 'User',
      };

      const middleware = authorize('ADMIN' as any);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0] as Error;
      expect(error.message).toContain('Access denied');
    });

    it('should require authentication if no user', () => {
      mockRequest.user = undefined;

      const middleware = authorize('ADMIN' as any);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0] as Error;
      expect(error.message).toBe('Authentication required');
    });
  });

  describe('optionalAuth', () => {
    it('should attach user if valid token provided', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'STUDENT',
        isActive: true,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid_token',
      };

      mockJwt.verify.mockReturnValue({
        id: 'user-123',
        email: 'test@example.com',
        role: 'STUDENT',
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeDefined();
    });

    it('should continue without user if no token', async () => {
      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeUndefined();
    });

    it('should continue without user if token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid_token',
      };

      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeUndefined();
    });
  });
});

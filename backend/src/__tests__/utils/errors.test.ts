import { describe, it, expect } from '@jest/globals';
import {
  AppError,
  ValidationError,
  BadRequestError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  InternalServerError,
} from '../../utils/errors';

/**
 * Custom Error Classes Unit Tests
 */

describe('Custom Error Classes', () => {
  describe('AppError', () => {
    it('should create error with message and status code', () => {
      const error = new AppError('Test error', 500);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('should be instance of Error', () => {
      const error = new AppError('Test error', 500);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('ValidationError', () => {
    it('should have status code 400', () => {
      const error = new ValidationError('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Validation failed');
      expect(error.name).toBe('ValidationError');
    });

    it('should use default message', () => {
      const error = new ValidationError();
      expect(error.message).toBe('Validation failed');
    });
  });

  describe('BadRequestError', () => {
    it('should have status code 400', () => {
      const error = new BadRequestError('Bad request');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
    });

    it('should use default message', () => {
      const error = new BadRequestError();
      expect(error.message).toBe('Bad request');
    });
  });

  describe('AuthenticationError', () => {
    it('should have status code 401', () => {
      const error = new AuthenticationError('Not authenticated');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Not authenticated');
    });

    it('should use default message', () => {
      const error = new AuthenticationError();
      expect(error.message).toBe('Authentication failed');
    });
  });

  describe('AuthorizationError', () => {
    it('should have status code 403', () => {
      const error = new AuthorizationError('No permission');
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('No permission');
    });

    it('should use default message', () => {
      const error = new AuthorizationError();
      expect(error.message).toBe('You do not have permission to perform this action');
    });
  });

  describe('NotFoundError', () => {
    it('should have status code 404', () => {
      const error = new NotFoundError('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
    });

    it('should use default message', () => {
      const error = new NotFoundError();
      expect(error.message).toBe('Resource not found');
    });
  });

  describe('ConflictError', () => {
    it('should have status code 409', () => {
      const error = new ConflictError('Already exists');
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Already exists');
    });

    it('should use default message', () => {
      const error = new ConflictError();
      expect(error.message).toBe('Resource already exists');
    });
  });

  describe('UnprocessableEntityError', () => {
    it('should have status code 422', () => {
      const error = new UnprocessableEntityError('Cannot process');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe('Cannot process');
    });

    it('should use default message', () => {
      const error = new UnprocessableEntityError();
      expect(error.message).toBe('Unable to process the request');
    });
  });

  describe('InternalServerError', () => {
    it('should have status code 500', () => {
      const error = new InternalServerError('Server error');
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Server error');
    });

    it('should use default message', () => {
      const error = new InternalServerError();
      expect(error.message).toBe('Internal server error');
    });
  });

  describe('Error inheritance', () => {
    it('all errors should be instances of AppError', () => {
      expect(new ValidationError()).toBeInstanceOf(AppError);
      expect(new BadRequestError()).toBeInstanceOf(AppError);
      expect(new AuthenticationError()).toBeInstanceOf(AppError);
      expect(new AuthorizationError()).toBeInstanceOf(AppError);
      expect(new NotFoundError()).toBeInstanceOf(AppError);
      expect(new ConflictError()).toBeInstanceOf(AppError);
      expect(new UnprocessableEntityError()).toBeInstanceOf(AppError);
      expect(new InternalServerError()).toBeInstanceOf(AppError);
    });

    it('all errors should be operational', () => {
      expect(new ValidationError().isOperational).toBe(true);
      expect(new AuthenticationError().isOperational).toBe(true);
      expect(new NotFoundError().isOperational).toBe(true);
    });
  });
});

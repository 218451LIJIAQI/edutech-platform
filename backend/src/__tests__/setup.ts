/**
 * Jest Test Setup
 * 
 * This file runs before all tests and sets up the test environment.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_ENABLED = 'false';
process.env.QUEUE_ENABLED = 'false';

// Increase timeout for async operations
jest.setTimeout(10000);

// Global setup
beforeAll(() => {
  // Any global setup can go here
});

// Global teardown
afterAll(() => {
  // Any global cleanup can go here
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

export {};

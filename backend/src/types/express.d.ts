import { UserRole } from '@prisma/client';

/**
 * Extend Express Request type to include authenticated user
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        firstName: string;
        lastName: string;
      };
    }
  }
}

// This export ensures the file is treated as a module
export {};


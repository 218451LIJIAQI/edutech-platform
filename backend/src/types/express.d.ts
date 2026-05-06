import type { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
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

export {};

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

// Singleton pattern for Prisma Client to avoid multiple instances across hot reloads in dev
// and to prevent duplicate event listeners.

declare global {
  // Reuse Prisma client and a one-time hook flag in dev to avoid multiple instances and repeated logs
  // eslint-disable-next-line no-var
  var __PRISMA__: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __PRISMA_BEFORE_EXIT_HOOK__: boolean | undefined;
}

const isProduction = process.env.NODE_ENV === 'production';

const prismaClient = globalThis.__PRISMA__ ??
  new PrismaClient({
    log: isProduction ? ['error'] : ['query', 'warn', 'error'],
  });

if (!isProduction) {
  globalThis.__PRISMA__ = prismaClient;
}

// Graceful shutdown - ensure we only register this once
if (!globalThis.__PRISMA_BEFORE_EXIT_HOOK__) {
  const disconnectHandler = async () => {
    try {
      await prismaClient.$disconnect();
      logger.info('Database connection closed gracefully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error disconnecting Prisma', { error: err.message, stack: err.stack });
    }
  };

  process.on('beforeExit', disconnectHandler);
  process.on('SIGINT', disconnectHandler);
  process.on('SIGTERM', disconnectHandler);

  globalThis.__PRISMA_BEFORE_EXIT_HOOK__ = true;
}

export default prismaClient;
export type { PrismaClient };

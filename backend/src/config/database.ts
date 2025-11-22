import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

// Singleton pattern for Prisma Client to avoid multiple instances
declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClient = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prismaClient;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prismaClient.$disconnect();
  logger.info('Database connection closed');
});

export default prismaClient;


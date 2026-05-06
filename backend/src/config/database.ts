import { PrismaClient } from "@prisma/client";
import config from "./env";
import logger from "../utils/logger";

const isProduction = config.IS_PROD;

const globalForPrisma = globalThis as typeof globalThis & {
  __PRISMA_CLIENT__?: PrismaClient;
  __PRISMA_SHUTDOWN_HOOK_REGISTERED__?: boolean;
};

const prismaClient =
  globalForPrisma.__PRISMA_CLIENT__ ??
  new PrismaClient({
    log: isProduction ? ["error"] : ["query", "warn", "error"],
  });

if (!isProduction) {
  globalForPrisma.__PRISMA_CLIENT__ = prismaClient;
}

let isShuttingDown = false;

export async function disconnectPrisma(signal?: string) {
  if (isShuttingDown) return;

  isShuttingDown = true;

  try {
    await prismaClient.$disconnect();
    logger.info(
      signal
        ? `Database connection closed gracefully after ${signal}`
        : "Database connection closed gracefully",
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    logger.error("Error disconnecting Prisma Client", {
      error: err.message,
      stack: err.stack,
    });

    process.exitCode = 1;
  }
}

if (!globalForPrisma.__PRISMA_SHUTDOWN_HOOK_REGISTERED__) {
  process.once("beforeExit", async () => {
    await disconnectPrisma();
  });

  globalForPrisma.__PRISMA_SHUTDOWN_HOOK_REGISTERED__ = true;
}

export default prismaClient;

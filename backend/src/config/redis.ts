import Redis from 'ioredis';
import logger from '../utils/logger';

/**
 * Redis Configuration
 * Provides a singleton Redis client for caching and session management
 * Redis is OPTIONAL - application works without it
 */

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

// Singleton pattern for Redis client
declare global {
  // eslint-disable-next-line no-var
  var __REDIS__: Redis | null;
}

let redisClient: Redis | null = null;
let redisAvailable = false;

/**
 * Initialize Redis connection
 */
export const initRedis = (): Redis | null => {
  if (!REDIS_ENABLED) {
    logger.info('ℹ️  Redis disabled - caching/queue features unavailable (set REDIS_ENABLED=true to enable)');
    return null;
  }

  if (globalThis.__REDIS__) {
    return globalThis.__REDIS__;
  }

  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        // Only retry 3 times, then give up
        if (times > 3) {
          logger.warn('Redis unavailable after 3 retries - disabling Redis features');
          redisAvailable = false;
          return null; // Stop retrying
        }
        return Math.min(times * 100, 1000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redisClient.on('connect', () => {
      redisAvailable = true;
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('error', () => {
      // Suppress repeated error logs
      if (redisAvailable) {
        logger.warn('Redis connection error - features disabled');
        redisAvailable = false;
      }
    });

    redisClient.on('close', () => {
      if (redisAvailable) {
        logger.warn('Redis connection closed');
        redisAvailable = false;
      }
    });

    // Try to connect but don't fail if unavailable
    redisClient.connect().catch(() => {
      logger.warn('⚠️  Redis not available - running without caching (start Redis to enable)');
      redisAvailable = false;
    });

    if (process.env.NODE_ENV !== 'production') {
      globalThis.__REDIS__ = redisClient;
    }

    return redisClient;
  } catch (_error) {
    logger.warn('Redis initialization failed - running without caching');
    return null;
  }
};

/**
 * Get Redis client instance
 */
export const getRedis = (): Redis | null => {
  return redisClient || globalThis.__REDIS__ || null;
};

/**
 * Close Redis connection gracefully
 */
export const closeRedis = async (): Promise<void> => {
  const client = getRedis();
  if (client) {
    try {
      await client.quit();
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
};

/**
 * Check if Redis is available and connected
 */
export const isRedisAvailable = (): boolean => {
  return redisAvailable && redisClient?.status === 'ready';
};

/**
 * Check if Redis is enabled in config
 */
export const isRedisEnabled = (): boolean => {
  return REDIS_ENABLED;
};

export default {
  initRedis,
  getRedis,
  closeRedis,
  isRedisAvailable,
};

import { getRedis, isRedisAvailable } from '../config/redis';
import logger from '../utils/logger';

/**
 * Cache Service
 * Provides caching functionality using Redis with graceful fallback
 */

// Default TTL values (in seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
} as const;

// Cache key prefixes for organization
export const CACHE_PREFIX = {
  USER: 'user:',
  COURSE: 'course:',
  COURSES_LIST: 'courses:list:',
  TEACHER: 'teacher:',
  SESSION: 'session:',
  TOKEN_BLACKLIST: 'token:blacklist:',
  RATE_LIMIT: 'ratelimit:',
} as const;

class CacheService {
  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!isRedisAvailable()) {
      return null;
    }

    try {
      const redis = getRedis();
      if (!redis) return null;

      const value = await redis.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: unknown, ttlSeconds: number = CACHE_TTL.MEDIUM): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const redis = getRedis();
      if (!redis) return false;

      const serialized = JSON.stringify(value);
      await redis.setex(key, ttlSeconds, serialized);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const redis = getRedis();
      if (!redis) return false;

      await redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const redis = getRedis();
      if (!redis) return false;

      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const redis = getRedis();
      if (!redis) return false;

      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key (in seconds)
   */
  async ttl(key: string): Promise<number> {
    if (!isRedisAvailable()) {
      return -2;
    }

    try {
      const redis = getRedis();
      if (!redis) return -2;

      return await redis.ttl(key);
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}:`, error);
      return -2;
    }
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string): Promise<number> {
    if (!isRedisAvailable()) {
      return 0;
    }

    try {
      const redis = getRedis();
      if (!redis) return 0;

      return await redis.incr(key);
    } catch (error) {
      logger.error(`Cache incr error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set expiry on an existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const redis = getRedis();
      if (!redis) return false;

      await redis.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  // ============================================
  // Convenience methods for common cache patterns
  // ============================================

  /**
   * Get or set pattern: fetch from cache or execute callback and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const freshData = await fetchFn();

    // Cache the result (fire and forget)
    this.set(key, freshData, ttlSeconds).catch(() => {
      // Silently fail - caching is best effort
    });

    return freshData;
  }

  /**
   * Cache user data
   */
  async cacheUser(userId: string, userData: unknown, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    await this.set(`${CACHE_PREFIX.USER}${userId}`, userData, ttl);
  }

  /**
   * Get cached user data
   */
  async getCachedUser<T>(userId: string): Promise<T | null> {
    return this.get<T>(`${CACHE_PREFIX.USER}${userId}`);
  }

  /**
   * Invalidate user cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.del(`${CACHE_PREFIX.USER}${userId}`);
  }

  /**
   * Cache course data
   */
  async cacheCourse(courseId: string, courseData: unknown, ttl: number = CACHE_TTL.LONG): Promise<void> {
    await this.set(`${CACHE_PREFIX.COURSE}${courseId}`, courseData, ttl);
  }

  /**
   * Get cached course data
   */
  async getCachedCourse<T>(courseId: string): Promise<T | null> {
    return this.get<T>(`${CACHE_PREFIX.COURSE}${courseId}`);
  }

  /**
   * Invalidate course cache
   */
  async invalidateCourseCache(courseId: string): Promise<void> {
    await this.del(`${CACHE_PREFIX.COURSE}${courseId}`);
    // Also invalidate course list caches
    await this.delPattern(`${CACHE_PREFIX.COURSES_LIST}*`);
  }
}

export const cacheService = new CacheService();
export default cacheService;

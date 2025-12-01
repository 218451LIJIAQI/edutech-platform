/**
 * Cache Service (No-op implementation)
 * Redis caching has been removed for simplicity.
 * All methods return default values (no caching).
 */

export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  DAY: 86400,
  WEEK: 604800,
} as const;

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
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async set(_key: string, _value: unknown, _ttlSeconds?: number): Promise<boolean> {
    return false;
  }

  async del(_key: string): Promise<boolean> {
    return false;
  }

  async delPattern(_pattern: string): Promise<boolean> {
    return false;
  }

  async exists(_key: string): Promise<boolean> {
    return false;
  }

  async ttl(_key: string): Promise<number> {
    return -2;
  }

  async incr(_key: string): Promise<number> {
    return 0;
  }

  async expire(_key: string, _ttlSeconds: number): Promise<boolean> {
    return false;
  }

  async getOrSet<T>(_key: string, fetchFn: () => Promise<T>, _ttlSeconds?: number): Promise<T> {
    return fetchFn();
  }

  async cacheUser(_userId: string, _userData: unknown, _ttl?: number): Promise<void> {}
  async getCachedUser<T>(_userId: string): Promise<T | null> { return null; }
  async invalidateUserCache(_userId: string): Promise<void> {}
  async cacheCourse(_courseId: string, _courseData: unknown, _ttl?: number): Promise<void> {}
  async getCachedCourse<T>(_courseId: string): Promise<T | null> { return null; }
  async invalidateCourseCache(_courseId: string): Promise<void> {}
}

export const cacheService = new CacheService();
export default cacheService;

import jwt from 'jsonwebtoken';
import { getRedis, isRedisAvailable } from '../config/redis';
import logger from '../utils/logger';
import { CACHE_PREFIX } from './cache.service';

/**
 * Token Blacklist Service
 * Manages JWT token invalidation using Redis
 * 
 * When a user logs out, their token is added to the blacklist
 * until it naturally expires. This prevents reuse of logged-out tokens.
 * 
 * Note: If Redis is unavailable, token blacklisting is disabled.
 * This means logged-out tokens remain valid until they expire naturally.
 */

class TokenBlacklistService {
  private warnedUnavailable = false;

  /**
   * Add a token to the blacklist
   * @param token - The JWT token to blacklist
   * @returns true if blacklisted successfully
   */
  async blacklist(token: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      if (!this.warnedUnavailable) {
        logger.warn('Redis unavailable - token blacklist disabled');
        this.warnedUnavailable = true;
      }
      return false;
    }

    try {
      const redis = getRedis();
      if (!redis) return false;

      // Decode token to get expiration time (without verifying)
      const decoded = jwt.decode(token) as { exp?: number; jti?: string } | null;
      
      if (!decoded?.exp) {
        // Token has no expiration, use a default TTL
        const defaultTTL = 24 * 60 * 60; // 24 hours
        await redis.setex(this.getKey(token), defaultTTL, '1');
        return true;
      }

      // Calculate remaining time until token expires
      const now = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - now;

      if (ttl <= 0) {
        // Token already expired, no need to blacklist
        return true;
      }

      // Add to blacklist with TTL matching token expiration
      await redis.setex(this.getKey(token), ttl, '1');
      logger.debug(`Token blacklisted, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error('Error blacklisting token:', error);
      return false;
    }
  }

  /**
   * Check if a token is blacklisted
   * @param token - The JWT token to check
   * @returns true if token is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      // If Redis is unavailable, we can't check blacklist
      // For security, you might want to reject all tokens in this case
      // But for availability, we allow them through
      return false;
    }

    try {
      const redis = getRedis();
      if (!redis) return false;

      const result = await redis.exists(this.getKey(token));
      return result === 1;
    } catch (error) {
      logger.error('Error checking token blacklist:', error);
      return false;
    }
  }

  /**
   * Blacklist all tokens for a user (force logout from all devices)
   * This uses a user-level blacklist timestamp approach
   * @param userId - User ID to invalidate all tokens for
   */
  async blacklistUser(userId: string): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const redis = getRedis();
      if (!redis) return false;

      // Store timestamp when all previous tokens become invalid
      const key = `${CACHE_PREFIX.TOKEN_BLACKLIST}user:${userId}`;
      const now = Math.floor(Date.now() / 1000);
      
      // Keep this record for 30 days (longest token validity)
      await redis.setex(key, 30 * 24 * 60 * 60, now.toString());
      
      logger.info(`All tokens invalidated for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error invalidating user tokens for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if a token was issued before user's blacklist timestamp
   * @param userId - User ID
   * @param tokenIssuedAt - Token's iat claim (issued at timestamp)
   * @returns true if token should be rejected
   */
  async isUserTokenInvalid(userId: string, tokenIssuedAt: number): Promise<boolean> {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const redis = getRedis();
      if (!redis) return false;

      const key = `${CACHE_PREFIX.TOKEN_BLACKLIST}user:${userId}`;
      const blacklistTimestamp = await redis.get(key);

      if (!blacklistTimestamp) {
        return false; // No blacklist record
      }

      const blacklistTime = parseInt(blacklistTimestamp, 10);
      return tokenIssuedAt < blacklistTime;
    } catch (error) {
      logger.error(`Error checking user token validity for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Generate Redis key for token
   */
  private getKey(token: string): string {
    // Use hash of token to save space (tokens are long)
    // In production, you might want to use the jti claim if available
    const hash = Buffer.from(token).toString('base64').slice(-32);
    return `${CACHE_PREFIX.TOKEN_BLACKLIST}${hash}`;
  }

  /**
   * Get statistics about blacklisted tokens (for monitoring)
   */
  async getStats(): Promise<{ count: number } | null> {
    if (!isRedisAvailable()) {
      return null;
    }

    try {
      const redis = getRedis();
      if (!redis) return null;

      const keys = await redis.keys(`${CACHE_PREFIX.TOKEN_BLACKLIST}*`);
      return { count: keys.length };
    } catch (error) {
      logger.error('Error getting blacklist stats:', error);
      return null;
    }
  }
}

export const tokenBlacklistService = new TokenBlacklistService();
export default tokenBlacklistService;

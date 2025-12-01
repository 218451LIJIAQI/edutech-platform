/**
 * Token Blacklist Service (No-op implementation)
 * Redis-based token blacklisting has been removed for simplicity.
 * Tokens will remain valid until they naturally expire.
 */

class TokenBlacklistService {
  async blacklist(_token: string): Promise<boolean> {
    return false;
  }

  async isBlacklisted(_token: string): Promise<boolean> {
    return false;
  }

  async blacklistUser(_userId: string): Promise<boolean> {
    return false;
  }

  async isUserTokenInvalid(_userId: string, _tokenIssuedAt: number): Promise<boolean> {
    return false;
  }

  async getStats(): Promise<{ count: number } | null> {
    return null;
  }
}

export const tokenBlacklistService = new TokenBlacklistService();
export default tokenBlacklistService;

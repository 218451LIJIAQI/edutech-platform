import { Request, Response } from 'express';
import prisma from '../config/database';
import { getRedis, isRedisAvailable } from '../config/redis';
import asyncHandler from '../utils/asyncHandler';
import config from '../config/env';

/**
 * Health Check Controller
 * Provides comprehensive health status of the application
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface ServiceStatus {
  status: 'up' | 'down';
  latency?: number;
  message?: string;
}

class HealthController {
  /**
   * Basic health check
   * GET /api/v1/health
   */
  basic = asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'success',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Detailed health check
   * GET /api/v1/health/detailed
   */
  detailed = asyncHandler(async (_req: Request, res: Response) => {
    const health = await this.getHealthStatus();
    
    const httpStatus = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 200 : 503;
    
    res.status(httpStatus).json({
      status: 'success',
      data: health,
    });
  });

  /**
   * Readiness probe (for Kubernetes/Docker)
   * GET /api/v1/health/ready
   */
  ready = asyncHandler(async (_req: Request, res: Response) => {
    const dbStatus = await this.checkDatabase();
    
    if (dbStatus.status === 'up') {
      res.status(200).json({
        status: 'success',
        message: 'Application is ready to accept traffic',
      });
    } else {
      res.status(503).json({
        status: 'error',
        message: 'Application is not ready',
        reason: dbStatus.message,
      });
    }
  });

  /**
   * Liveness probe (for Kubernetes/Docker)
   * GET /api/v1/health/live
   */
  live = asyncHandler(async (_req: Request, res: Response) => {
    // Basic check - if this endpoint responds, the app is alive
    res.status(200).json({
      status: 'success',
      message: 'Application is alive',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Get comprehensive health status
   */
  private async getHealthStatus(): Promise<HealthStatus> {
    const [dbStatus, redisStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (dbStatus.status === 'down') {
      overallStatus = 'unhealthy';
    } else if (redisStatus.status === 'down') {
      overallStatus = 'degraded'; // Redis is optional, so just degraded
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.NODE_ENV,
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
      memory: {
        used: Math.round(usedMem / 1024 / 1024), // MB
        total: Math.round(totalMem / 1024 / 1024), // MB
        percentage: Math.round((usedMem / totalMem) * 100),
      },
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        latency: Date.now() - start,
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<ServiceStatus> {
    if (!isRedisAvailable()) {
      return {
        status: 'down',
        message: 'Redis not configured or unavailable',
      };
    }

    const start = Date.now();
    try {
      const redis = getRedis();
      if (!redis) {
        return {
          status: 'down',
          message: 'Redis client not initialized',
        };
      }
      
      await redis.ping();
      return {
        status: 'up',
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        latency: Date.now() - start,
        message: error instanceof Error ? error.message : 'Redis connection failed',
      };
    }
  }
}

export default new HealthController();

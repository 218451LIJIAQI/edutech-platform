import { Request, Response } from 'express';
import prisma from '../config/database';
import asyncHandler from '../utils/asyncHandler';
import config from '../config/env';

/**
 * Health Check Controller
 * Provides health status of the application
 */

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceStatus;
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
    const httpStatus = health.status === 'healthy' ? 200 : 503;
    
    res.status(httpStatus).json({
      status: 'success',
      data: health,
    });
  });

  /**
   * Readiness probe
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
   * Liveness probe
   * GET /api/v1/health/live
   */
  live = asyncHandler(async (_req: Request, res: Response) => {
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
    const dbStatus = await this.checkDatabase();

    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;

    return {
      status: dbStatus.status === 'up' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.NODE_ENV,
      services: {
        database: dbStatus,
      },
      memory: {
        used: Math.round(usedMem / 1024 / 1024),
        total: Math.round(totalMem / 1024 / 1024),
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
}

export default new HealthController();

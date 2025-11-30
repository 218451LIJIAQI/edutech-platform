import { Router } from 'express';
import healthController from '../controllers/health.controller';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Basic health check
 *     description: Returns basic health status of the server
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Server is running
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/', healthController.basic);

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     tags: [Health]
 *     summary: Detailed health check
 *     description: Returns comprehensive health status including database and cache connectivity
 *     responses:
 *       200:
 *         description: Health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, degraded, unhealthy]
 *                     uptime:
 *                       type: number
 *                     version:
 *                       type: string
 *                     services:
 *                       type: object
 *                     memory:
 *                       type: object
 *       503:
 *         description: Service unhealthy
 */
router.get('/detailed', healthController.detailed);

/**
 * @swagger
 * /health/ready:
 *   get:
 *     tags: [Health]
 *     summary: Readiness probe
 *     description: Check if application is ready to accept traffic (for Kubernetes/Docker)
 *     responses:
 *       200:
 *         description: Application is ready
 *       503:
 *         description: Application is not ready
 */
router.get('/ready', healthController.ready);

/**
 * @swagger
 * /health/live:
 *   get:
 *     tags: [Health]
 *     summary: Liveness probe
 *     description: Check if application is alive (for Kubernetes/Docker)
 *     responses:
 *       200:
 *         description: Application is alive
 */
router.get('/live', healthController.live);

export default router;

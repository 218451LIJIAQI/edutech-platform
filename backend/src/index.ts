import express, { Application } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import config from './config/env';
import logger from './utils/logger';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import LiveSessionHandler from './socket/liveSession.handler';

/**
 * Edutech Platform Backend Server
 * Main application entry point
 */

// Create Express app
const app: Application = express();
const httpServer = createServer(app);

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: config.SOCKET_CORS_ORIGIN,
    credentials: true,
  },
});

// Trust proxy in production (needed for correct IPs and some rate limiters behind proxies)
if (config.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(
  helmet({
    // Allow cross-origin loading of static assets like images/videos from /uploads when frontend is on a different origin
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  })
);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
app.use('/api', apiLimiter);

// Static files (uploads)
app.use('/uploads', express.static(config.UPLOAD_DIR));

// API routes
app.use(`/api/${config.API_VERSION}`, routes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Edutech Platform API',
    version: '1.0.0',
    description: 'A comprehensive learning management system',
    endpoints: {
      health: `/api/${config.API_VERSION}/health`,
      docs: `/api/${config.API_VERSION}/docs`,
    },
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Initialize Socket.io handlers
new LiveSessionHandler(io);

// Start server (skip when running tests)
const PORT = config.PORT || 3000;
if (config.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} in ${config.NODE_ENV} mode`);
    logger.info(`📚 API available at http://localhost:${PORT}/api/${config.API_VERSION}`);
    logger.info(`🔌 Socket.io server running on port ${PORT}`);
  });
}

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`${signal} signal received: closing Socket.io and HTTP server`);
  try {
    io.close(() => {
      logger.info('Socket.io server closed');
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (err) {
    logger.error('Error during shutdown', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to restart the server or alert monitoring service
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  // Best practice is to crash so process managers can restart the service cleanly
  process.exit(1);
});

export { app };
export default app;

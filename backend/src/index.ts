import express, { Application } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

// Config and utilities
import config from './config/env';
import logger from './utils/logger';
import { initRedis, closeRedis } from './config/redis';
import { closeAllQueues } from './config/queue';
import { swaggerSpec } from './config/swagger';
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './config/sentry';

// Routes
import routes from './routes';

// Middleware
import { errorHandler, notFound } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { correlationIdMiddleware } from './middleware/correlationId';
import { xssProtection, additionalSecurityHeaders } from './middleware/security';

// Socket handlers
import LiveSessionHandler from './socket/liveSession.handler';

// Services (initialize background workers)
import { emailService } from './services/email.service';

/**
 * Edutech Platform Backend Server
 * Main application entry point with enhanced features:
 * - Redis caching and token blacklist
 * - Swagger API documentation
 * - Request correlation IDs for tracing
 * - Enhanced security (XSS protection, HSTS)
 * - Background job processing with BullMQ
 * - Sentry error monitoring
 * - Daily log rotation
 */

// Create Express app
const app: Application = express();
const httpServer = createServer(app);

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: config.NODE_ENV === 'development'
      ? (origin, callback) => {
          const allowedPatterns = [
            /^http:\/\/localhost(:\d+)?$/,
            /^http:\/\/127\.0\.0\.1(:\d+)?$/,
          ];
          if (!origin || allowedPatterns.some(pattern => pattern.test(origin))) {
            callback(null, true);
          } else {
            callback(null, false);
          }
        }
      : config.SOCKET_CORS_ORIGIN,
    credentials: true,
  },
});

// Initialize Sentry (must be done before other middleware)
initSentry(app);

// Trust proxy in production (needed for correct IPs and some rate limiters behind proxies)
if (config.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Sentry request handler (must be first)
app.use(sentryRequestHandler());

// Correlation ID middleware (for request tracing)
app.use(correlationIdMiddleware);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(additionalSecurityHeaders);

// CORS configuration
app.use(
  cors({
    origin: config.NODE_ENV === 'development' 
      ? (origin, callback) => {
          // Allow requests with no origin (mobile apps, Postman, etc.)
          // or from localhost/127.0.0.1 in development
          const allowedPatterns = [
            /^http:\/\/localhost(:\d+)?$/,
            /^http:\/\/127\.0\.0\.1(:\d+)?$/,
          ];
          if (!origin || allowedPatterns.some(pattern => pattern.test(origin))) {
            callback(null, true);
          } else {
            callback(null, false);
          }
        }
      : config.CORS_ORIGIN,
    credentials: true,
  })
);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// XSS Protection (sanitize inputs)
app.use(xssProtection);

// Logging middleware with correlation ID
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Custom format with correlation ID
  app.use(morgan(':method :url :status :response-time ms - :res[content-length] [:req[x-correlation-id]]'));
}

// Rate limiting
app.use('/api', apiLimiter);

// Static files (uploads)
app.use('/uploads', express.static(config.UPLOAD_DIR));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'Edutech API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

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
      healthDetailed: `/api/${config.API_VERSION}/health/detailed`,
      docs: '/api-docs',
      docsJson: '/api-docs.json',
    },
    features: [
      'JWT Authentication with token blacklist',
      'Redis caching',
      'Real-time messaging via Socket.io',
      'Background job processing',
      'Rate limiting',
      'Request tracing via correlation IDs',
    ],
  });
});

// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler());

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Initialize Socket.io handlers
new LiveSessionHandler(io);

// Initialize services
const initializeServices = async () => {
  // Initialize Redis
  initRedis();
  
  // Initialize email service worker
  emailService.initialize();
  
  logger.info('✅ All services initialized');
};

// Start server (skip when running tests)
const PORT = config.PORT || 3000;
if (config.NODE_ENV !== 'test') {
  initializeServices()
    .then(() => {
      httpServer.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT} in ${config.NODE_ENV} mode`);
        logger.info(`📚 API available at http://localhost:${PORT}/api/${config.API_VERSION}`);
        logger.info(`📖 API Docs available at http://localhost:${PORT}/api-docs`);
        logger.info(`🔌 Socket.io server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      logger.error('Failed to initialize services:', err);
      process.exit(1);
    });
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} signal received: starting graceful shutdown`);
  
  try {
    // Close Socket.io
    await new Promise<void>((resolve) => {
      io.close(() => {
        logger.info('Socket.io server closed');
        resolve();
      });
    });
    
    // Close HTTP server
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err) reject(err);
        else {
          logger.info('HTTP server closed');
          resolve();
        }
      });
    });
    
    // Close Redis connection
    await closeRedis();
    
    // Close all job queues
    await closeAllQueues();
    
    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

export { app };
export default app;

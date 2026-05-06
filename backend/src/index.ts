import express, { Application } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

// Config and utilities
import config from "./config/env";
import prisma, { disconnectPrisma } from "./config/database";
import { appCorsOptions, socketCorsOptions } from "./config/origin-policy";
import logger from "./utils/logger";

// Routes
import routes from "./routes";

// Middleware
import { errorHandler, notFound } from "./middleware/error-handler";
import { apiLimiter } from "./middleware/rate-limiter";
import { requestId } from "./middleware/request-id";
import {
  xssProtection,
  additionalSecurityHeaders,
} from "./middleware/security";

// Socket handlers
import LiveSessionHandler from "./socket/live-session.handler";

/**
 * Edutech Platform Backend Server
 * Main application entry point.
 */

const app: Application = express();
const httpServer = createServer(app);

const API_PREFIX = `/api/${config.API_VERSION}`;
const PORT = config.PORT || 3000;
const isProduction = config.NODE_ENV === "production";
const isDevelopment = config.NODE_ENV === "development";
const isTest = config.NODE_ENV === "test";

// Hide Express technology information from response headers.
app.disable("x-powered-by");

// Attach a stable request id to every response and log entry.
app.use(requestId);

// Trust proxy in production.
// This is needed when the app is deployed behind a reverse proxy or load balancer.
if (isProduction) {
  app.set("trust proxy", 1);
}

// Create Socket.io server.
const io = new Server(httpServer, {
  cors: socketCorsOptions,
  serveClient: false,
  pingInterval: 25_000,
  pingTimeout: 60_000,
  maxHttpBufferSize: 1_000_000,
});

// Security middleware.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(additionalSecurityHeaders);

// CORS configuration.
app.use(cors(appCorsOptions));

// Compression middleware.
app.use(compression());

// Body parsing middleware.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// XSS protection middleware.
app.use(xssProtection);

// HTTP request logging.
app.use(
  morgan(isDevelopment ? "dev" : "combined", {
    skip: (req) =>
      req.path === `${API_PREFIX}/health` || req.path === `${API_PREFIX}/ready`,
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
  }),
);

// Health check endpoint.
// Placed before rate limiting so monitoring tools are not blocked.
app.get(`${API_PREFIX}/health`, (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Edutech Platform API",
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Readiness endpoint.
// Checks dependencies that must be available before the app receives traffic.
app.get(`${API_PREFIX}/ready`, async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      status: "ok",
      service: "Edutech Platform API",
      checks: {
        database: "ok",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Readiness check failed", { error });

    return res.status(503).json({
      status: "error",
      service: "Edutech Platform API",
      checks: {
        database: "error",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Rate limiting for API routes.
app.use("/api", apiLimiter);

// Static file handling for uploads.
// Sensitive folders are blocked from direct public access.
const protectedUploadFolders = new Set([
  "documents",
  "verifications",
  "support-attachments",
  "teacher-certificates",
]);

const decodeUploadRequestPath = (originalUrl: string): string | null => {
  const rawPath = originalUrl.split("?")[0] ?? "";
  const uploadPathStart = rawPath.toLowerCase().indexOf("/uploads");

  if (uploadPathStart < 0) {
    return "";
  }

  const rawUploadPath = rawPath.slice(uploadPathStart + "/uploads".length);

  try {
    return decodeURIComponent(rawUploadPath);
  } catch {
    return null;
  }
};

app.use("/uploads", (req, res, next) => {
  const decodedUploadPath = decodeUploadRequestPath(req.originalUrl);

  if (decodedUploadPath === null) {
    return res.status(400).json({
      status: "error",
      message: "Invalid upload path encoding",
    });
  }

  const uploadPathSegments = decodedUploadPath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean);

  if (
    uploadPathSegments.some((segment) => segment === "." || segment === "..")
  ) {
    return res.status(400).json({
      status: "error",
      message: "Invalid upload path",
    });
  }

  const folder = uploadPathSegments[0]?.toLowerCase();

  if (folder && protectedUploadFolders.has(folder)) {
    return res.status(403).json({
      status: "error",
      message: "Direct access to this upload folder is forbidden",
    });
  }

  return next();
});

app.use(
  "/uploads",
  express.static(config.UPLOAD_DIR, {
    index: false,
    dotfiles: "deny",
    maxAge: isProduction ? "1d" : 0,
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);

// API routes.
app.use(API_PREFIX, routes);

// Root endpoint.
app.get("/", (_req, res) => {
  res.status(200).json({
    name: "Edutech Platform API",
    version: "1.0.0",
    description: "A comprehensive learning management system",
    endpoints: {
      health: `${API_PREFIX}/health`,
      readiness: `${API_PREFIX}/ready`,
      api: API_PREFIX,
    },
  });
});

// 404 handler.
app.use(notFound);

// Global error handler.
app.use(errorHandler);

// Initialize Socket.io handlers.
new LiveSessionHandler(io);

// Initialize application services.
const initializeServices = async () => {
  logger.info("All services initialized");
};

let isShuttingDown = false;

const closeSocketServer = async () => {
  await new Promise<void>((resolve) => {
    io.close(() => {
      logger.info("Socket.io server closed");
      resolve();
    });
  });
};

const closeHttpServer = async () => {
  if (!httpServer.listening) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    httpServer.close((err) => {
      if (err) {
        reject(err);
        return;
      }

      logger.info("HTTP server closed");
      resolve();
    });
  });
};

// Graceful shutdown.
const shutdown = async (signal: string) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received: starting graceful shutdown`);

  const forceExitTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out. Forcing process exit.");
    process.exit(1);
  }, 10_000);

  forceExitTimer.unref();

  try {
    await closeSocketServer();
    await closeHttpServer();
    await disconnectPrisma(signal);

    clearTimeout(forceExitTimer);
    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (err) {
    clearTimeout(forceExitTimer);
    logger.error("Error during graceful shutdown:", err);
    process.exit(1);
  }
};

// Start server.
// Skipped during tests so test suites can import the app without opening a port.
if (!isTest) {
  initializeServices()
    .then(() => {
      httpServer.listen(PORT, () => {
        logger.info(
          `Server running on port ${PORT} in ${config.NODE_ENV} mode`,
        );
        logger.info(`API available at http://localhost:${PORT}${API_PREFIX}`);
      });
    })
    .catch((err) => {
      logger.error("Failed to initialize services:", err);
      process.exit(1);
    });
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on(
  "unhandledRejection",
  (reason: unknown, promise: Promise<unknown>) => {
    logger.error("Unhandled promise rejection:", { promise, reason });
    void shutdown("unhandledRejection");
  },
);

process.on("uncaughtException", (err: Error) => {
  logger.error("Uncaught exception:", err);
  void shutdown("uncaughtException");
});

export { app, httpServer, io };

import type {
  ErrorRequestHandler,
  Request,
  Response,
  NextFunction,
} from "express";
import { Prisma } from "@prisma/client";
import multer from "multer";

import { AppError } from "../utils/errors";
import logger from "../utils/logger";
import config from "../config/env";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error occurred";
};

const getErrorName = (error: unknown): string => {
  if (error instanceof Error) {
    return error.name;
  }

  return "UnknownError";
};

const getErrorStack = (error: unknown): string | undefined => {
  if (error instanceof Error) {
    return error.stack;
  }

  return undefined;
};

type HttpParserError = Error & {
  status?: number;
  statusCode?: number;
  type?: string;
  expose?: boolean;
};

const isHttpParserError = (error: unknown): error is HttpParserError => {
  if (!(error instanceof Error)) {
    return false;
  }

  const candidate = error as HttpParserError;
  const statusCode = candidate.status ?? candidate.statusCode;

  return (
    typeof statusCode === "number" &&
    statusCode >= 400 &&
    statusCode < 500 &&
    typeof candidate.type === "string"
  );
};

const errorResponse = (
  req: Request,
  message: string,
  extra?: Record<string, unknown>,
) => ({
  status: "error",
  message,
  ...(req.requestId ? { requestId: req.requestId } : {}),
  ...(extra ?? {}),
});

const handleMulterError = (
  error: multer.MulterError,
  req: Request,
  res: Response,
) => {
  const messageByCode: Partial<Record<multer.ErrorCode, string>> = {
    LIMIT_PART_COUNT: "Too many form parts were uploaded",
    LIMIT_FILE_SIZE: "Uploaded file is too large",
    LIMIT_FILE_COUNT: "Too many files were uploaded",
    LIMIT_FIELD_KEY: "Uploaded field name is too long",
    LIMIT_FIELD_VALUE: "Uploaded field value is too long",
    LIMIT_FIELD_COUNT: "Too many form fields were uploaded",
    LIMIT_UNEXPECTED_FILE: "Unexpected upload field",
  };

  return res
    .status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400)
    .json(
      errorResponse(
        req,
        messageByCode[error.code] || "Invalid file upload",
      ),
    );
};

const handlePrismaKnownRequestError = (
  error: Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
) => {
  switch (error.code) {
    case "P2000":
      return res
        .status(400)
        .json(errorResponse(req, "Input value is too long"));

    case "P2002":
      return res
        .status(409)
        .json(errorResponse(req, "Resource already exists"));

    case "P2003":
      return res
        .status(400)
        .json(errorResponse(req, "Invalid related resource reference"));

    case "P2011":
      return res
        .status(400)
        .json(errorResponse(req, "Required field cannot be null"));

    case "P2012":
      return res
        .status(400)
        .json(errorResponse(req, "Missing required field"));

    case "P2025":
      return res.status(404).json(errorResponse(req, "Resource not found"));

    default:
      return res
        .status(400)
        .json(errorResponse(req, "Database operation failed"));
  }
};

/**
 * Global error handling middleware.
 *
 * This middleware handles operational errors, Prisma errors, authentication errors,
 * and unexpected server errors in a consistent response format.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  logger.error("Unhandled error", {
    message: getErrorMessage(err),
    name: getErrorName(err),
    stack: getErrorStack(err),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    requestId: req.requestId,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(errorResponse(req, err.message));
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaKnownRequestError(err, req, res);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res
      .status(400)
      .json(errorResponse(req, "Invalid database query or input data"));
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return res
      .status(503)
      .json(errorResponse(req, "Database connection failed"));
  }

  if (isHttpParserError(err)) {
    const statusCode = err.status ?? err.statusCode ?? 400;
    const messageByType: Record<string, string> = {
      "entity.parse.failed": "Malformed JSON request body",
      "entity.too.large": "Request body is too large",
      "encoding.unsupported": "Unsupported request encoding",
      "request.aborted": "Request was aborted before it could be processed",
    };

    return res.status(statusCode).json(
      errorResponse(
        req,
        messageByType[err.type ?? ""] ||
          (err.expose ? err.message : "Invalid request body"),
      ),
    );
  }

  if (err instanceof multer.MulterError) {
    return handleMulterError(err, req, res);
  }

  if (getErrorName(err) === "JsonWebTokenError") {
    return res
      .status(401)
      .json(errorResponse(req, "Invalid authentication token"));
  }

  if (getErrorName(err) === "TokenExpiredError") {
    return res
      .status(401)
      .json(errorResponse(req, "Authentication token expired"));
  }

  return res
    .status(500)
    .json(
      errorResponse(
        req,
        config.IS_PROD ? "Internal server error" : getErrorMessage(err),
      ),
    );
};

/**
 * Handle unmatched routes.
 */
export const notFound = (req: Request, res: Response, _next: NextFunction) => {
  return res
    .status(404)
    .json(
      errorResponse(req, `Route not found: ${req.method} ${req.originalUrl}`),
    );
};

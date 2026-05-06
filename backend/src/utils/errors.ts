/**
 * Custom application error classes for consistent API error handling.
 */

const DEFAULT_ERROR_STATUS_CODE = 500;
const MIN_ERROR_STATUS_CODE = 400;
const MAX_ERROR_STATUS_CODE = 599;

const isValidErrorStatusCode = (statusCode: number): boolean => {
  return (
    Number.isInteger(statusCode) &&
    statusCode >= MIN_ERROR_STATUS_CODE &&
    statusCode <= MAX_ERROR_STATUS_CODE
  );
};

const ErrorWithCaptureStackTrace = Error as ErrorConstructor & {
  captureStackTrace?: (targetObject: object) => void;
};

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);

    this.name = new.target.name;
    this.statusCode = isValidErrorStatusCode(statusCode)
      ? statusCode
      : DEFAULT_ERROR_STATUS_CODE;
    this.isOperational = true;

    ErrorWithCaptureStackTrace.captureStackTrace?.(this);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, 400);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication failed") {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429);
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Internal server error") {
    super(message, 500);
  }
}

import { randomUUID } from "crypto";
import type { RequestHandler } from "express";

const REQUEST_ID_HEADER = "x-request-id";
const MAX_REQUEST_ID_LENGTH = 128;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

const getHeaderValue = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
};

const normalizeRequestId = (value: unknown): string | undefined => {
  const requestId = getHeaderValue(value)?.trim();

  if (
    !requestId ||
    requestId.length > MAX_REQUEST_ID_LENGTH ||
    !REQUEST_ID_PATTERN.test(requestId)
  ) {
    return undefined;
  }

  return requestId;
};

export const requestId: RequestHandler = (req, res, next) => {
  const id = normalizeRequestId(req.headers[REQUEST_ID_HEADER]) ?? randomUUID();

  req.requestId = id;
  res.setHeader("X-Request-Id", id);

  return next();
};

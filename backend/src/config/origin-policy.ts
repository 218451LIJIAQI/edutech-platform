import type { CorsOptions } from "cors";
import config from "./env";

type OriginCallback = (error: Error | null, allow?: boolean) => void;
type CorsOriginInput = string | string[];

const localDevelopmentOriginPatterns = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

const normalizeOrigins = (originConfig: CorsOriginInput): string[] => {
  return Array.isArray(originConfig) ? originConfig : [originConfig];
};

const isLocalDevelopmentOrigin = (origin: string): boolean => {
  return localDevelopmentOriginPatterns.some((pattern) => pattern.test(origin));
};

const isConfiguredOrigin = (
  origin: string,
  allowedOrigins: string[],
): boolean => {
  return allowedOrigins.includes(origin);
};

const createOriginValidator = (
  allowedOriginConfig: CorsOriginInput,
  options: { allowLocalDevelopmentOrigins?: boolean } = {},
) => {
  const allowedOrigins = normalizeOrigins(allowedOriginConfig);
  const allowAnyOrigin = allowedOrigins.includes("*");

  if (allowAnyOrigin && config.IS_PROD) {
    throw new Error(
      'CORS_ORIGIN cannot be "*" in production when credentials are enabled.',
    );
  }

  return (origin: string | undefined, callback: OriginCallback) => {
    // Allow requests without an Origin header, such as same-origin requests,
    // server-to-server requests, Postman, or mobile app requests.
    if (!origin) {
      callback(null, true);
      return;
    }

    const isAllowed =
      allowAnyOrigin ||
      isConfiguredOrigin(origin, allowedOrigins) ||
      Boolean(
        options.allowLocalDevelopmentOrigins &&
          isLocalDevelopmentOrigin(origin),
      );

    callback(null, isAllowed);
  };
};

export const appCorsOptions: CorsOptions = {
  origin: createOriginValidator(config.CORS_ORIGIN, {
    allowLocalDevelopmentOrigins: config.IS_DEV,
  }),
  credentials: true,
};

export const socketCorsOptions = {
  origin: createOriginValidator(config.SOCKET_CORS_ORIGIN, {
    allowLocalDevelopmentOrigins: config.IS_DEV,
  }),
  credentials: true,
};

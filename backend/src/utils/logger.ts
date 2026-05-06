import winston from "winston";

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";

const VALID_LOG_LEVELS = new Set([
  "error",
  "warn",
  "info",
  "http",
  "verbose",
  "debug",
  "silly",
]);

const configuredLevel = process.env.LOG_LEVEL?.toLowerCase();

const level =
  configuredLevel && VALID_LOG_LEVELS.has(configuredLevel)
    ? configuredLevel
    : isProd
      ? "info"
      : "debug";

const SENSITIVE_KEYS = new Set([
  "password",
  "currentpassword",
  "newpassword",
  "oldpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "resettoken",
  "authorization",
  "cookie",
  "setcookie",
  "secret",
  "jwtsecret",
  "jwtrefreshsecret",
  "apikey",
  "privatekey",
  "bankdetails",
  "accountnumber",
  "accountno",
  "walletid",
]);

const normalizeKey = (key: string): string => {
  return key.toLowerCase().replace(/[_-]/g, "");
};

const isSensitiveKey = (key: string): boolean => {
  return SENSITIVE_KEYS.has(normalizeKey(key));
};

const redactSensitiveData = winston.format((info) => {
  const seenObjects = new WeakSet<object>();

  const redact = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(redact);
    }

    if (value instanceof Date) {
      return value;
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    if (value && typeof value === "object") {
      if (seenObjects.has(value)) {
        return "[Circular]";
      }

      seenObjects.add(value);

      return Object.entries(value as Record<string, unknown>).reduce<
        Record<string, unknown>
      >((result, [key, nestedValue]) => {
        result[key] = isSensitiveKey(key) ? "[REDACTED]" : redact(nestedValue);

        return result;
      }, {});
    }

    return value;
  };

  Object.keys(info).forEach((key) => {
    info[key] = isSensitiveKey(key) ? "[REDACTED]" : redact(info[key]);
  });

  return info;
});

const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  redactSensitiveData(),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;

    const metadata =
      Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";

    return `${timestamp} [${level}]: ${stack || message}${metadata}`;
  }),
);

const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  redactSensitiveData(),
  winston.format.json(),
);

const logger = winston.createLogger({
  level,
  format: isProd ? productionFormat : developmentFormat,
  defaultMeta: {
    service: "edutech-api",
    environment: NODE_ENV,
  },
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

export default logger;

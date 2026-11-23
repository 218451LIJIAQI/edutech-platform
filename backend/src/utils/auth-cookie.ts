import type { CookieOptions, Request, Response } from "express";
import config from "../config/env";

export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
export const REFRESH_SESSION_HINT_COOKIE_NAME = "refreshSession";

const REFRESH_TOKEN_COOKIE_PATH = `/api/${config.API_VERSION}/auth`;
const REFRESH_SESSION_HINT_COOKIE_PATH = "/";

type CookieMap = Record<string, string>;

const decodeCookieComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const parseCookieHeader = (cookieHeader?: string): CookieMap => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<CookieMap>((cookies, part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex <= 0) {
        return cookies;
      }

      const name = decodeCookieComponent(part.slice(0, separatorIndex).trim());
      const value = decodeCookieComponent(
        part.slice(separatorIndex + 1).trim(),
      );

      if (name) {
        cookies[name] = value;
      }

      return cookies;
    }, {});
};

export const parseDurationToMs = (value: string): number | undefined => {
  const duration = value.trim();

  if (!duration) {
    return undefined;
  }

  const exactMilliseconds = Number(duration);

  if (
    Number.isFinite(exactMilliseconds) &&
    Number.isSafeInteger(exactMilliseconds) &&
    exactMilliseconds > 0
  ) {
    return exactMilliseconds;
  }

  const match = duration.match(/^(\d+)(ms|s|m|h|d|w)$/i);

  if (!match) {
    return undefined;
  }

  const amount = Number(match[1]);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return undefined;
  }

  const multiplier: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  const maxAge = amount * multiplier[match[2].toLowerCase()];

  return Number.isSafeInteger(maxAge) && maxAge > 0 ? maxAge : undefined;
};

/**
 * Uses `SameSite=Lax` by default (including same-origin production deployments such as Render)
 * and switches to `SameSite=None; Secure` only when an explicit cross-origin HTTPS frontend
 * is configured via `CORS_ORIGIN`.
 */
export const resolveCookieSameSitePolicy = (options?: {
  isProd?: boolean;
  corsOrigin?: string | string[];
  rawCorsOriginEnv?: string;
  renderExternalUrl?: string;
}): "lax" | "none" => {
  const isProd = options?.isProd ?? config.IS_PROD;
  if (!isProd) {
    return "lax";
  }

  const rawCorsOrigin = options?.rawCorsOriginEnv ?? process.env.CORS_ORIGIN;
  if (!rawCorsOrigin || !rawCorsOrigin.trim()) {
    return "lax";
  }

  const corsOrigin = options?.corsOrigin ?? config.CORS_ORIGIN;
  const configuredOrigins = Array.isArray(corsOrigin)
    ? corsOrigin
    : [corsOrigin];
  const backendUrl =
    options?.renderExternalUrl ?? process.env.RENDER_EXTERNAL_URL;

  let backendOrigin: string | null = null;
  if (backendUrl && backendUrl.trim()) {
    try {
      backendOrigin = new URL(backendUrl.trim()).origin;
    } catch {
      backendOrigin = null;
    }
  }

  const hasCrossOriginHttpsFrontend = configuredOrigins.some((candidate) => {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== "https:") {
        return false;
      }
      return backendOrigin ? parsed.origin !== backendOrigin : true;
    } catch {
      return false;
    }
  });

  return hasCrossOriginHttpsFrontend ? "none" : "lax";
};

const buildCookieOptions = (
  path: string,
  httpOnly: boolean,
  includeMaxAge = true,
): CookieOptions => {
  const maxAge = parseDurationToMs(config.JWT_REFRESH_EXPIRES_IN);
  const sameSite = resolveCookieSameSitePolicy();

  return {
    httpOnly,
    secure: config.IS_PROD,
    sameSite,
    path,
    ...(includeMaxAge && maxAge ? { maxAge } : {}),
  };
};

export const hasRefreshTokenCookieHeader = (cookieHeader?: string): boolean =>
  Boolean(parseCookieHeader(cookieHeader)[REFRESH_TOKEN_COOKIE_NAME]);

export const getRefreshTokenFromRequest = (req: Request): string | null =>
  parseCookieHeader(req.headers.cookie)[REFRESH_TOKEN_COOKIE_NAME] ?? null;

export const setRefreshTokenCookie = (
  res: Response,
  refreshToken: string,
): void => {
  res.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    refreshToken,
    buildCookieOptions(REFRESH_TOKEN_COOKIE_PATH, true, true),
  );
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(
    REFRESH_TOKEN_COOKIE_NAME,
    buildCookieOptions(REFRESH_TOKEN_COOKIE_PATH, true, false),
  );
};

export const setRefreshSessionHintCookie = (res: Response): void => {
  res.cookie(
    REFRESH_SESSION_HINT_COOKIE_NAME,
    "1",
    buildCookieOptions(REFRESH_SESSION_HINT_COOKIE_PATH, false, true),
  );
};

export const clearRefreshSessionHintCookie = (res: Response): void => {
  res.clearCookie(
    REFRESH_SESSION_HINT_COOKIE_NAME,
    buildCookieOptions(REFRESH_SESSION_HINT_COOKIE_PATH, false, false),
  );
};

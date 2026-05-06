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

const parseCookieHeader = (cookieHeader?: string): CookieMap => {
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

const parseDurationToMs = (value: string): number | undefined => {
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

  const unit = match[2].toLowerCase();

  const multiplier: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  const maxAge = amount * multiplier[unit];

  return Number.isSafeInteger(maxAge) && maxAge > 0 ? maxAge : undefined;
};

const getRefreshTokenCookieOptions = (includeMaxAge = true): CookieOptions => {
  const maxAge = parseDurationToMs(config.JWT_REFRESH_EXPIRES_IN);

  return {
    httpOnly: true,
    secure: config.IS_PROD,
    sameSite: config.IS_PROD ? "none" : "lax",
    path: REFRESH_TOKEN_COOKIE_PATH,
    ...(includeMaxAge && maxAge ? { maxAge } : {}),
  };
};

const getRefreshSessionHintCookieOptions = (
  includeMaxAge = true,
): CookieOptions => {
  const maxAge = parseDurationToMs(config.JWT_REFRESH_EXPIRES_IN);

  return {
    httpOnly: false,
    secure: config.IS_PROD,
    sameSite: config.IS_PROD ? "none" : "lax",
    path: REFRESH_SESSION_HINT_COOKIE_PATH,
    ...(includeMaxAge && maxAge ? { maxAge } : {}),
  };
};

export const hasRefreshTokenCookieHeader = (cookieHeader?: string): boolean => {
  return Boolean(parseCookieHeader(cookieHeader)[REFRESH_TOKEN_COOKIE_NAME]);
};

export const getRefreshTokenFromRequest = (req: Request): string | null => {
  return (
    parseCookieHeader(req.headers.cookie)[REFRESH_TOKEN_COOKIE_NAME] ?? null
  );
};

export const setRefreshTokenCookie = (
  res: Response,
  refreshToken: string,
): void => {
  res.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    refreshToken,
    getRefreshTokenCookieOptions(),
  );
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(
    REFRESH_TOKEN_COOKIE_NAME,
    getRefreshTokenCookieOptions(false),
  );
};

export const setRefreshSessionHintCookie = (res: Response): void => {
  res.cookie(
    REFRESH_SESSION_HINT_COOKIE_NAME,
    "1",
    getRefreshSessionHintCookieOptions(),
  );
};

export const clearRefreshSessionHintCookie = (res: Response): void => {
  res.clearCookie(
    REFRESH_SESSION_HINT_COOKIE_NAME,
    getRefreshSessionHintCookieOptions(false),
  );
};

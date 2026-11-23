const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;
const PROTOCOL_RELATIVE_URL_PATTERN = /^\/\//;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getRuntimeOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost';
};

export const getApiBaseUrl = (): string => {
  const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
  return configuredApiUrl ? trimTrailingSlash(configuredApiUrl) : '/api/v1';
};

const parseApiBaseUrl = (
  apiBaseUrl = getApiBaseUrl(),
  runtimeOrigin = getRuntimeOrigin()
): { origin: string; pathname: string } => {
  try {
    const parsed = ABSOLUTE_URL_PATTERN.test(apiBaseUrl)
      ? new URL(apiBaseUrl)
      : new URL(apiBaseUrl, runtimeOrigin);

    return {
      origin: parsed.origin,
      pathname: trimTrailingSlash(parsed.pathname) || '/',
    };
  } catch {
    return {
      origin: runtimeOrigin,
      pathname: '/',
    };
  }
};

/**
 * Resolves an API request URL against `apiBaseUrl` while preserving the API
 * path prefix (e.g. `/api/v1`) for leading-slash endpoints like `'/auth/profile'`.
 * Native `new URL('/auth/profile', 'http://localhost:3000/api/v1')` would strip `/api/v1`.
 */
export const resolveApiRequestUrl = (
  url: string | undefined,
  apiBaseUrl = getApiBaseUrl(),
  runtimeOrigin = getRuntimeOrigin()
): URL | null => {
  const base = parseApiBaseUrl(apiBaseUrl, runtimeOrigin);

  if (!url) {
    return new URL(base.pathname, base.origin);
  }

  const trimmed = url.trim();
  if (!trimmed || PROTOCOL_RELATIVE_URL_PATTERN.test(trimmed)) {
    return null;
  }

  if (ABSOLUTE_URL_PATTERN.test(trimmed)) {
    try {
      return new URL(trimmed);
    } catch {
      return null;
    }
  }

  const basePath = base.pathname === '/' ? '' : base.pathname;
  const relativePath = trimmed.replace(/^\/+/, '');

  try {
    return new URL(`${basePath}/${relativePath}`, base.origin);
  } catch {
    return null;
  }
};

export const shouldAttachAuthHeader = (
  url?: string,
  apiBaseUrl = getApiBaseUrl(),
  runtimeOrigin = getRuntimeOrigin()
): boolean => {
  const resolved = resolveApiRequestUrl(url, apiBaseUrl, runtimeOrigin);
  if (!resolved) {
    return false;
  }

  const base = parseApiBaseUrl(apiBaseUrl, runtimeOrigin);
  const basePrefix = base.pathname === '/' ? '/' : `${base.pathname}/`;
  const requestPath = resolved.pathname.endsWith('/')
    ? resolved.pathname
    : `${resolved.pathname}/`;

  return resolved.origin === base.origin && requestPath.startsWith(basePrefix);
};

export const normalizeRequestPath = (
  url?: string,
  apiBaseUrl = getApiBaseUrl(),
  runtimeOrigin = getRuntimeOrigin()
): string => {
  if (!url) {
    return '';
  }

  const resolved = resolveApiRequestUrl(url, apiBaseUrl, runtimeOrigin);
  const base = parseApiBaseUrl(apiBaseUrl, runtimeOrigin);

  if (resolved && resolved.origin === base.origin) {
    const basePrefix = base.pathname === '/' ? '' : base.pathname;
    if (basePrefix && resolved.pathname.startsWith(`${basePrefix}/`)) {
      return resolved.pathname.slice(basePrefix.length) || '/';
    }
    if (basePrefix && resolved.pathname === basePrefix) {
      return '/';
    }
    return resolved.pathname;
  }

  const pathOnly = url.split(/[?#]/, 1)[0] || '';
  return pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
};

const getBackendOrigin = (): string => {
  const apiBaseUrl = getApiBaseUrl();

  if (ABSOLUTE_URL_PATTERN.test(apiBaseUrl)) {
    return trimTrailingSlash(apiBaseUrl.replace(/\/api(?:\/.*)?$/i, ''));
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
};

export const resolveBackendAssetUrl = (assetPath?: string): string => {
  if (!assetPath) {
    return '';
  }

  if (ABSOLUTE_URL_PATTERN.test(assetPath)) {
    return assetPath;
  }

  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  const origin = getBackendOrigin();

  return origin ? `${origin}${normalizedPath}` : normalizedPath;
};

export const toStorableBackendAssetPath = (assetPath?: string): string => {
  if (!assetPath) {
    return '';
  }

  const trimmed = assetPath.trim();
  if (!trimmed || !ABSOLUTE_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const backendOrigin = getBackendOrigin();

    if (backendOrigin && parsed.origin === backendOrigin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
};

export const getSocketServerUrl = (): string => {
  const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
  if (configuredSocketUrl) {
    return trimTrailingSlash(configuredSocketUrl);
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
};

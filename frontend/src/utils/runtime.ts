const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getApiBaseUrl = (): string => {
  const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
  return configuredApiUrl ? trimTrailingSlash(configuredApiUrl) : '/api/v1';
};

const getBackendOrigin = (): string => {
  const apiBaseUrl = getApiBaseUrl();

  if (ABSOLUTE_URL_PATTERN.test(apiBaseUrl)) {
    return trimTrailingSlash(apiBaseUrl.replace(/\/api(?:\/.*)?$/i, ''));
  }

  if (typeof window !== 'undefined') {
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

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
};

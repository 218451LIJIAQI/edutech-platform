const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

const normalizeHostname = (hostname: string): string =>
  hostname.trim().toLowerCase().replace(/^www\./, '');

export const parseSafeHttpUrl = (value?: string): URL | null => {
  const candidate = value?.trim();
  if (!candidate) {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    return HTTP_PROTOCOLS.has(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
};

export const normalizeSafeHttpUrl = (value?: string): string =>
  parseSafeHttpUrl(value)?.toString() || '';

export const normalizeSafeInternalPath = (value?: string): string => {
  const candidate = value?.trim() || '';

  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return '';
  }

  return candidate;
};

export const hasExactHostname = (url: URL | null, hostnames: string[]): boolean => {
  if (!url) {
    return false;
  }

  const normalizedHostname = normalizeHostname(url.hostname);

  return hostnames.some((hostname) => normalizedHostname === normalizeHostname(hostname));
};

export const getNormalizedHostname = (url: URL | null): string =>
  url ? normalizeHostname(url.hostname) : '';

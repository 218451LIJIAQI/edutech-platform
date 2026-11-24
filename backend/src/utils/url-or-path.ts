const UPLOADS_PREFIX_PATTERN = /^\/uploads(?:\/|$)/i;

export const safeDecodeURIComponent = (value: string): string | null => {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

const normalizePathSeparators = (value: string): string => {
  return value
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .trim();
};

export const normalizeAllowedFolders = (allowedFolders: string[]): string[] => {
  return allowedFolders
    .map((folder) => normalizePathSeparators(folder).toLowerCase())
    .filter(Boolean);
};

const hasUnsafePathSegment = (value: string): boolean => {
  return value
    .split("/")
    .filter(Boolean)
    .some((segment) => segment === "." || segment === "..");
};

export const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isRootRelativePath = (value: string): boolean => {
  return value.startsWith("/") && !value.startsWith("//");
};

const stripQueryAndHash = (value: string): string => {
  const queryIndex = value.indexOf("?");
  const hashIndex = value.indexOf("#");
  const cutIndex =
    queryIndex >= 0 && hashIndex >= 0
      ? Math.min(queryIndex, hashIndex)
      : queryIndex >= 0
        ? queryIndex
        : hashIndex;

  return cutIndex >= 0 ? value.slice(0, cutIndex) : value;
};

const resolveTrustedLocalUploadOrigins = (): Set<string> => {
  const origins = new Set<string>();
  const rawCandidates = [
    process.env.API_URL,
    process.env.BACKEND_URL,
    process.env.FRONTEND_URL,
    process.env.PUBLIC_URL,
    process.env.RENDER_EXTERNAL_URL,
    ...(process.env.ALLOWED_ORIGINS?.split(",") ?? []),
    ...(process.env.CORS_ORIGIN?.split(",") ?? []),
  ];

  for (const candidate of rawCandidates) {
    const trimmed = candidate?.trim();
    if (!trimmed) continue;
    try {
      origins.add(new URL(trimmed).origin.toLowerCase());
    } catch {
      // Ignore malformed env origin entries.
    }
  }

  return origins;
};

const isTrustedUploadUrlOrigin = (url: URL): boolean => {
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  ) {
    return true;
  }

  const trustedOrigins = resolveTrustedLocalUploadOrigins();
  return trustedOrigins.has(url.origin.toLowerCase());
};

export const isTrustedLocalUploadCandidate = (value: string): boolean => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return false;
  }

  if (isHttpUrl(trimmedValue)) {
    const parsedUrl = new URL(trimmedValue);
    if (!isTrustedUploadUrlOrigin(parsedUrl)) {
      return false;
    }
    const decodedPathname =
      safeDecodeURIComponent(parsedUrl.pathname) ?? parsedUrl.pathname;
    return (
      UPLOADS_PREFIX_PATTERN.test(parsedUrl.pathname) ||
      UPLOADS_PREFIX_PATTERN.test(decodedPathname)
    );
  }

  if (isRootRelativePath(trimmedValue)) {
    const stripped = stripQueryAndHash(trimmedValue);
    const decoded = safeDecodeURIComponent(stripped) ?? stripped;
    return (
      UPLOADS_PREFIX_PATTERN.test(stripped) ||
      UPLOADS_PREFIX_PATTERN.test(decoded)
    );
  }

  return false;
};

export const extractUploadPathFromUrlOrPath = (
  value: string,
): string | null => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  let pathname: string;

  if (isHttpUrl(trimmedValue)) {
    const parsedUrl = new URL(trimmedValue);
    if (!isTrustedUploadUrlOrigin(parsedUrl)) {
      return null;
    }
    pathname = parsedUrl.pathname;
  } else if (isRootRelativePath(trimmedValue)) {
    pathname = stripQueryAndHash(trimmedValue);
  } else {
    return null;
  }

  const decodedFullPathname = safeDecodeURIComponent(pathname);
  if (!decodedFullPathname) {
    return null;
  }

  const normalizedLeadingPathname = decodedFullPathname.replace(/\\/g, "/");
  if (!UPLOADS_PREFIX_PATTERN.test(normalizedLeadingPathname)) {
    return null;
  }

  const rawRelativePath = normalizedLeadingPathname.replace(
    /^\/uploads\/?/i,
    "",
  );

  if (!rawRelativePath) {
    return null;
  }

  const normalizedPath = normalizePathSeparators(rawRelativePath);

  if (!normalizedPath || hasUnsafePathSegment(normalizedPath)) {
    return null;
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const [folder, ...restSegments] = segments;
  return [folder.toLowerCase(), ...restSegments].join("/");
};

const isUploadPathWithinFolders = (
  uploadPath: string,
  allowedFolders: string[],
): boolean => {
  const normalizedAllowedFolders = normalizeAllowedFolders(allowedFolders);

  if (normalizedAllowedFolders.length === 0) {
    return false;
  }

  const normalizedUploadPath = normalizePathSeparators(uploadPath);

  if (!normalizedUploadPath || hasUnsafePathSegment(normalizedUploadPath)) {
    return false;
  }

  const segments = normalizedUploadPath.split("/").filter(Boolean);
  if (segments.length < 2) {
    return false;
  }

  const [folder] = segments;

  return (
    Boolean(folder) && normalizedAllowedFolders.includes(folder.toLowerCase())
  );
};

export const validateUrlOrUploadPathForFolders =
  (errorMessage: string, allowedFolders: string[]) =>
  (value: unknown): true => {
    if (value === undefined || value === null || value === "") {
      return true;
    }

    if (typeof value !== "string") {
      throw new Error(errorMessage);
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return true;
    }

    if (isHttpUrl(trimmedValue)) {
      const uploadPath = extractUploadPathFromUrlOrPath(trimmedValue);

      if (!uploadPath) {
        if (isTrustedLocalUploadCandidate(trimmedValue)) {
          throw new Error(errorMessage);
        }
        return true;
      }

      if (!isUploadPathWithinFolders(uploadPath, allowedFolders)) {
        throw new Error(errorMessage);
      }

      return true;
    }

    if (!isRootRelativePath(trimmedValue)) {
      throw new Error(errorMessage);
    }

    const uploadPath = extractUploadPathFromUrlOrPath(trimmedValue);

    if (!uploadPath || !isUploadPathWithinFolders(uploadPath, allowedFolders)) {
      throw new Error(errorMessage);
    }

    return true;
  };

export const ensureUrlOrUploadPathForFolders = (
  value: string,
  allowedFolders: string[],
  errorMessage: string,
): string => {
  validateUrlOrUploadPathForFolders(errorMessage, allowedFolders)(value);
  return value.trim();
};

export const normalizeOptionalUrlOrPath = (
  value: string | null | undefined,
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
};

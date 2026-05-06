const UPLOADS_SEGMENT = "/uploads/";

const safeDecodeURIComponent = (value: string): string | null => {
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

const normalizeAllowedFolders = (allowedFolders: string[]): string[] => {
  return allowedFolders
    .map((folder) => normalizePathSeparators(folder))
    .filter(Boolean);
};

const hasUnsafePathSegment = (value: string): boolean => {
  return value
    .split("/")
    .filter(Boolean)
    .some((segment) => segment === "." || segment === "..");
};

const isHttpUrl = (value: string): boolean => {
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

export const extractUploadPathFromUrlOrPath = (
  value: string,
): string | null => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  let pathname: string;

  if (isHttpUrl(trimmedValue)) {
    pathname = new URL(trimmedValue).pathname;
  } else if (isRootRelativePath(trimmedValue)) {
    pathname = trimmedValue;
  } else {
    return null;
  }

  if (!pathname.startsWith(UPLOADS_SEGMENT)) {
    return null;
  }

  const rawRelativePath = pathname.slice(UPLOADS_SEGMENT.length);

  if (!rawRelativePath) {
    return null;
  }

  const decodedPath = safeDecodeURIComponent(rawRelativePath);

  if (!decodedPath) {
    return null;
  }

  const normalizedPath = normalizePathSeparators(decodedPath);

  if (!normalizedPath || hasUnsafePathSegment(normalizedPath)) {
    return null;
  }

  return normalizedPath;
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

  const [folder] = normalizedUploadPath.split("/");

  return Boolean(folder) && normalizedAllowedFolders.includes(folder);
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

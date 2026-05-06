import api from '@/services/api';
import { downloadBlob, sanitizeFileName } from './download';
import { getApiBaseUrl, resolveBackendAssetUrl } from './runtime';
import { normalizeSafeHttpUrl, normalizeSafeInternalPath } from './safe-url';

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;
const UPLOADS_PATH_PREFIX = '/uploads/';
const TEACHER_CERTIFICATES_UPLOAD_FOLDER = 'teacher-certificates';
const PROTECTED_UPLOAD_FOLDERS = new Set([
  'documents',
  'verifications',
  'support-attachments',
  TEACHER_CERTIFICATES_UPLOAD_FOLDER,
]);

const getBackendAssetOrigin = (): string | undefined => {
  try {
    const runtimeOrigin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';

    return new URL(resolveBackendAssetUrl('/uploads/'), runtimeOrigin).origin;
  } catch {
    return undefined;
  }
};

const getApiUrlParts = (): { origin: string; pathname: string } | undefined => {
  try {
    const runtimeOrigin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsedApiUrl = ABSOLUTE_URL_PATTERN.test(getApiBaseUrl())
      ? new URL(getApiBaseUrl())
      : new URL(getApiBaseUrl(), runtimeOrigin);

    return {
      origin: parsedApiUrl.origin,
      pathname: parsedApiUrl.pathname.replace(/\/+$/, '') || '/',
    };
  } catch {
    return undefined;
  }
};

const isPathInsideBase = (pathname: string, basePathname: string): boolean => {
  if (basePathname === '/') {
    return pathname.startsWith('/');
  }

  return pathname === basePathname || pathname.startsWith(`${basePathname}/`);
};

const getUploadFolder = (assetUrl: string): string | undefined => {
  const trimmedUrl = assetUrl.trim();
  let pathname: string;

  if (!trimmedUrl) {
    return undefined;
  }

  try {
    if (ABSOLUTE_URL_PATTERN.test(trimmedUrl)) {
      const parsedUrl = new URL(trimmedUrl);
      const backendOrigin = getBackendAssetOrigin();

      if (backendOrigin && parsedUrl.origin !== backendOrigin) {
        return undefined;
      }

      pathname = parsedUrl.pathname;
    } else {
      pathname = trimmedUrl;
    }
  } catch {
    return undefined;
  }

  if (!pathname.startsWith('/') || pathname.startsWith('//')) {
    return undefined;
  }

  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }

  const normalizedPathname = decodedPathname.replace(/\\/g, '/');
  if (!normalizedPathname.startsWith(UPLOADS_PATH_PREFIX)) {
    return undefined;
  }

  return normalizedPathname
    .slice(UPLOADS_PATH_PREFIX.length)
    .split('/')
    .filter(Boolean)[0]
    ?.toLowerCase();
};

export const isProtectedUploadAssetUrl = (assetUrl?: string): boolean => {
  if (!assetUrl) {
    return false;
  }

  const uploadFolder = getUploadFolder(assetUrl);
  return Boolean(uploadFolder && PROTECTED_UPLOAD_FOLDERS.has(uploadFolder));
};

export const buildTeacherCertificateAssetAccessUrl = (
  assetUrl: string
): string => {
  const trimmedUrl = assetUrl.trim();
  const uploadFolder = getUploadFolder(trimmedUrl);

  if (uploadFolder !== TEACHER_CERTIFICATES_UPLOAD_FOLDER) {
    return normalizeSafeHttpUrl(trimmedUrl) || normalizeSafeInternalPath(trimmedUrl);
  }

  return resolveBackendAssetUrl(
    `${getApiBaseUrl()}/teachers/certificate-assets?url=${encodeURIComponent(
      trimmedUrl
    )}`
  );
};

const isProtectedBackendAssetUrl = (assetUrl: string): boolean => {
  const trimmedUrl = assetUrl.trim();
  const apiUrl = getApiUrlParts();

  if (!apiUrl || !trimmedUrl) {
    return false;
  }

  if (!ABSOLUTE_URL_PATTERN.test(trimmedUrl)) {
    const safeInternalPath = normalizeSafeInternalPath(trimmedUrl);
    return Boolean(
      safeInternalPath && isPathInsideBase(safeInternalPath, apiUrl.pathname)
    );
  }

  try {
    const parsedAssetUrl = new URL(trimmedUrl);
    return (
      parsedAssetUrl.origin === apiUrl.origin &&
      isPathInsideBase(parsedAssetUrl.pathname, apiUrl.pathname)
    );
  } catch {
    return false;
  }
};

const parseContentDispositionFilename = (
  contentDispositionHeader?: string
): string | undefined => {
  if (!contentDispositionHeader) {
    return undefined;
  }

  const utf8Match = contentDispositionHeader.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return sanitizeFileName(decodeURIComponent(utf8Match[1]));
    } catch {
      // Fall through to basic filename parsing.
    }
  }

  const quotedMatch = contentDispositionHeader.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return sanitizeFileName(quotedMatch[1]);
  }

  const plainMatch = contentDispositionHeader.match(/filename=([^;]+)/i);
  if (plainMatch?.[1]) {
    return sanitizeFileName(plainMatch[1].trim());
  }

  return undefined;
};

const openDirectAsset = (assetUrl: string): void => {
  if (typeof window === 'undefined') {
    throw new Error('Opening files is not supported in this environment');
  }

  const safeAssetUrl =
    normalizeSafeHttpUrl(assetUrl) || normalizeSafeInternalPath(assetUrl);

  if (!safeAssetUrl) {
    throw new Error('File URL is not safe to open');
  }

  const openedWindow = window.open(safeAssetUrl, '_blank', 'noopener,noreferrer');
  if (!openedWindow) {
    throw new Error('Unable to open file. Please allow pop-ups and try again.');
  }
};

const openBlobInNewTab = (blob: Blob): void => {
  if (typeof window === 'undefined' || typeof URL === 'undefined') {
    throw new Error('Opening files is not supported in this environment');
  }

  const blobUrl = URL.createObjectURL(blob);
  const openedWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');

  if (!openedWindow) {
    URL.revokeObjectURL(blobUrl);
    throw new Error('Unable to open file. Please allow pop-ups and try again.');
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60000);
};

export const downloadProtectedAsset = async (
  assetUrl: string,
  fallbackFileName: string
): Promise<void> => {
  if (!assetUrl.trim()) {
    throw new Error('File URL is required');
  }

  if (!isProtectedBackendAssetUrl(assetUrl)) {
    openDirectAsset(assetUrl);
    return;
  }

  const response = await api.get<Blob>(assetUrl, {
    responseType: 'blob',
  });
  const contentDispositionHeader = response.headers['content-disposition'];
  const fileName =
    parseContentDispositionFilename(contentDispositionHeader) ||
    sanitizeFileName(fallbackFileName);

  downloadBlob(response.data, fileName);
};

export const openProtectedAsset = async (assetUrl: string): Promise<void> => {
  if (!assetUrl.trim()) {
    throw new Error('File URL is required');
  }

  if (!isProtectedBackendAssetUrl(assetUrl)) {
    openDirectAsset(assetUrl);
    return;
  }

  const response = await api.get<Blob>(assetUrl, {
    responseType: 'blob',
  });

  openBlobInNewTab(response.data);
};

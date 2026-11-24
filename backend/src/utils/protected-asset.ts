import fs from "fs";
import path from "path";
import type { Response } from "express";
import config from "../config/env";
import { BadRequestError, NotFoundError, ValidationError } from "./errors";
import {
  extractUploadPathFromUrlOrPath,
  isHttpUrl,
  isTrustedLocalUploadCandidate,
  normalizeAllowedFolders,
  safeDecodeURIComponent,
} from "./url-or-path";

const DEFAULT_FILENAME = "file";

interface ProtectedAssetDescriptor {
  filename: string;
  absolutePath?: string;
  redirectUrl?: string;
}

const sanitizeFilename = (value: string): string => {
  return (
    value
      .replace(/[\\/:*?"<>|\r\n]+/g, "-")
      .replace(/\s+/g, " ")
      .trim() || DEFAULT_FILENAME
  );
};

const toAsciiFallbackFilename = (filename: string): string => {
  return (
    filename
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/[\\/:*?"<>|\r\n]+/g, "-")
      .trim() || DEFAULT_FILENAME
  );
};

const encodeRFC5987Value = (value: string): string => {
  return encodeURIComponent(value).replace(/['()*]/g, (character) => {
    return `%${character.charCodeAt(0).toString(16).toUpperCase()}`;
  });
};

const getSourceFilename = (value: string): string => {
  const trimmedValue = value.trim();

  if (isHttpUrl(trimmedValue)) {
    try {
      const pathname = new URL(trimmedValue).pathname;
      const decodedPathname = safeDecodeURIComponent(pathname) ?? pathname;
      return sanitizeFilename(path.posix.basename(decodedPathname));
    } catch {
      return DEFAULT_FILENAME;
    }
  }

  const decodedPath = safeDecodeURIComponent(trimmedValue) ?? trimmedValue;
  return sanitizeFilename(path.basename(decodedPath));
};

const getFilenameFromSource = (
  value: string,
  fallbackFileName?: string,
): string => {
  const sourceFilename = getSourceFilename(value);

  if (!fallbackFileName) {
    return sourceFilename;
  }

  const normalizedFallback = sanitizeFilename(fallbackFileName);

  if (path.extname(normalizedFallback)) {
    return normalizedFallback;
  }

  const sourceExtension = path.extname(sourceFilename);

  return sourceExtension
    ? `${normalizedFallback}${sourceExtension}`
    : normalizedFallback;
};

const getExistingFileStats = (absoluteFilePath: string): fs.Stats => {
  try {
    return fs.statSync(absoluteFilePath);
  } catch {
    throw new NotFoundError("File not found");
  }
};

const applyProtectedAssetHeaders = (
  res: Response,
  options?: {
    disposition?: "inline" | "attachment";
    filename?: string;
  },
): void => {
  res.setHeader(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate, max-age=0",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (options?.filename) {
    const disposition = options.disposition ?? "attachment";
    const filename = sanitizeFilename(options.filename);
    const fallbackFilename = toAsciiFallbackFilename(filename);

    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${fallbackFilename}"; filename*=UTF-8''${encodeRFC5987Value(
        filename,
      )}`,
    );
  }
};

export const sendProtectedAsset = (
  res: Response,
  asset: ProtectedAssetDescriptor,
  options: {
    disposition: "inline" | "attachment";
    unavailableMessage: string;
  },
): void => {
  if (asset.redirectUrl) {
    applyProtectedAssetHeaders(res);
    res.redirect(asset.redirectUrl);
    return;
  }

  if (!asset.absolutePath) {
    throw new BadRequestError(options.unavailableMessage);
  }

  applyProtectedAssetHeaders(res, {
    disposition: options.disposition,
    filename: asset.filename,
  });

  if (options.disposition === "attachment") {
    res.download(asset.absolutePath, asset.filename);
    return;
  }

  res.sendFile(asset.absolutePath);
};

export const buildProtectedAssetDescriptor = (
  fileUrl: string,
  options: {
    allowedFolders: string[];
    fallbackFileName?: string;
  },
): ProtectedAssetDescriptor => {
  const trimmedFileUrl = fileUrl.trim();

  if (!trimmedFileUrl) {
    throw new ValidationError("File URL is required");
  }

  const allowedFolders = normalizeAllowedFolders(options.allowedFolders);

  if (allowedFolders.length === 0) {
    throw new ValidationError("At least one allowed upload folder is required");
  }

  const uploadPath = extractUploadPathFromUrlOrPath(trimmedFileUrl);

  if (!uploadPath) {
    if (isTrustedLocalUploadCandidate(trimmedFileUrl)) {
      throw new ValidationError("Invalid upload file path");
    }

    if (!isHttpUrl(trimmedFileUrl)) {
      throw new ValidationError(
        "File URL must be a valid HTTP URL or upload path",
      );
    }

    return {
      filename: getFilenameFromSource(trimmedFileUrl, options.fallbackFileName),
      redirectUrl: trimmedFileUrl,
    };
  }

  const normalizedUploadPath = uploadPath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();

  const segments = normalizedUploadPath.split("/").filter(Boolean);
  const folder = segments[0]?.toLowerCase();

  if (!folder || segments.length < 2 || !allowedFolders.includes(folder)) {
    throw new ValidationError(
      "File URL points to an unsupported upload folder",
    );
  }

  const absoluteUploadDir = path.resolve(config.UPLOAD_DIR);
  const absoluteFilePath = path.resolve(
    absoluteUploadDir,
    normalizedUploadPath,
  );

  const expectedPrefix = `${absoluteUploadDir}${path.sep}`;

  if (
    absoluteFilePath === absoluteUploadDir ||
    !absoluteFilePath.startsWith(expectedPrefix)
  ) {
    throw new ValidationError("Invalid upload file path");
  }

  const fileStats = getExistingFileStats(absoluteFilePath);

  if (!fileStats.isFile()) {
    throw new NotFoundError("File not found");
  }

  let realUploadDir: string;
  let realFilePath: string;

  try {
    realUploadDir = fs.realpathSync(absoluteUploadDir);
    realFilePath = fs.realpathSync(absoluteFilePath);
  } catch {
    throw new NotFoundError("File not found");
  }

  const realExpectedPrefix = `${realUploadDir}${path.sep}`;

  if (
    realFilePath === realUploadDir ||
    !realFilePath.startsWith(realExpectedPrefix)
  ) {
    throw new ValidationError("Invalid upload file path");
  }

  return {
    filename: getFilenameFromSource(
      normalizedUploadPath,
      options.fallbackFileName,
    ),
    absolutePath: absoluteFilePath,
  };
};

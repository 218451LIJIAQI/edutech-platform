import type { Request } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";

import config from "../config/env";
import { ValidationError } from "../utils/errors";

const MB = 1024 * 1024;
const MAX_FILENAME_LENGTH = 100;
const FILE_SIGNATURE_READ_BYTES = 64;

const uploadRootDir = path.resolve(config.UPLOAD_DIR);

if (!fs.existsSync(uploadRootDir)) {
  fs.mkdirSync(uploadRootDir, { recursive: true });
}

export type UploadCategory =
  | "general"
  | "support-attachments"
  | "community-images"
  | "thumbnails"
  | "videos"
  | "documents"
  | "avatars"
  | "verifications"
  | "teacher-profiles"
  | "teacher-certificates";

type UploadCategoryConfig = {
  directory: UploadCategory;
  maxSize: number;
  allowedMimeTypes: ReadonlySet<string>;
  allowedExtensions: ReadonlySet<string>;
};

type CategorizedMulterFile = Express.Multer.File & {
  resolvedUploadCategory?: UploadCategory;
};

const uploadCategoryConfigs: Record<UploadCategory, UploadCategoryConfig> = {
  general: {
    directory: "general",
    maxSize: 10 * MB,
    allowedMimeTypes: new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ]),
    allowedExtensions: new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]),
  },

  "support-attachments": {
    directory: "support-attachments",
    maxSize: 10 * MB,
    allowedMimeTypes: new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ]),
    allowedExtensions: new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]),
  },

  "community-images": {
    directory: "community-images",
    maxSize: 10 * MB,
    allowedMimeTypes: new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ]),
    allowedExtensions: new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".avif",
    ]),
  },

  thumbnails: {
    directory: "thumbnails",
    maxSize: 5 * MB,
    allowedMimeTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
    allowedExtensions: new Set([".jpg", ".jpeg", ".png", ".webp"]),
  },

  videos: {
    directory: "videos",
    maxSize: 500 * MB,
    allowedMimeTypes: new Set(["video/mp4", "video/webm", "video/quicktime"]),
    allowedExtensions: new Set([".mp4", ".webm", ".mov"]),
  },

  documents: {
    directory: "documents",
    maxSize: 50 * MB,
    allowedMimeTypes: new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/octet-stream",
      "application/zip",
      "application/x-zip-compressed",
      "text/plain",
    ]),
    allowedExtensions: new Set([
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".zip",
      ".txt",
    ]),
  },

  avatars: {
    directory: "avatars",
    maxSize: 5 * MB,
    allowedMimeTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
    allowedExtensions: new Set([".jpg", ".jpeg", ".png", ".webp"]),
  },

  verifications: {
    directory: "verifications",
    maxSize: 10 * MB,
    allowedMimeTypes: new Set(["image/jpeg", "image/png", "application/pdf"]),
    allowedExtensions: new Set([".jpg", ".jpeg", ".png", ".pdf"]),
  },

  "teacher-profiles": {
    directory: "teacher-profiles",
    maxSize: 5 * MB,
    allowedMimeTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
    allowedExtensions: new Set([".jpg", ".jpeg", ".png", ".webp"]),
  },

  "teacher-certificates": {
    directory: "teacher-certificates",
    maxSize: 10 * MB,
    allowedMimeTypes: new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ]),
    allowedExtensions: new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]),
  },
};

const uploadCategoryAliases: Record<string, UploadCategory> = {
  general: "general",
  file: "general",
  files: "general",

  avatar: "avatars",
  avatars: "avatars",

  document: "documents",
  documents: "documents",
  doc: "documents",
  docs: "documents",

  image: "general",
  images: "general",

  thumbnail: "thumbnails",
  thumbnails: "thumbnails",

  video: "videos",
  videos: "videos",

  verification: "verifications",
  verifications: "verifications",

  "support-attachment": "support-attachments",
  "support-attachments": "support-attachments",

  "community-image": "community-images",
  "community-images": "community-images",

  "teacher-profile": "teacher-profiles",
  "teacher-profiles": "teacher-profiles",

  "teacher-certificate": "teacher-certificates",
  "teacher-certificates": "teacher-certificates",
};

const allowedUploadFolders = Object.keys(uploadCategoryConfigs).join(", ");

const getEffectiveMaxSize = (uploadConfig: UploadCategoryConfig): number => {
  return Math.min(uploadConfig.maxSize, config.MAX_FILE_SIZE);
};

const formatFileSizeForMessage = (bytes: number): string => {
  if (bytes >= MB) {
    return `${Math.floor(bytes / MB)}MB`;
  }

  return `${Math.max(1, Math.floor(bytes / 1024))}KB`;
};

const getFirstStringInput = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    return getFirstStringInput(value[0]);
  }

  return undefined;
};

const getUploadCategoryInput = (
  req: Request,
  file: Express.Multer.File,
): string => {
  const requestedBodyFolder =
    req.body && typeof req.body === "object"
      ? getFirstStringInput(req.body.folder)
      : undefined;
  const requestedQueryFolder = getFirstStringInput(req.query?.folder);

  return (
    requestedBodyFolder || requestedQueryFolder || file.fieldname || "general"
  );
};

const isUploadCategory = (value: string): value is UploadCategory => {
  return Object.prototype.hasOwnProperty.call(uploadCategoryConfigs, value);
};

const setResolvedUploadCategory = (
  file: Express.Multer.File,
  category: UploadCategory,
): void => {
  (file as CategorizedMulterFile).resolvedUploadCategory = category;
};

const getResolvedUploadCategory = (
  file: Express.Multer.File,
): UploadCategory | undefined => {
  const storedCategory = (file as CategorizedMulterFile).resolvedUploadCategory;

  if (storedCategory) {
    return storedCategory;
  }

  if (!file.destination) {
    return undefined;
  }

  const relativeDestination = path.relative(
    uploadRootDir,
    path.resolve(file.destination),
  );

  if (
    !relativeDestination ||
    relativeDestination.startsWith("..") ||
    path.isAbsolute(relativeDestination)
  ) {
    return undefined;
  }

  const [directory] = relativeDestination.split(path.sep);

  return directory && isUploadCategory(directory) ? directory : undefined;
};

export const resolveUploadCategory = (
  input: string | undefined,
): UploadCategory => {
  const normalized = (input || "").trim().toLowerCase();

  if (!normalized) {
    return "general";
  }

  const category = uploadCategoryAliases[normalized];

  if (!category) {
    throw new ValidationError(
      `Unsupported upload folder. Allowed folders: ${allowedUploadFolders}`,
    );
  }

  return category;
};

export const getUploadCategoryConfig = (
  req: Request,
  file: Express.Multer.File,
): UploadCategoryConfig => {
  const category = resolveUploadCategory(getUploadCategoryInput(req, file));
  setResolvedUploadCategory(file, category);

  return uploadCategoryConfigs[category];
};

const ensureSafeUploadPath = (directory: string): string => {
  const destinationPath = path.resolve(uploadRootDir, directory);

  if (
    destinationPath !== uploadRootDir &&
    !destinationPath.startsWith(`${uploadRootDir}${path.sep}`)
  ) {
    throw new ValidationError("Invalid upload destination");
  }

  if (!fs.existsSync(destinationPath)) {
    fs.mkdirSync(destinationPath, { recursive: true });
  }

  return destinationPath;
};

const sanitizeBaseName = (name: string): string => {
  const sanitized = name
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_FILENAME_LENGTH);

  return sanitized || "file";
};

const getSafeExtension = (originalName: string): string => {
  return path.extname(originalName).toLowerCase();
};

const createStoredFileName = (originalName: string): string => {
  const extension = getSafeExtension(originalName);
  const baseName = sanitizeBaseName(path.basename(originalName, extension));
  const uniqueId = crypto.randomUUID();

  return `${baseName}-${uniqueId}${extension}`;
};

const validateFileType = (
  file: Express.Multer.File,
  uploadConfig: UploadCategoryConfig,
): void => {
  const extension = getSafeExtension(file.originalname);

  const isAllowedMimeType = uploadConfig.allowedMimeTypes.has(file.mimetype);
  const isAllowedExtension = uploadConfig.allowedExtensions.has(extension);

  if (!isAllowedMimeType || !isAllowedExtension) {
    throw new ValidationError(
      `Unsupported file type for ${uploadConfig.directory}. Allowed formats: ${Array.from(
        uploadConfig.allowedExtensions,
      ).join(", ")}`,
    );
  }
};

const readFileHeader = (filePath: string): Buffer => {
  const fileDescriptor = fs.openSync(filePath, "r");

  try {
    const buffer = Buffer.alloc(FILE_SIGNATURE_READ_BYTES);
    const bytesRead = fs.readSync(
      fileDescriptor,
      buffer,
      0,
      FILE_SIGNATURE_READ_BYTES,
      0,
    );

    return buffer.subarray(0, bytesRead);
  } finally {
    fs.closeSync(fileDescriptor);
  }
};

const hasSignature = (
  header: Buffer,
  signature: readonly number[],
): boolean => {
  if (header.length < signature.length) {
    return false;
  }

  return signature.every((byte, index) => header[index] === byte);
};

const hasAsciiAt = (header: Buffer, offset: number, value: string): boolean => {
  if (header.length < offset + value.length) {
    return false;
  }

  return (
    header.subarray(offset, offset + value.length).toString("ascii") === value
  );
};

const hasFtypBrand = (header: Buffer, brands: readonly string[]): boolean => {
  if (!hasAsciiAt(header, 4, "ftyp")) {
    return false;
  }

  const brandBlock = header
    .subarray(8, Math.min(header.length, 32))
    .toString("ascii");
  return brands.some((brand) => brandBlock.includes(brand));
};

const looksLikePlainText = (header: Buffer): boolean => {
  if (header.length === 0) {
    return true;
  }

  return !header.includes(0x00);
};

const hasZipSignature = (header: Buffer): boolean => {
  return (
    hasSignature(header, [0x50, 0x4b, 0x03, 0x04]) ||
    hasSignature(header, [0x50, 0x4b, 0x05, 0x06]) ||
    hasSignature(header, [0x50, 0x4b, 0x07, 0x08])
  );
};

const hasExpectedFileSignature = (
  extension: string,
  header: Buffer,
): boolean => {
  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return hasSignature(header, [0xff, 0xd8, 0xff]);

    case ".png":
      return hasSignature(
        header,
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      );

    case ".webp":
      return hasAsciiAt(header, 0, "RIFF") && hasAsciiAt(header, 8, "WEBP");

    case ".gif":
      return hasAsciiAt(header, 0, "GIF87a") || hasAsciiAt(header, 0, "GIF89a");

    case ".avif":
      return hasFtypBrand(header, ["avif", "avis"]);

    case ".pdf":
      return hasAsciiAt(header, 0, "%PDF-");

    case ".doc":
    case ".xls":
    case ".ppt":
      return hasSignature(
        header,
        [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
      );

    case ".docx":
    case ".xlsx":
    case ".pptx":
    case ".zip":
      return hasZipSignature(header);

    case ".txt":
      return looksLikePlainText(header);

    case ".mp4":
    case ".mov":
      return hasFtypBrand(header, [
        "isom",
        "iso2",
        "mp41",
        "mp42",
        "avc1",
        "qt  ",
      ]);

    case ".webm":
      return hasSignature(header, [0x1a, 0x45, 0xdf, 0xa3]);

    default:
      return true;
  }
};

const validateFileSignature = (file: Express.Multer.File): void => {
  const extension = getSafeExtension(file.originalname);

  try {
    const header = readFileHeader(file.path);

    if (!hasExpectedFileSignature(extension, header)) {
      throw new ValidationError(
        "Uploaded file content does not match its declared file type",
      );
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    throw new ValidationError("Unable to verify uploaded file content");
  }
};

export const validateStoredUpload = (file: Express.Multer.File) => {
  const category =
    getResolvedUploadCategory(file) || resolveUploadCategory(file.fieldname);
  const uploadConfig = uploadCategoryConfigs[category];

  validateFileType(file, uploadConfig);
  validateFileSignature(file);

  const effectiveMaxSize = getEffectiveMaxSize(uploadConfig);

  if (file.size > effectiveMaxSize) {
    throw new ValidationError(
      `${category} uploads must be ${formatFileSizeForMessage(effectiveMaxSize)} or smaller`,
    );
  }

  return {
    category,
    ...uploadConfig,
  };
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    try {
      const uploadConfig = getUploadCategoryConfig(req, file);
      const destinationPath = ensureSafeUploadPath(uploadConfig.directory);

      callback(null, destinationPath);
    } catch (error) {
      callback(error as Error, uploadRootDir);
    }
  },

  filename: (_req, file, callback) => {
    callback(null, createStoredFileName(file.originalname));
  },
});

export const uploadAny = multer({
  storage,

  limits: {
    fileSize: Math.max(
      ...Object.values(uploadCategoryConfigs).map((categoryConfig) =>
        getEffectiveMaxSize(categoryConfig),
      ),
    ),
    files: 10,
  },

  fileFilter: (req, file, callback) => {
    try {
      const uploadConfig = getUploadCategoryConfig(req, file);
      validateFileType(file, uploadConfig);

      callback(null, true);
    } catch (error) {
      callback(error as Error);
    }
  },
});

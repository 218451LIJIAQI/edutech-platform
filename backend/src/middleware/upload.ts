import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { Request } from 'express';
import config from '../config/env';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';

// Ensure upload directory exists (absolute path resolved in env config)
const uploadDir = config.UPLOAD_DIR;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const resolveSubDir = (fieldname: string): string => {
  const normalized = String(fieldname || '').toLowerCase();
  switch (normalized) {
    case 'avatar':
    case 'image':
    case 'thumbnail':
      return 'images';
    case 'video':
      return 'videos';
    case 'document':
    case 'doc':
    case 'file':
      return 'documents';
    default:
      return 'misc';
  }
};

const sanitizeBaseName = (name: string): string =>
  name.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 100);

// Define storage configuration
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const subDir = resolveSubDir(file.fieldname);
    const destPath = path.join(uploadDir, subDir);

    // Create subdirectory if it doesn't exist
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }

    cb(null, destPath);
  },
  filename: (_req, file, cb) => {
    const unique = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    const base = sanitizeBaseName(path.basename(file.originalname, ext) || 'file');
    cb(null, `${base}-${unique}${ext}`);
  },
});

// File filter helper to check both extension and mimetype
const createFileFilter = (allowedExts: string[], allowedMimes: string[]) => {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    const ok = allowedExts.includes(ext) && allowedMimes.includes(mime);
    if (ok) return cb(null, true);
    return cb(
      new ValidationError(
        `Invalid file type. Allowed extensions: ${allowedExts.join(', ')}; Allowed mimetypes: ${allowedMimes.join(', ')}`
      )
    );
  };
};

// Predefined upload configurations
const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const imageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
const videoMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];

const docExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'];
const docMimes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

/**
 * Upload configuration for images (avatars, thumbnails)
 */
export const uploadImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter: createFileFilter(imageExts, imageMimes),
});

/**
 * Upload configuration for videos
 */
export const uploadVideo = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE, // up to configured size (default 50MB)
    files: 1,
  },
  fileFilter: createFileFilter(videoExts, videoMimes),
});

/**
 * Upload configuration for documents (PDFs, Word docs, etc.)
 */
export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: createFileFilter(docExts, docMimes),
});

/**
 * Generic upload configuration for any file type
 */
export const uploadAny = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
  },
});

/**
 * Helper function to delete uploaded file
 */
export const deleteFile = (filePath: string): void => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to delete file', { filePath, error: error.message });
    }
  }
};

export default {
  uploadImage,
  uploadVideo,
  uploadDocument,
  uploadAny,
  deleteFile,
};

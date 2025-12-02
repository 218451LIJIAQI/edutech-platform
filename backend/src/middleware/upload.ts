import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import config from '../config/env';

// Ensure upload directory exists (absolute path resolved in env config)
const uploadDir = config.UPLOAD_DIR;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const resolveSubDir = (fieldname: string): string => {
  const normalized = (fieldname || '').toLowerCase();
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

/**
 * Generic upload configuration for any file type
 */
export const uploadAny = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
  },
});

export default { uploadAny };

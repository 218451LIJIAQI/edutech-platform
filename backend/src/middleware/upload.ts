import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import config from '../config/env';
import { ValidationError } from '../utils/errors';

// Ensure upload directory exists
import fs from 'fs';
const uploadDir = config.UPLOAD_DIR;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Define storage configuration
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const subDir = file.fieldname; // e.g., 'avatar', 'video', 'document'
    const destPath = path.join(uploadDir, subDir);
    
    // Create subdirectory if it doesn't exist
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    
    cb(null, destPath);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

// File filter for different types
const createFileFilter = (allowedTypes: string[]) => {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }
  };
};

// Predefined upload configurations

/**
 * Upload configuration for images (avatars, thumbnails)
 */
export const uploadImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: createFileFilter(['.jpg', '.jpeg', '.png', '.gif', '.webp']),
});

/**
 * Upload configuration for videos
 */
export const uploadVideo = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE, // 50MB or configured size
  },
  fileFilter: createFileFilter(['.mp4', '.mov', '.avi', '.mkv', '.webm']),
});

/**
 * Upload configuration for documents (PDFs, Word docs, etc.)
 */
export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: createFileFilter([
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.txt',
  ]),
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
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // Log error silently, don't throw as this is a cleanup operation
    if (error instanceof Error) {
      // In production, this should use the logger
      // For now, we'll just skip console.error
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


import { Router } from 'express';
import uploadController from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';
import { uploadAny } from '../middleware/upload';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

/**
 * Upload Routes
 * All routes require authentication
 */

// Single file upload
router.post(
  '/',
  authenticate,
  uploadAny.single('file'),
  asyncHandler(uploadController.uploadFile)
);

// Multiple files upload
router.post(
  '/multiple',
  authenticate,
  uploadAny.array('files', 10),
  asyncHandler(uploadController.uploadMultipleFiles)
);

export default router;

import { Router } from 'express';
import uploadController from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';
import { uploadAny } from '../middleware/upload';

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
  uploadController.uploadFile
);

// Multiple files upload
router.post(
  '/multiple',
  authenticate,
  uploadAny.array('files', 10),
  uploadController.uploadMultipleFiles
);

export default router;

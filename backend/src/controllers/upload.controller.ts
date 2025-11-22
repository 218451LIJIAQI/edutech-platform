import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { ValidationError } from '../utils/errors';

/**
 * Upload Controller
 * Handles file upload endpoints
 */
class UploadController {
  /**
   * Upload a single file
   * POST /api/v1/upload
   */
  uploadFile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    const file = req.file;
    const folder = req.body.folder || 'general';

    // Generate public URL
    const fileUrl = `/uploads/${folder}/${file.filename}`;

    res.status(200).json({
      status: 'success',
      message: 'File uploaded successfully',
      data: {
        url: fileUrl,
        filename: file.filename,
        size: file.size,
        mimeType: file.mimetype,
        originalName: file.originalname,
      },
    });
  });

  /**
   * Upload multiple files
   * POST /api/v1/upload/multiple
   */
  uploadMultipleFiles = asyncHandler(async (req: Request, res: Response) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new ValidationError('No files uploaded');
    }

    const files = req.files as Express.Multer.File[];
    const folder = req.body.folder || 'general';

    const uploadedFiles = files.map((file) => ({
      url: `/uploads/${folder}/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype,
      originalName: file.originalname,
    }));

    res.status(200).json({
      status: 'success',
      message: `${files.length} files uploaded successfully`,
      data: uploadedFiles,
    });
  });
}

export default new UploadController();


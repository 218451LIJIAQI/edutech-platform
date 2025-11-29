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
    
    if (!file.filename) {
      throw new ValidationError('File upload failed: missing filename');
    }

    // Derive subfolder from fieldname to match storage config (e.g., multer field)
    const folder = file.fieldname || 'file';

    // Public URL relative to static uploads root
    const fileUrl = `/uploads/${folder}/${file.filename}`;

    res.status(201).json({
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
    // Multer can provide files as an array or a dictionary of arrays by field name
    const rawFiles = (req.files ?? []) as
      | Express.Multer.File[]
      | Record<string, Express.Multer.File[]>;

    const filesArray: Express.Multer.File[] = Array.isArray(rawFiles)
      ? rawFiles
      : Object.values(rawFiles).flat();

    if (!filesArray.length) {
      throw new ValidationError('No files uploaded');
    }

    const uploadedFiles = filesArray
      .filter((file) => file.filename) // Filter out files without filename
      .map((file) => {
        const folder = file.fieldname || 'file';
        return {
          url: `/uploads/${folder}/${file.filename}`,
          filename: file.filename!,
          size: file.size,
          mimeType: file.mimetype,
          originalName: file.originalname,
        };
      });

    res.status(201).json({
      status: 'success',
      message: `${filesArray.length} files uploaded successfully`,
      data: uploadedFiles,
    });
  });
}

export default new UploadController();

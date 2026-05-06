import fs from "fs/promises";
import { Request, Response } from "express";
import asyncHandler from "../utils/async-handler";
import { ValidationError } from "../utils/errors";
import {
  resolveUploadCategory,
  validateStoredUpload,
  type UploadCategory,
} from "../middleware/upload";

/**
 * Upload Controller
 * Handles file upload endpoints.
 */

type UploadedFileResponse = {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  originalName: string;
};

const sendSuccess = (
  res: Response,
  data: unknown,
  message: string,
  statusCode = 201,
) => {
  res.status(statusCode).json({
    status: "success",
    message,
    data,
  });
};

const normalizeMulterFiles = (
  files: Request["files"],
): Express.Multer.File[] => {
  if (!files) return [];

  if (Array.isArray(files)) {
    return files;
  }

  return Object.values(files).flat();
};

const buildUploadUrl = (directory: string, filename: string): string => {
  return `/uploads/${encodeURIComponent(directory)}/${encodeURIComponent(filename)}`;
};

const sanitizeFileDisplayName = (value: string): string => {
  const displayName = value
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/[<>:"|?*\\/]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return displayName || "file";
};

const getFirstString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    return getFirstString(value[0]);
  }

  return undefined;
};

const getRequestedUploadFolder = (req: Request): string | undefined => {
  return getFirstString(req.body?.folder) || getFirstString(req.query?.folder);
};

class UploadController {
  private async cleanupUploadedFiles(files: Express.Multer.File[]) {
    await Promise.allSettled(
      files
        .map((file) => file.path)
        .filter((filePath): filePath is string => Boolean(filePath))
        .map(async (filePath) => {
          await fs.unlink(filePath);
        }),
    );
  }

  private assertRequestedFolderMatchesStoredFile(
    req: Request,
    storedCategory: UploadCategory,
  ): void {
    const requestedFolder = getRequestedUploadFolder(req);

    if (!requestedFolder) {
      return;
    }

    const requestedCategory = resolveUploadCategory(requestedFolder);

    if (requestedCategory !== storedCategory) {
      throw new ValidationError(
        "Upload folder must be sent before the file field or as a folder query parameter so the file can be stored in the requested folder",
      );
    }
  }

  private buildUploadedFileResponse(
    req: Request,
    file: Express.Multer.File,
  ): UploadedFileResponse {
    if (!file.filename || file.filename.trim().length === 0) {
      throw new ValidationError("File upload failed: missing filename");
    }

    const uploadMeta = validateStoredUpload(file);
    this.assertRequestedFolderMatchesStoredFile(req, uploadMeta.category);

    return {
      url: buildUploadUrl(uploadMeta.directory, file.filename),
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype,
      originalName: sanitizeFileDisplayName(file.originalname),
    };
  }

  /**
   * Upload a single file.
   * POST /api/v1/upload
   */
  uploadFile = asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;

    if (!file) {
      throw new ValidationError("No file uploaded");
    }

    try {
      const uploadedFile = this.buildUploadedFileResponse(req, file);

      sendSuccess(res, uploadedFile, "File uploaded successfully");
    } catch (error) {
      await this.cleanupUploadedFiles([file]);
      throw error;
    }
  });

  /**
   * Upload multiple files.
   * POST /api/v1/upload/multiple
   */
  uploadMultipleFiles = asyncHandler(async (req: Request, res: Response) => {
    const files = normalizeMulterFiles(req.files);

    if (files.length === 0) {
      throw new ValidationError("No files uploaded");
    }

    try {
      const uploadedFiles = files.map((file) =>
        this.buildUploadedFileResponse(req, file),
      );

      sendSuccess(
        res,
        uploadedFiles,
        `${uploadedFiles.length} file${uploadedFiles.length === 1 ? "" : "s"} uploaded successfully`,
      );
    } catch (error) {
      await this.cleanupUploadedFiles(files);
      throw error;
    }
  });
}

export default new UploadController();

import { Request, Response } from "express";
import asyncHandler from "../utils/async-handler";
import { ValidationError } from "../utils/errors";
import { getQueryString, sendCreated } from "../utils/http";
import {
  cleanupRequestUploads,
  resolveUploadCategory,
  validateStoredUpload,
  type UploadCategory,
} from "../middleware/upload";

type UploadedFileResponse = {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  originalName: string;
};

const normalizeMulterFiles = (
  files: Request["files"],
): Express.Multer.File[] => {
  if (!files) return [];
  return Array.isArray(files) ? files : Object.values(files).flat();
};

const buildUploadUrl = (directory: string, filename: string): string =>
  `/uploads/${encodeURIComponent(directory)}/${encodeURIComponent(filename)}`;

const sanitizeFileDisplayName = (value: string): string =>
  value
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/[<>:"|?*\\/]+/g, "-")
    .replace(/\s+/g, " ")
    .trim() || "file";

const getRequestedUploadFolder = (req: Request): string | undefined =>
  getQueryString(req.body?.folder) || getQueryString(req.query?.folder);

class UploadController {
  private assertRequestedFolderMatchesStoredFile(
    req: Request,
    storedCategory: UploadCategory,
  ): void {
    const requestedFolder = getRequestedUploadFolder(req);
    if (!requestedFolder) {
      return;
    }

    if (resolveUploadCategory(requestedFolder) !== storedCategory) {
      throw new ValidationError(
        "Upload folder must be sent before the file field or as a folder query parameter so the file can be stored in the requested folder",
      );
    }
  }

  private buildUploadedFileResponse(
    req: Request,
    file: Express.Multer.File,
  ): UploadedFileResponse {
    if (!file.filename?.trim()) {
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

  uploadFile = asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new ValidationError("No file uploaded");
    }

    try {
      const uploadedFile = this.buildUploadedFileResponse(req, file);
      sendCreated(res, uploadedFile, "File uploaded successfully");
    } catch (error) {
      await cleanupRequestUploads(req);
      throw error;
    }
  });

  uploadMultipleFiles = asyncHandler(async (req: Request, res: Response) => {
    const files = normalizeMulterFiles(req.files);
    if (files.length === 0) {
      throw new ValidationError("No files uploaded");
    }

    try {
      const uploadedFiles = files.map((file) =>
        this.buildUploadedFileResponse(req, file),
      );
      sendCreated(
        res,
        uploadedFiles,
        `${uploadedFiles.length} file${uploadedFiles.length === 1 ? "" : "s"} uploaded successfully`,
      );
    } catch (error) {
      await cleanupRequestUploads(req);
      throw error;
    }
  });
}

export default new UploadController();

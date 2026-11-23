import { NextFunction, Request, RequestHandler, Response, Router } from "express";

import uploadController from "../controllers/upload.controller";
import { authenticate } from "../middleware/auth";
import {
  cleanupTrackedRequestUploads,
  uploadAny,
} from "../middleware/upload";

const router = Router();

const SINGLE_FILE_FIELD = "file";
const MULTIPLE_FILES_FIELD = "files";
const MAX_FILES_PER_REQUEST = 10;

const withUploadCleanupOnError =
  (multerHandler: RequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    multerHandler(req, res, (error?: unknown) => {
      if (!error) {
        next();
        return;
      }

      void cleanupTrackedRequestUploads(req).finally(() => {
        next(error);
      });
    });
  };

/**
 * Upload routes.
 *
 * All upload routes require authentication.
 * Supported upload categories are handled by the upload middleware using either:
 * - request body folder field sent before file fields,
 * - folder query parameter, or
 * - multer file field name.
 */

router.use(authenticate);

router.post(
  "/",
  withUploadCleanupOnError(uploadAny.single(SINGLE_FILE_FIELD)),
  uploadController.uploadFile,
);

router.post(
  "/multiple",
  withUploadCleanupOnError(
    uploadAny.array(MULTIPLE_FILES_FIELD, MAX_FILES_PER_REQUEST),
  ),
  uploadController.uploadMultipleFiles,
);

export default router;

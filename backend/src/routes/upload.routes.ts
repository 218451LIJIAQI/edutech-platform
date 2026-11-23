import {
  Router,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";

import uploadController from "../controllers/upload.controller";
import { authenticate } from "../middleware/auth";
import { cleanupRequestUploads, uploadAny } from "../middleware/upload";

const router = Router();

const SINGLE_FILE_FIELD = "file";
const MULTIPLE_FILES_FIELD = "files";
const MAX_FILES_PER_REQUEST = 10;

const withUploadCleanup =
  (multerMiddleware: RequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    multerMiddleware(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }

      void cleanupRequestUploads(req).finally(() => {
        next(err);
      });
    });
  };

/**
 * Upload routes.
 *
 * All upload routes require authentication.
 * Any mid-stream Multer rejection or limit failure automatically cleans up
 * files already written earlier in the same request.
 */

router.use(authenticate);

router.post(
  "/",
  withUploadCleanup(uploadAny.single(SINGLE_FILE_FIELD)),
  uploadController.uploadFile,
);

router.post(
  "/multiple",
  withUploadCleanup(uploadAny.array(MULTIPLE_FILES_FIELD, MAX_FILES_PER_REQUEST)),
  uploadController.uploadMultipleFiles,
);

export default router;

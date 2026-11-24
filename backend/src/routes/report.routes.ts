import { Router } from "express";
import { ReportType, ReportStatus } from "@prisma/client";
import { body, query } from "express-validator";
import reportController from "../controllers/report.controller";
import { authenticate } from "../middleware/auth";
import { adminOnly, studentOnly } from "../middleware/teacher-access";
import { validate } from "../middleware/validate";
import {
  paginationQueryValidators,
  uuidBodyField,
  uuidParam,
} from "../validators/common.validator";

const router = Router();

const reportIdParam = uuidParam("id");
const teacherIdParam = uuidParam("teacherId");

const submitReportValidation = [
  uuidBodyField("reportedId", "Reported user ID"),
  body("type")
    .notEmpty()
    .withMessage("Report type is required")
    .bail()
    .isIn(Object.values(ReportType))
    .withMessage("Invalid report type"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .bail()
    .isLength({ min: 20, max: 1000 })
    .withMessage("Description must be between 20 and 1000 characters"),
  body("contentType")
    .optional({ values: "falsy" })
    .isIn(["teacher", "course", "community_post", "community_comment"])
    .withMessage("Invalid content type"),
  body("contentId")
    .optional({ values: "falsy" })
    .isUUID()
    .withMessage("Invalid content ID"),
  body().custom((value) => {
    const normalizedContentType =
      typeof value?.contentType === "string"
        ? value.contentType.trim().toLowerCase()
        : "";
    const hasContentType = normalizedContentType.length > 0;
    const hasContentId =
      typeof value?.contentId === "string" && value.contentId.trim().length > 0;

    if (normalizedContentType === "teacher" && !hasContentId) {
      return true;
    }

    if (hasContentType !== hasContentId) {
      throw new Error("contentType and contentId must be provided together");
    }

    return true;
  }),
];

const getAllReportsValidation = [
  query("status")
    .optional({ values: "falsy" })
    .isIn(Object.values(ReportStatus))
    .withMessage("Invalid report status"),
  query("type")
    .optional({ values: "falsy" })
    .isIn(Object.values(ReportType))
    .withMessage("Invalid report type"),
  ...paginationQueryValidators(100),
];

const updateReportStatusValidation = [
  reportIdParam,
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .bail()
    .isIn(Object.values(ReportStatus))
    .withMessage("Invalid report status"),
  body("resolution")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Resolution must not exceed 2000 characters"),
];

router.post(
  "/",
  studentOnly,
  validate(submitReportValidation),
  reportController.submitReport,
);

router.get("/my-reports", studentOnly, reportController.getMyReports);

router.get(
  "/",
  adminOnly,
  validate(getAllReportsValidation),
  reportController.getAllReports,
);

router.get(
  "/teacher/:teacherId",
  adminOnly,
  validate(teacherIdParam),
  reportController.getTeacherReports,
);

router.put(
  "/:id/status",
  adminOnly,
  validate(updateReportStatusValidation),
  reportController.updateReportStatus,
);

router.get(
  "/:id",
  authenticate,
  validate(reportIdParam),
  reportController.getReportById,
);

export default router;

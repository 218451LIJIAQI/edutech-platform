import { Router } from "express";
import { UserRole, ReportType, ReportStatus } from "@prisma/client";
import { body, query, param } from "express-validator";

import reportController from "../controllers/report.controller";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

const uuidParam = (name: string) =>
  param(name)
    .notEmpty()
    .withMessage(`${name} is required`)
    .bail()
    .isUUID()
    .withMessage(`Invalid ${name}`);

const reportIdParam = uuidParam("id");
const teacherIdParam = uuidParam("teacherId");

const studentOnly = [authenticate, authorize(UserRole.STUDENT)];

const adminOnly = [authenticate, authorize(UserRole.ADMIN)];

const submitReportValidation = [
  body("reportedId")
    .notEmpty()
    .withMessage("Reported user ID is required")
    .bail()
    .isUUID()
    .withMessage("Invalid user ID"),

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

  query("page")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional({ values: "falsy" })
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
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
    .isLength({ max: 1000 })
    .withMessage("Resolution must not exceed 1000 characters"),
];

/**
 * Report routes.
 *
 * Students can submit reports and view their own reports.
 * Admins can view, filter, and update report statuses.
 */

// ================================
// STUDENT REPORT ROUTES
// ================================

router.post(
  "/",
  studentOnly,
  validate(submitReportValidation),
  reportController.submitReport,
);

router.get("/my-reports", studentOnly, reportController.getMyReports);

// ================================
// ADMIN REPORT ROUTES
// ================================

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

// ================================
// SHARED REPORT DETAIL ROUTE
// ================================
// The controller should ensure that students can only access their own reports,
// while admins can access any report.

router.get(
  "/:id",
  authenticate,
  validate(reportIdParam),
  reportController.getReportById,
);

export default router;

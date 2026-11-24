import { Router } from "express";
import { body } from "express-validator";
import courseController from "../controllers/course.controller";
import { authenticate, optionalAuth } from "../middleware/auth";
import { approvedTeacherOnly, studentOnly } from "../middleware/teacher-access";
import { validate } from "../middleware/validate";
import { validateUrlOrUploadPathForFolders } from "../utils/url-or-path";
import { uuidParam } from "../validators/common.validator";
import {
  createCourseValidation,
  updateCourseValidation,
  createLessonValidation,
  updateLessonValidation,
  createLiveSessionValidation,
  createPackageValidation,
  updatePackageValidation,
  uploadMaterialValidation,
  updateMaterialValidation,
  sendCourseNotificationValidation,
  getCoursesValidation,
} from "../validators/course.validator";

const router = Router();

const courseIdParam = uuidParam("id", "course ID");
const lessonIdParam = uuidParam("id", "lesson ID");
const packageIdParam = uuidParam("id", "package ID");
const materialIdParam = uuidParam("id", "material ID");
const liveSessionIdParam = uuidParam("id", "live session ID");

const submitQuizValidation = [
  lessonIdParam,
  body("answers")
    .isArray({ min: 1 })
    .withMessage("answers must be a non-empty array"),
  body("answers.*")
    .optional({ values: "undefined" })
    .isInt({ min: 0 })
    .withMessage("Each answer must be a non-negative integer"),
];

const updateLiveSessionStatusValidation = [
  liveSessionIdParam,
  body("status")
    .isString()
    .withMessage("status must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("status is required"),
  body("recordingUrl")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("recordingUrl must be a string")
    .bail()
    .trim()
    .isLength({ max: 2048 })
    .withMessage("recordingUrl must not exceed 2048 characters")
    .bail()
    .custom(
      validateUrlOrUploadPathForFolders(
        "Recording URL must be an external URL or use the /uploads/videos/ folder",
        ["videos"],
      ),
    ),
];

router.get("/", validate(getCoursesValidation), courseController.getAllCourses);
router.get("/categories/all", courseController.getCategories);
router.get("/my-courses", approvedTeacherOnly, courseController.getMyCourses);

router.get(
  "/:id/quiz-attempts",
  approvedTeacherOnly,
  validate(courseIdParam),
  courseController.getCourseQuizAttempts,
);

router.get(
  "/:id/my-quiz-attempts",
  studentOnly,
  validate(courseIdParam),
  courseController.getMyCourseQuizAttempts,
);

router.get(
  "/:id/live-sessions",
  authenticate,
  validate(courseIdParam),
  courseController.getCourseLiveSessions,
);

router.post(
  "/lessons/:id/live-sessions",
  approvedTeacherOnly,
  validate([lessonIdParam, ...createLiveSessionValidation]),
  courseController.createLiveSession,
);

router.patch(
  "/live-sessions/:id/status",
  approvedTeacherOnly,
  validate(updateLiveSessionStatusValidation),
  courseController.updateLiveSessionStatus,
);

router.post(
  "/lessons/:id/quiz/submit",
  studentOnly,
  validate(submitQuizValidation),
  courseController.submitLessonQuiz,
);

router.post(
  "/:id/lessons",
  approvedTeacherOnly,
  validate([courseIdParam, ...createLessonValidation]),
  courseController.createLesson,
);

router.put(
  "/lessons/:id",
  approvedTeacherOnly,
  validate([lessonIdParam, ...updateLessonValidation]),
  courseController.updateLesson,
);

router.delete(
  "/lessons/:id",
  approvedTeacherOnly,
  validate(lessonIdParam),
  courseController.deleteLesson,
);

router.post(
  "/:id/packages",
  approvedTeacherOnly,
  validate([courseIdParam, ...createPackageValidation]),
  courseController.createPackage,
);

router.put(
  "/packages/:id",
  approvedTeacherOnly,
  validate([packageIdParam, ...updatePackageValidation]),
  courseController.updatePackage,
);

router.delete(
  "/packages/:id",
  approvedTeacherOnly,
  validate(packageIdParam),
  courseController.deletePackage,
);

router.post(
  "/:id/materials",
  approvedTeacherOnly,
  validate([courseIdParam, ...uploadMaterialValidation]),
  courseController.uploadMaterial,
);

router.get(
  "/materials/:id/download",
  authenticate,
  validate(materialIdParam),
  courseController.downloadMaterial,
);

router.put(
  "/materials/:id",
  approvedTeacherOnly,
  validate([materialIdParam, ...updateMaterialValidation]),
  courseController.updateMaterial,
);

router.delete(
  "/materials/:id",
  approvedTeacherOnly,
  validate(materialIdParam),
  courseController.deleteMaterial,
);

router.post(
  "/:id/notifications",
  approvedTeacherOnly,
  validate([courseIdParam, ...sendCourseNotificationValidation]),
  courseController.sendCourseNotification,
);

router.post(
  "/",
  approvedTeacherOnly,
  validate(createCourseValidation),
  courseController.createCourse,
);

router.put(
  "/:id",
  approvedTeacherOnly,
  validate([courseIdParam, ...updateCourseValidation]),
  courseController.updateCourse,
);

router.delete(
  "/:id",
  approvedTeacherOnly,
  validate(courseIdParam),
  courseController.deleteCourse,
);

router.get(
  "/:id",
  optionalAuth,
  validate(courseIdParam),
  courseController.getCourseById,
);

export default router;

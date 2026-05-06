import { Request, Response } from "express";
import { CourseType, LessonType } from "@prisma/client";
import courseService from "../services/course.service";
import notificationService from "../services/notification.service";
import { buildCurrentEnrollmentWhere } from "../services/shared/enrollment-access";
import prisma from "../config/database";
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  NotFoundError,
} from "../utils/errors";
import asyncHandler from "../utils/async-handler";
import { applyProtectedAssetHeaders } from "../utils/protected-asset";

interface LessonQuizQuestionInput {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

interface LessonQuizInput {
  questions: LessonQuizQuestionInput[];
}

type SortBy = "NEWEST" | "RATING" | "POPULARITY" | "PRICE_ASC" | "PRICE_DESC";
type SortOrder = "asc" | "desc";

const ALLOWED_SORT_BY: readonly SortBy[] = [
  "NEWEST",
  "RATING",
  "POPULARITY",
  "PRICE_ASC",
  "PRICE_DESC",
] as const;

const MAX_PAGE_LIMIT = 100;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_NOTIFICATION_TITLE_LENGTH = 150;
const MAX_NOTIFICATION_MESSAGE_LENGTH = 2000;
const MAX_FEATURES = 30;
const MAX_URL_OR_PATH_LENGTH = 2048;

const sendSuccess = (
  res: Response,
  data?: unknown,
  message?: string,
  statusCode = 200,
) => {
  res.status(statusCode).json({
    status: "success",
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
  });
};

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AuthenticationError("Authentication required");
  }

  return req.user.id;
};

const getStringValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;

  const parsed = value.trim();

  return parsed.length > 0 ? parsed : undefined;
};

const parseRequiredString = (value: unknown, fieldName: string): string => {
  const parsed = getStringValue(value);

  if (!parsed) {
    throw new BadRequestError(`${fieldName} is required`);
  }

  return parsed;
};

const parseOptionalString = (
  value: unknown,
  fieldName: string,
  maxLength?: number,
): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = getStringValue(value);

  if (!parsed) {
    throw new BadRequestError(`${fieldName} must be a non-empty string`);
  }

  if (maxLength !== undefined && parsed.length > maxLength) {
    throw new BadRequestError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return parsed;
};

const parseRequiredLimitedString = (
  value: unknown,
  fieldName: string,
  maxLength: number,
): string => {
  const parsed = parseRequiredString(value, fieldName);

  if (parsed.length > maxLength) {
    throw new BadRequestError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return parsed;
};

const parseOptionalBoolean = (
  value: unknown,
  fieldName: string,
): boolean | undefined => {
  if (value === undefined || value === null || value === "") return undefined;

  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const parsed = value.trim().toLowerCase();

    if (parsed === "true") return true;
    if (parsed === "false") return false;
  }

  throw new BadRequestError(`${fieldName} must be true or false`);
};

const parseNumber = (
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {},
): number | undefined => {
  if (value === undefined || value === null || value === "") {
    if (options.required) {
      throw new BadRequestError(`${fieldName} is required`);
    }

    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new BadRequestError(`${fieldName} must be a valid number`);
  }

  if (options.integer && !Number.isInteger(parsed)) {
    throw new BadRequestError(`${fieldName} must be an integer`);
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new BadRequestError(`${fieldName} must be at least ${options.min}`);
  }

  if (options.max !== undefined && parsed > options.max) {
    throw new BadRequestError(`${fieldName} must be at most ${options.max}`);
  }

  return parsed;
};

const parseRequiredNumber = (
  value: unknown,
  fieldName: string,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
  } = {},
): number => {
  const parsed = parseNumber(value, fieldName, {
    ...options,
    required: true,
  });

  return parsed as number;
};

const parsePositiveInteger = (
  value: unknown,
  fieldName: string,
  fallback?: number,
  max = MAX_PAGE_LIMIT,
): number | undefined => {
  if (value === undefined || value === null || value === "") return fallback;

  const parsed = parseRequiredNumber(value, fieldName, {
    min: 1,
    integer: true,
  });

  return Math.min(parsed, max);
};

const parseOptionalEnum = <T extends string>(
  value: unknown,
  enumObject: Record<string, T>,
  fieldName: string,
): T | undefined => {
  const parsed = getStringValue(value);

  if (!parsed) return undefined;

  const allowedValues = Object.values(enumObject);

  if (!allowedValues.includes(parsed as T)) {
    throw new BadRequestError(
      `${fieldName} must be one of: ${allowedValues.join(", ")}`,
    );
  }

  return parsed as T;
};

const parseRequiredEnum = <T extends string>(
  value: unknown,
  enumObject: Record<string, T>,
  fieldName: string,
): T => {
  const parsed = parseOptionalEnum(value, enumObject, fieldName);

  if (!parsed) {
    throw new BadRequestError(`${fieldName} is required`);
  }

  return parsed;
};

const parseSortBy = (value: unknown): SortBy | undefined => {
  const parsed = getStringValue(value);

  if (!parsed) return undefined;

  if (!ALLOWED_SORT_BY.includes(parsed as SortBy)) {
    throw new BadRequestError(
      `sortBy must be one of: ${ALLOWED_SORT_BY.join(", ")}`,
    );
  }

  return parsed as SortBy;
};

const parseSortOrder = (value: unknown): SortOrder | undefined => {
  const parsed = getStringValue(value);

  if (!parsed) return undefined;

  if (parsed !== "asc" && parsed !== "desc") {
    throw new BadRequestError('sortOrder must be "asc" or "desc"');
  }

  return parsed;
};

const parseFeatures = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === "") return undefined;

  if (!Array.isArray(value)) {
    throw new BadRequestError("features must be an array of strings");
  }

  if (value.length > MAX_FEATURES) {
    throw new BadRequestError(
      `features must not contain more than ${MAX_FEATURES} items`,
    );
  }

  const features = value.map((item) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new BadRequestError("features must contain non-empty strings only");
    }

    return item.trim();
  });

  return Array.from(new Set(features));
};

const parseQuiz = (value: unknown): LessonQuizInput | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestError("quiz must be an object with a questions array");
  }

  const quiz = value as { questions?: unknown };

  if (!Array.isArray(quiz.questions)) {
    throw new BadRequestError("quiz.questions must be an array");
  }

  if (quiz.questions.length === 0) {
    throw new BadRequestError(
      "quiz.questions must contain at least one question",
    );
  }

  const questions = quiz.questions.map((question, index) => {
    if (!question || typeof question !== "object" || Array.isArray(question)) {
      throw new BadRequestError(`quiz.questions[${index}] must be an object`);
    }

    const item = question as {
      question?: unknown;
      options?: unknown;
      correctOptionIndex?: unknown;
      explanation?: unknown;
    };

    const questionText = parseRequiredString(
      item.question,
      `quiz.questions[${index}].question`,
    );

    if (!Array.isArray(item.options) || item.options.length < 2) {
      throw new BadRequestError(
        `quiz.questions[${index}].options must contain at least two options`,
      );
    }

    const options = item.options.map((option, optionIndex) =>
      parseRequiredString(
        option,
        `quiz.questions[${index}].options[${optionIndex}]`,
      ),
    );

    const correctOptionIndex = parseRequiredNumber(
      item.correctOptionIndex,
      `quiz.questions[${index}].correctOptionIndex`,
      {
        min: 0,
        max: options.length - 1,
        integer: true,
      },
    );

    const explanation = parseOptionalString(
      item.explanation,
      `quiz.questions[${index}].explanation`,
    );

    return {
      question: questionText,
      options,
      correctOptionIndex,
      explanation,
    };
  });

  return { questions };
};

const parseQuizAnswers = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    throw new BadRequestError("answers must be an array");
  }

  if (value.length === 0) {
    throw new BadRequestError("answers must not be empty");
  }

  return value.map((answer, index) =>
    parseRequiredNumber(answer, `answers[${index}]`, {
      min: 0,
      integer: true,
    }),
  );
};

const validatePriceRange = (minPrice?: number, maxPrice?: number): void => {
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new BadRequestError("minPrice cannot be greater than maxPrice");
  }
};

const validateDiscount = (price?: number, discount?: number): void => {
  if (discount === undefined) return;

  if (discount < 0) {
    throw new BadRequestError("discount must be a non-negative number");
  }

  if (price !== undefined && discount > price) {
    throw new BadRequestError("discount cannot be greater than price");
  }
};

const parseOptionalUrlOrPath = (
  value: unknown,
  fieldName: string,
): string | undefined => {
  return parseOptionalString(value, fieldName, MAX_URL_OR_PATH_LENGTH);
};

const parseRequiredUrlOrPath = (value: unknown, fieldName: string): string => {
  return parseRequiredLimitedString(value, fieldName, MAX_URL_OR_PATH_LENGTH);
};

const parseCourseIdParam = (req: Request, paramName = "id"): string => {
  return parseRequiredString(req.params[paramName], "Course ID");
};

const parseEntityIdParam = (
  req: Request,
  paramName: string,
  label: string,
): string => {
  return parseRequiredString(req.params[paramName], label);
};

class CourseController {
  /**
   * Get all published courses.
   * GET /api/courses
   */
  getAllCourses = asyncHandler(async (req: Request, res: Response) => {
    const minPrice = parseNumber(req.query.minPrice, "minPrice", { min: 0 });
    const maxPrice = parseNumber(req.query.maxPrice, "maxPrice", { min: 0 });

    validatePriceRange(minPrice, maxPrice);

    const result = await courseService.getAllCourses({
      category: parseOptionalString(req.query.category, "category"),
      teacherId: parseOptionalString(req.query.teacherId, "teacherId"),
      search: parseOptionalString(req.query.search, "search"),
      courseType: parseOptionalEnum(
        req.query.courseType,
        CourseType,
        "courseType",
      ),
      minRating: parseNumber(req.query.minRating, "minRating", {
        min: 0,
        max: 5,
      }),
      minPrice,
      maxPrice,
      sortBy: parseSortBy(req.query.sortBy),
      sortOrder: parseSortOrder(req.query.sortOrder),
      page: parsePositiveInteger(req.query.page, "page"),
      limit: parsePositiveInteger(req.query.limit, "limit"),
    });

    sendSuccess(res, result);
  });

  /**
   * Get course by ID.
   * GET /api/courses/:id
   */
  getCourseById = asyncHandler(async (req: Request, res: Response) => {
    const courseId = parseCourseIdParam(req);

    const course = await courseService.getCourseById(courseId, req.user?.id);

    sendSuccess(res, course);
  });

  /**
   * Create new course.
   * POST /api/courses
   */
  createCourse = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const course = await courseService.createCourse(userId, {
      title: parseRequiredLimitedString(
        req.body?.title,
        "title",
        MAX_TITLE_LENGTH,
      ),
      description: parseRequiredLimitedString(
        req.body?.description,
        "description",
        MAX_DESCRIPTION_LENGTH,
      ),
      category: parseRequiredString(req.body?.category, "category"),
      courseType: parseOptionalEnum(
        req.body?.courseType,
        CourseType,
        "courseType",
      ),
      thumbnail: parseOptionalUrlOrPath(req.body?.thumbnail, "thumbnail"),
      previewVideoUrl: parseOptionalUrlOrPath(
        req.body?.previewVideoUrl,
        "previewVideoUrl",
      ),
    });

    sendSuccess(res, course, "Course created successfully", 201);
  });

  /**
   * Update course.
   * PUT /api/courses/:id
   */
  updateCourse = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const courseId = parseCourseIdParam(req);

    const course = await courseService.updateCourse(userId, courseId, {
      title: parseOptionalString(req.body?.title, "title", MAX_TITLE_LENGTH),
      description: parseOptionalString(
        req.body?.description,
        "description",
        MAX_DESCRIPTION_LENGTH,
      ),
      category: parseOptionalString(req.body?.category, "category"),
      courseType: parseOptionalEnum(
        req.body?.courseType,
        CourseType,
        "courseType",
      ),
      thumbnail: parseOptionalUrlOrPath(req.body?.thumbnail, "thumbnail"),
      previewVideoUrl: parseOptionalUrlOrPath(
        req.body?.previewVideoUrl,
        "previewVideoUrl",
      ),
      isPublished: parseOptionalBoolean(req.body?.isPublished, "isPublished"),
    });

    sendSuccess(res, course, "Course updated successfully");
  });

  /**
   * Delete course.
   * DELETE /api/courses/:id
   */
  deleteCourse = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const courseId = parseCourseIdParam(req);

    const result = await courseService.deleteCourse(userId, courseId);

    sendSuccess(
      res,
      undefined,
      result.message || "Course deleted successfully",
    );
  });

  /**
   * Create lesson in course.
   * POST /api/courses/:id/lessons
   */
  createLesson = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const courseId = parseCourseIdParam(req);

    const lesson = await courseService.createLesson(userId, courseId, {
      title: parseRequiredLimitedString(
        req.body?.title,
        "title",
        MAX_TITLE_LENGTH,
      ),
      description: parseOptionalString(
        req.body?.description,
        "description",
        MAX_DESCRIPTION_LENGTH,
      ),
      type: parseRequiredEnum(req.body?.type, LessonType, "type"),
      duration: parseNumber(req.body?.duration, "duration", {
        min: 1,
        integer: true,
      }),
      videoUrl: parseOptionalUrlOrPath(req.body?.videoUrl, "videoUrl"),
      quiz: parseQuiz(req.body?.quiz),
      isFree: parseOptionalBoolean(req.body?.isFree, "isFree"),
    });

    sendSuccess(res, lesson, "Lesson created successfully", 201);
  });

  /**
   * Update lesson.
   * PUT /api/courses/lessons/:id
   */
  updateLesson = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const lessonId = parseEntityIdParam(req, "id", "Lesson ID");

    const lesson = await courseService.updateLesson(userId, lessonId, {
      title: parseOptionalString(req.body?.title, "title", MAX_TITLE_LENGTH),
      description: parseOptionalString(
        req.body?.description,
        "description",
        MAX_DESCRIPTION_LENGTH,
      ),
      type: parseOptionalEnum(req.body?.type, LessonType, "type"),
      duration: parseNumber(req.body?.duration, "duration", {
        min: 1,
        integer: true,
      }),
      videoUrl: parseOptionalUrlOrPath(req.body?.videoUrl, "videoUrl"),
      quiz: parseQuiz(req.body?.quiz),
      isFree: parseOptionalBoolean(req.body?.isFree, "isFree"),
      orderIndex: parseNumber(req.body?.orderIndex, "orderIndex", {
        min: 1,
        integer: true,
      }),
    });

    sendSuccess(res, lesson, "Lesson updated successfully");
  });

  /**
   * Delete lesson.
   * DELETE /api/courses/lessons/:id
   */
  deleteLesson = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const lessonId = parseEntityIdParam(req, "id", "Lesson ID");

    const result = await courseService.deleteLesson(userId, lessonId);

    sendSuccess(
      res,
      undefined,
      result.message || "Lesson deleted successfully",
    );
  });

  /**
   * Submit quiz answers for a lesson.
   * POST /api/courses/lessons/:id/quiz/submit
   */
  submitLessonQuiz = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const lessonId = parseEntityIdParam(req, "id", "Lesson ID");

    const result = await courseService.submitLessonQuiz(
      userId,
      lessonId,
      parseQuizAnswers(req.body?.answers),
    );

    sendSuccess(res, result);
  });

  /**
   * Get quiz attempts for a teacher-owned course.
   * GET /api/courses/:id/quiz-attempts
   */
  getCourseQuizAttempts = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const courseId = parseCourseIdParam(req);

    const attempts = await courseService.getCourseQuizAttempts(
      userId,
      courseId,
    );

    sendSuccess(res, attempts);
  });

  /**
   * Get quiz attempts for the authenticated student within a course.
   * GET /api/courses/:id/my-quiz-attempts
   */
  getMyCourseQuizAttempts = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const courseId = parseCourseIdParam(req);

    const attempts = await courseService.getMyCourseQuizAttempts(
      userId,
      courseId,
    );

    sendSuccess(res, attempts);
  });

  /**
   * Create lesson package.
   * POST /api/courses/:id/packages
   */
  createPackage = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const courseId = parseCourseIdParam(req);
    const price = parseRequiredNumber(req.body?.price, "price", { min: 0 });
    const discount = parseNumber(req.body?.discount, "discount", { min: 0 });

    validateDiscount(price, discount);

    const lessonPackage = await courseService.createPackage(userId, courseId, {
      name: parseRequiredLimitedString(
        req.body?.name,
        "name",
        MAX_TITLE_LENGTH,
      ),
      description: parseOptionalString(
        req.body?.description,
        "description",
        MAX_DESCRIPTION_LENGTH,
      ),
      price,
      discount,
      duration: parseNumber(req.body?.duration, "duration", {
        min: 1,
        integer: true,
      }),
      maxStudents: parseNumber(req.body?.maxStudents, "maxStudents", {
        min: 1,
        integer: true,
      }),
      features: parseFeatures(req.body?.features),
    });

    sendSuccess(res, lessonPackage, "Package created successfully", 201);
  });

  /**
   * Update lesson package.
   * PUT /api/courses/packages/:id
   */
  updatePackage = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const packageId = parseEntityIdParam(req, "id", "Package ID");
    const price = parseNumber(req.body?.price, "price", { min: 0 });
    const discount = parseNumber(req.body?.discount, "discount", { min: 0 });

    validateDiscount(price, discount);

    const lessonPackage = await courseService.updatePackage(userId, packageId, {
      name: parseOptionalString(req.body?.name, "name", MAX_TITLE_LENGTH),
      description: parseOptionalString(
        req.body?.description,
        "description",
        MAX_DESCRIPTION_LENGTH,
      ),
      price,
      discount,
      duration: parseNumber(req.body?.duration, "duration", {
        min: 1,
        integer: true,
      }),
      maxStudents: parseNumber(req.body?.maxStudents, "maxStudents", {
        min: 1,
        integer: true,
      }),
      features: parseFeatures(req.body?.features),
      isActive: parseOptionalBoolean(req.body?.isActive, "isActive"),
    });

    sendSuccess(res, lessonPackage, "Package updated successfully");
  });

  /**
   * Delete lesson package.
   * DELETE /api/courses/packages/:id
   */
  deletePackage = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const packageId = parseEntityIdParam(req, "id", "Package ID");

    const result = await courseService.deletePackage(userId, packageId);

    sendSuccess(
      res,
      undefined,
      result.message || "Package deleted successfully",
    );
  });

  /**
   * Upload material to course.
   * POST /api/courses/:id/materials
   */
  uploadMaterial = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const courseId = parseCourseIdParam(req);

    const material = await courseService.uploadMaterial(userId, courseId, {
      title: parseRequiredLimitedString(
        req.body?.title,
        "title",
        MAX_TITLE_LENGTH,
      ),
      description: parseOptionalString(
        req.body?.description,
        "description",
        MAX_DESCRIPTION_LENGTH,
      ),
      fileUrl: parseRequiredUrlOrPath(req.body?.fileUrl, "fileUrl"),
      fileType: parseRequiredString(req.body?.fileType, "fileType"),
      fileSize: parseRequiredNumber(req.body?.fileSize, "fileSize", {
        min: 0,
        integer: true,
      }),
      isDownloadable: parseOptionalBoolean(
        req.body?.isDownloadable,
        "isDownloadable",
      ),
    });

    sendSuccess(res, material, "Material uploaded successfully", 201);
  });

  /**
   * Update material.
   * PUT /api/courses/materials/:id
   */
  updateMaterial = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const materialId = parseEntityIdParam(req, "id", "Material ID");

    const material = await courseService.updateMaterial(userId, materialId, {
      title: parseOptionalString(req.body?.title, "title", MAX_TITLE_LENGTH),
      description: parseOptionalString(
        req.body?.description,
        "description",
        MAX_DESCRIPTION_LENGTH,
      ),
      fileUrl: parseOptionalUrlOrPath(req.body?.fileUrl, "fileUrl"),
      fileType: parseOptionalString(req.body?.fileType, "fileType"),
      fileSize: parseNumber(req.body?.fileSize, "fileSize", {
        min: 0,
        integer: true,
      }),
      isDownloadable: parseOptionalBoolean(
        req.body?.isDownloadable,
        "isDownloadable",
      ),
    });

    sendSuccess(res, material, "Material updated successfully");
  });

  /**
   * Delete material.
   * DELETE /api/courses/materials/:id
   */
  deleteMaterial = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const materialId = parseEntityIdParam(req, "id", "Material ID");

    const result = await courseService.deleteMaterial(userId, materialId);

    sendSuccess(
      res,
      undefined,
      result.message || "Material deleted successfully",
    );
  });

  /**
   * Download material through a protected access path.
   * GET /api/courses/materials/:id/download
   */
  downloadMaterial = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const materialId = parseEntityIdParam(req, "id", "Material ID");

    const asset = await courseService.getMaterialDownloadAsset(
      userId,
      materialId,
    );

    if (asset.redirectUrl) {
      applyProtectedAssetHeaders(res);
      return res.redirect(asset.redirectUrl);
    }

    if (!asset.absolutePath) {
      throw new BadRequestError("Material file is unavailable");
    }

    applyProtectedAssetHeaders(res, {
      disposition: "attachment",
      filename: asset.filename,
    });

    return res.download(asset.absolutePath, asset.filename);
  });

  /**
   * Get teacher's own courses.
   * GET /api/courses/my-courses
   */
  getMyCourses = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const courses = await courseService.getTeacherCourses(userId);

    sendSuccess(res, courses);
  });

  /**
   * Get course categories.
   * GET /api/courses/categories/all
   */
  getCategories = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await courseService.getCategories();

    sendSuccess(res, categories);
  });

  /**
   * Send course notification to all enrolled students.
   * POST /api/courses/:id/notifications
   */
  sendCourseNotification = asyncHandler(async (req: Request, res: Response) => {
    const teacherUserId = getAuthenticatedUserId(req);
    const courseId = parseCourseIdParam(req);
    const title = parseRequiredLimitedString(
      req.body?.title,
      "title",
      MAX_NOTIFICATION_TITLE_LENGTH,
    );
    const message = parseRequiredLimitedString(
      req.body?.message,
      "message",
      MAX_NOTIFICATION_MESSAGE_LENGTH,
    );
    const type =
      parseOptionalString(req.body?.type, "type") || "COURSE_ANNOUNCEMENT";

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacherProfile: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    if (course.teacherProfile.userId !== teacherUserId) {
      throw new AuthorizationError(
        "You can only notify students of your own course",
      );
    }

    const enrollments = await prisma.enrollment.findMany({
      where: buildCurrentEnrollmentWhere({
        package: {
          courseId,
        },
      }),
      select: {
        userId: true,
      },
    });

    const userIds = Array.from(
      new Set(enrollments.map((enrollment) => enrollment.userId)),
    );

    if (userIds.length > 0) {
      await notificationService.createBulkNotifications(
        userIds,
        title,
        message,
        type,
      );
    }

    sendSuccess(
      res,
      {
        recipients: userIds.length,
      },
      "Notification sent successfully",
      201,
    );
  });
}

export default new CourseController();

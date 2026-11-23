import { Request, Response } from "express";
import { CourseType, LessonType } from "@prisma/client";
import courseService, {
  COURSE_FIELD_LIMITS,
} from "../services/course.service";
import { BadRequestError } from "../utils/errors";
import asyncHandler from "../utils/async-handler";
import { applyProtectedAssetHeaders } from "../utils/protected-asset";
import {
  parseOptionalBoolean,
  parseRequiredParam,
  requireAuthUser,
  sendCreated,
  sendSuccess,
} from "../utils/http";

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
const MAX_FEATURES = 30;
const MAX_URL_OR_PATH_LENGTH = 2048;

const getStringValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const parsed = value.trim();
  return parsed.length > 0 ? parsed : undefined;
};

const parseRequiredString = (
  value: unknown,
  fieldName: string,
  maxLength?: number,
): string => {
  const parsed = getStringValue(value);
  if (!parsed) {
    throw new BadRequestError(`${fieldName} is required`);
  }
  if (maxLength !== undefined && parsed.length > maxLength) {
    throw new BadRequestError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }
  return parsed;
};

const parseOptionalString = (
  value: unknown,
  fieldName: string,
  maxLength?: number,
): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  return parseRequiredString(value, fieldName, maxLength);
};

/**
 * Distinguishes omitted (`undefined`) from cleared (`null` or `""`) on PATCH/PUT payloads.
 */
const parseNullableString = (
  value: unknown,
  fieldName: string,
  maxLength?: number,
): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} must be a string or null`);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (maxLength !== undefined && trimmed.length > maxLength) {
    throw new BadRequestError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }
  return trimmed;
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

const parseNullableNumber = (
  value: unknown,
  fieldName: string,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
  } = {},
): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return parseNumber(value, fieldName, options) ?? null;
};

const parseRequiredNumber = (
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number; integer?: boolean } = {},
): number => parseNumber(value, fieldName, { ...options, required: true }) as number;

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
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
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
      { min: 0, max: options.length - 1, integer: true },
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
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestError("answers must be a non-empty array");
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

class CourseController {
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

  getCourseById = asyncHandler(async (req: Request, res: Response) => {
    const courseId = parseRequiredParam(req.params.id, "Course ID");
    const course = await courseService.getCourseById(courseId, req.user?.id);
    sendSuccess(res, course);
  });

  createCourse = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);

    const course = await courseService.createCourse(userId, {
      title: parseRequiredString(
        req.body?.title,
        "title",
        COURSE_FIELD_LIMITS.COURSE_TITLE_MAX,
      ),
      description: parseRequiredString(
        req.body?.description,
        "description",
        COURSE_FIELD_LIMITS.COURSE_DESCRIPTION_MAX,
      ),
      category: parseRequiredString(
        req.body?.category,
        "category",
        COURSE_FIELD_LIMITS.COURSE_CATEGORY_MAX,
      ),
      courseType: parseOptionalEnum(
        req.body?.courseType,
        CourseType,
        "courseType",
      ),
      thumbnail: parseOptionalString(
        req.body?.thumbnail,
        "thumbnail",
        MAX_URL_OR_PATH_LENGTH,
      ),
      previewVideoUrl: parseOptionalString(
        req.body?.previewVideoUrl,
        "previewVideoUrl",
        MAX_URL_OR_PATH_LENGTH,
      ),
    });

    sendCreated(res, course, "Course created successfully");
  });

  updateCourse = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const courseId = parseRequiredParam(req.params.id, "Course ID");

    const course = await courseService.updateCourse(userId, courseId, {
      title: parseOptionalString(
        req.body?.title,
        "title",
        COURSE_FIELD_LIMITS.COURSE_TITLE_MAX,
      ),
      description: parseOptionalString(
        req.body?.description,
        "description",
        COURSE_FIELD_LIMITS.COURSE_DESCRIPTION_MAX,
      ),
      category: parseOptionalString(
        req.body?.category,
        "category",
        COURSE_FIELD_LIMITS.COURSE_CATEGORY_MAX,
      ),
      courseType: parseOptionalEnum(
        req.body?.courseType,
        CourseType,
        "courseType",
      ),
      thumbnail: parseNullableString(
        req.body?.thumbnail,
        "thumbnail",
        MAX_URL_OR_PATH_LENGTH,
      ),
      previewVideoUrl: parseNullableString(
        req.body?.previewVideoUrl,
        "previewVideoUrl",
        MAX_URL_OR_PATH_LENGTH,
      ),
      isPublished: parseOptionalBoolean(req.body?.isPublished, "isPublished"),
    });

    sendSuccess(res, course, "Course updated successfully");
  });

  deleteCourse = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const courseId = parseRequiredParam(req.params.id, "Course ID");
    const result = await courseService.deleteCourse(userId, courseId);
    sendSuccess(res, undefined, result.message || "Course deleted successfully");
  });

  createLesson = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const courseId = parseRequiredParam(req.params.id, "Course ID");

    const lesson = await courseService.createLesson(userId, courseId, {
      title: parseRequiredString(
        req.body?.title,
        "title",
        COURSE_FIELD_LIMITS.LESSON_TITLE_MAX,
      ),
      description: parseOptionalString(
        req.body?.description,
        "description",
        COURSE_FIELD_LIMITS.LESSON_DESCRIPTION_MAX,
      ),
      type: parseRequiredEnum(req.body?.type, LessonType, "type"),
      duration: parseNumber(req.body?.duration, "duration", {
        min: 1,
        integer: true,
      }),
      videoUrl: parseOptionalString(
        req.body?.videoUrl,
        "videoUrl",
        MAX_URL_OR_PATH_LENGTH,
      ),
      quiz: parseQuiz(req.body?.quiz),
      isFree: parseOptionalBoolean(req.body?.isFree, "isFree"),
    });

    sendCreated(res, lesson, "Lesson created successfully");
  });

  updateLesson = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const lessonId = parseRequiredParam(req.params.id, "Lesson ID");

    const lesson = await courseService.updateLesson(userId, lessonId, {
      title: parseOptionalString(
        req.body?.title,
        "title",
        COURSE_FIELD_LIMITS.LESSON_TITLE_MAX,
      ),
      description: parseNullableString(
        req.body?.description,
        "description",
        COURSE_FIELD_LIMITS.LESSON_DESCRIPTION_MAX,
      ),
      type: parseOptionalEnum(req.body?.type, LessonType, "type"),
      duration: parseNullableNumber(req.body?.duration, "duration", {
        min: 1,
        integer: true,
      }),
      videoUrl: parseNullableString(
        req.body?.videoUrl,
        "videoUrl",
        MAX_URL_OR_PATH_LENGTH,
      ),
      quiz: parseQuiz(req.body?.quiz),
      isFree: parseOptionalBoolean(req.body?.isFree, "isFree"),
      orderIndex: parseNumber(req.body?.orderIndex, "orderIndex", {
        min: 1,
        integer: true,
      }),
    });

    sendSuccess(res, lesson, "Lesson updated successfully");
  });

  deleteLesson = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const lessonId = parseRequiredParam(req.params.id, "Lesson ID");
    const result = await courseService.deleteLesson(userId, lessonId);
    sendSuccess(res, undefined, result.message || "Lesson deleted successfully");
  });

  submitLessonQuiz = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const lessonId = parseRequiredParam(req.params.id, "Lesson ID");
    const result = await courseService.submitLessonQuiz(
      userId,
      lessonId,
      parseQuizAnswers(req.body?.answers),
    );
    sendSuccess(res, result);
  });

  getCourseQuizAttempts = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const courseId = parseRequiredParam(req.params.id, "Course ID");
    const attempts = await courseService.getCourseQuizAttempts(
      userId,
      courseId,
    );
    sendSuccess(res, attempts);
  });

  getMyCourseQuizAttempts = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const courseId = parseRequiredParam(req.params.id, "Course ID");
    const attempts = await courseService.getMyCourseQuizAttempts(
      userId,
      courseId,
    );
    sendSuccess(res, attempts);
  });

  createPackage = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const courseId = parseRequiredParam(req.params.id, "Course ID");
    const price = parseRequiredNumber(req.body?.price, "price", { min: 0 });
    const discount = parseNumber(req.body?.discount, "discount", { min: 0 });
    validateDiscount(price, discount);

    const lessonPackage = await courseService.createPackage(userId, courseId, {
      name: parseRequiredString(
        req.body?.name,
        "name",
        COURSE_FIELD_LIMITS.PACKAGE_NAME_MAX,
      ),
      description: parseOptionalString(
        req.body?.description,
        "description",
        COURSE_FIELD_LIMITS.PACKAGE_DESCRIPTION_MAX,
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

    sendCreated(res, lessonPackage, "Package created successfully");
  });

  updatePackage = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const packageId = parseRequiredParam(req.params.id, "Package ID");
    const price = parseNumber(req.body?.price, "price", { min: 0 });
    const discount = parseNumber(req.body?.discount, "discount", { min: 0 });
    validateDiscount(price, discount);

    const lessonPackage = await courseService.updatePackage(userId, packageId, {
      name: parseOptionalString(
        req.body?.name,
        "name",
        COURSE_FIELD_LIMITS.PACKAGE_NAME_MAX,
      ),
      description: parseNullableString(
        req.body?.description,
        "description",
        COURSE_FIELD_LIMITS.PACKAGE_DESCRIPTION_MAX,
      ),
      price,
      discount,
      duration: parseNullableNumber(req.body?.duration, "duration", {
        min: 1,
        integer: true,
      }),
      maxStudents: parseNullableNumber(req.body?.maxStudents, "maxStudents", {
        min: 1,
        integer: true,
      }),
      features: parseFeatures(req.body?.features),
      isActive: parseOptionalBoolean(req.body?.isActive, "isActive"),
    });

    sendSuccess(res, lessonPackage, "Package updated successfully");
  });

  deletePackage = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const packageId = parseRequiredParam(req.params.id, "Package ID");
    const result = await courseService.deletePackage(userId, packageId);
    sendSuccess(
      res,
      undefined,
      result.message || "Package deleted successfully",
    );
  });

  uploadMaterial = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const courseId = parseRequiredParam(req.params.id, "Course ID");

    const material = await courseService.uploadMaterial(userId, courseId, {
      title: parseRequiredString(
        req.body?.title,
        "title",
        COURSE_FIELD_LIMITS.MATERIAL_TITLE_MAX,
      ),
      description: parseOptionalString(
        req.body?.description,
        "description",
        COURSE_FIELD_LIMITS.MATERIAL_DESCRIPTION_MAX,
      ),
      fileUrl: parseRequiredString(
        req.body?.fileUrl,
        "fileUrl",
        MAX_URL_OR_PATH_LENGTH,
      ),
      fileType: parseRequiredString(
        req.body?.fileType,
        "fileType",
        COURSE_FIELD_LIMITS.MATERIAL_FILE_TYPE_MAX,
      ),
      fileSize: parseRequiredNumber(req.body?.fileSize, "fileSize", {
        min: 0,
        integer: true,
      }),
      isDownloadable: parseOptionalBoolean(
        req.body?.isDownloadable,
        "isDownloadable",
      ),
    });

    sendCreated(res, material, "Material uploaded successfully");
  });

  updateMaterial = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const materialId = parseRequiredParam(req.params.id, "Material ID");

    const material = await courseService.updateMaterial(userId, materialId, {
      title: parseOptionalString(
        req.body?.title,
        "title",
        COURSE_FIELD_LIMITS.MATERIAL_TITLE_MAX,
      ),
      description: parseNullableString(
        req.body?.description,
        "description",
        COURSE_FIELD_LIMITS.MATERIAL_DESCRIPTION_MAX,
      ),
      fileUrl: parseOptionalString(
        req.body?.fileUrl,
        "fileUrl",
        MAX_URL_OR_PATH_LENGTH,
      ),
      fileType: parseOptionalString(
        req.body?.fileType,
        "fileType",
        COURSE_FIELD_LIMITS.MATERIAL_FILE_TYPE_MAX,
      ),
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

  deleteMaterial = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const materialId = parseRequiredParam(req.params.id, "Material ID");
    const result = await courseService.deleteMaterial(userId, materialId);
    sendSuccess(
      res,
      undefined,
      result.message || "Material deleted successfully",
    );
  });

  downloadMaterial = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const materialId = parseRequiredParam(req.params.id, "Material ID");
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

  getMyCourses = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = requireAuthUser(req);
    const courses = await courseService.getTeacherCourses(userId);
    sendSuccess(res, courses);
  });

  getCategories = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await courseService.getCategories();
    sendSuccess(res, categories);
  });

  sendCourseNotification = asyncHandler(async (req: Request, res: Response) => {
    const { id: teacherUserId } = requireAuthUser(req);
    const courseId = parseRequiredParam(req.params.id, "Course ID");

    const result = await courseService.sendCourseNotification(
      teacherUserId,
      courseId,
      {
        title: parseRequiredString(
          req.body?.title,
          "title",
          COURSE_FIELD_LIMITS.NOTIFICATION_TITLE_MAX,
        ),
        message: parseRequiredString(
          req.body?.message,
          "message",
          COURSE_FIELD_LIMITS.NOTIFICATION_MESSAGE_MAX,
        ),
        type: parseOptionalString(req.body?.type, "type", 80),
      },
    );

    sendCreated(res, result, "Notification sent successfully");
  });
}

export default new CourseController();

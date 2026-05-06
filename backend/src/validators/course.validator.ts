import { body, query, type Meta } from "express-validator";
import { CourseType, LessonType } from "@prisma/client";
import { validateUrlOrUploadPathForFolders } from "../utils/url-or-path";

/**
 * Validation rules for course endpoints.
 *
 * These validators protect course, lesson, package, material, and public course
 * search endpoints from invalid or unsafe request data.
 */

const COURSE_TYPES = Object.values(CourseType);
const LESSON_TYPES = Object.values(LessonType);

const SORT_BY_VALUES = [
  "NEWEST",
  "RATING",
  "POPULARITY",
  "PRICE_ASC",
  "PRICE_DESC",
] as const;
const SORT_ORDER_VALUES = ["asc", "desc"] as const;

const MAX_MONEY_VALUE = 99999999.99;

// Error message constants
const ERROR_MESSAGES = {
  COURSE_TITLE_STRING: "Course title must be a string",
  COURSE_TITLE_REQUIRED: "Course title is required",
  COURSE_TITLE_LENGTH: "Course title must be between 5 and 200 characters",

  COURSE_DESCRIPTION_STRING: "Course description must be a string",
  COURSE_DESCRIPTION_REQUIRED: "Course description is required",
  COURSE_DESCRIPTION_LENGTH:
    "Course description must be between 20 and 2000 characters",

  COURSE_CATEGORY_STRING: "Course category must be a string",
  COURSE_CATEGORY_REQUIRED: "Course category is required",
  COURSE_CATEGORY_EMPTY: "Course category cannot be empty",
  COURSE_CATEGORY_LENGTH: "Course category must not exceed 100 characters",

  COURSE_TYPE_STRING: "Course type must be a string",
  COURSE_TYPE_INVALID: "Course type must be LIVE, RECORDED, or HYBRID",

  THUMBNAIL_STRING: "Thumbnail must be a string URL or file path",
  THUMBNAIL_INVALID:
    "Thumbnail must be an external URL or use the /uploads/thumbnails/ folder",

  PREVIEW_VIDEO_STRING: "Preview video URL must be a string URL or file path",
  PREVIEW_VIDEO_INVALID:
    "Preview video URL must be an external URL or use the /uploads/videos/ folder",

  TITLE_STRING: "Title must be a string",
  TITLE_REQUIRED: "Title is required",
  TITLE_LENGTH: "Title must not exceed 200 characters",

  DESCRIPTION_STRING: "Description must be a string",
  DESCRIPTION_LENGTH: "Description must not exceed 1000 characters",

  IS_PUBLISHED_BOOLEAN: "isPublished must be a boolean",

  LESSON_TITLE_STRING: "Lesson title must be a string",
  LESSON_TITLE_REQUIRED: "Lesson title is required",
  LESSON_TITLE_LENGTH: "Lesson title must be between 2 and 200 characters",

  LESSON_DESCRIPTION_STRING: "Lesson description must be a string",
  LESSON_DESCRIPTION_LENGTH:
    "Lesson description must not exceed 1000 characters",

  LESSON_TYPE_STRING: "Lesson type must be a string",
  LESSON_TYPE_REQUIRED: "Lesson type is required",
  LESSON_TYPE_INVALID: "Lesson type must be LIVE, RECORDED, or HYBRID",

  DURATION_INTEGER: "Duration must be a positive integer",

  VIDEO_URL_STRING: "Video URL must be a string URL or file path",
  VIDEO_URL_INVALID:
    "Video URL must be an external URL or use the /uploads/videos/ folder",

  QUIZ_INVALID: "Quiz must contain valid single-choice questions",

  IS_FREE_BOOLEAN: "isFree must be a boolean",
  ORDER_INDEX_INTEGER: "Order index must be a positive integer",

  PACKAGE_NAME_STRING: "Package name must be a string",
  PACKAGE_NAME_REQUIRED: "Package name is required",
  PACKAGE_NAME_LENGTH: "Package name must be between 2 and 200 characters",

  PACKAGE_DESCRIPTION_STRING: "Description must be a string",
  PACKAGE_DESCRIPTION_LENGTH: "Description must not exceed 1000 characters",

  PRICE_REQUIRED: "Price is required",
  PRICE_VALID: "Price must be a valid non-negative number",
  PRICE_RANGE: `Price must be between 0 and ${MAX_MONEY_VALUE}`,

  DISCOUNT_VALID: "Discount must be a valid non-negative number",
  DISCOUNT_RANGE: `Discount must be between 0 and ${MAX_MONEY_VALUE}`,
  DISCOUNT_NOT_ABOVE_PRICE: "Discount must not be greater than price",

  MAX_STUDENTS_INTEGER: "Max students must be a positive integer",
  IS_ACTIVE_BOOLEAN: "isActive must be a boolean",

  MATERIAL_TITLE_STRING: "Material title must be a string",
  MATERIAL_TITLE_REQUIRED: "Material title is required",
  MATERIAL_TITLE_LENGTH: "Material title must be between 2 and 200 characters",

  MATERIAL_DESCRIPTION_STRING: "Description must be a string",
  MATERIAL_DESCRIPTION_LENGTH: "Description must not exceed 500 characters",

  FILE_URL_STRING: "File URL must be a string URL or file path",
  FILE_URL_REQUIRED: "File URL is required",
  FILE_URL_INVALID: "File URL must be a valid URL or file path",

  FILE_TYPE_STRING: "File type must be a string",
  FILE_TYPE_REQUIRED: "File type is required",
  FILE_TYPE_EMPTY: "File type cannot be empty",
  FILE_TYPE_LENGTH: "File type must not exceed 100 characters",

  FILE_SIZE_REQUIRED: "File size is required",
  FILE_SIZE_INTEGER: "File size must be a non-negative integer",

  IS_DOWNLOADABLE_BOOLEAN: "isDownloadable must be a boolean",

  SEARCH_STRING: "Search must be a string",
  SEARCH_LENGTH: "Search must not exceed 100 characters",

  TEACHER_ID_UUID: "teacherId must be a valid UUID",

  MIN_RATING_RANGE: "minRating must be between 0 and 5",

  MIN_PRICE_VALID: "minPrice must be a valid non-negative number",
  MAX_PRICE_VALID: "maxPrice must be a valid non-negative number",
  MAX_PRICE_GREATER: "maxPrice must be greater than or equal to minPrice",

  SORT_BY_INVALID: "Invalid sortBy value",
  SORT_ORDER_INVALID: "sortOrder must be asc or desc",

  PAGE_INTEGER: "Page must be a positive integer",
  LIMIT_RANGE: "Limit must be between 1 and 100",
} as const;

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const parseJsonIfString = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const validateMoneyValue = (message: string) => {
  return (value: unknown) => {
    const parsed = parseNumber(value);

    if (parsed === undefined || parsed < 0 || parsed > MAX_MONEY_VALUE) {
      throw new Error(message);
    }

    return true;
  };
};

const validateDiscountNotAbovePrice = (value: unknown, { req }: Meta) => {
  const price = parseNumber(req.body?.price);
  const discount = parseNumber(value);

  if (price !== undefined && discount !== undefined && discount > price) {
    throw new Error(ERROR_MESSAGES.DISCOUNT_NOT_ABOVE_PRICE);
  }

  return true;
};

const validateMaxPriceNotBelowMinPrice = (value: unknown, { req }: Meta) => {
  const min = parseNumber(req.query?.minPrice);
  const max = parseNumber(value);

  if (min !== undefined && max !== undefined && min > max) {
    throw new Error(ERROR_MESSAGES.MAX_PRICE_GREATER);
  }

  return true;
};

const validateQuiz = (value: unknown) => {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(ERROR_MESSAGES.QUIZ_INVALID);
  }

  const quiz = value as { questions?: unknown };

  if (
    !Array.isArray(quiz.questions) ||
    quiz.questions.length === 0 ||
    quiz.questions.length > 20
  ) {
    throw new Error(ERROR_MESSAGES.QUIZ_INVALID);
  }

  for (const question of quiz.questions) {
    if (
      typeof question !== "object" ||
      question === null ||
      Array.isArray(question)
    ) {
      throw new Error(ERROR_MESSAGES.QUIZ_INVALID);
    }

    const entry = question as {
      question?: unknown;
      options?: unknown;
      correctOptionIndex?: unknown;
      explanation?: unknown;
    };

    if (
      typeof entry.question !== "string" ||
      !entry.question.trim() ||
      entry.question.trim().length > 500
    ) {
      throw new Error(ERROR_MESSAGES.QUIZ_INVALID);
    }

    if (
      !Array.isArray(entry.options) ||
      entry.options.length < 2 ||
      entry.options.length > 6
    ) {
      throw new Error(ERROR_MESSAGES.QUIZ_INVALID);
    }

    const normalizedOptions = entry.options.map((option) => {
      if (typeof option !== "string") {
        throw new Error(ERROR_MESSAGES.QUIZ_INVALID);
      }

      const trimmedOption = option.trim();

      if (!trimmedOption || trimmedOption.length > 200) {
        throw new Error(ERROR_MESSAGES.QUIZ_INVALID);
      }

      return trimmedOption;
    });

    const uniqueOptions = new Set(
      normalizedOptions.map((option) => option.toLowerCase()),
    );

    if (uniqueOptions.size !== normalizedOptions.length) {
      throw new Error(ERROR_MESSAGES.QUIZ_INVALID);
    }

    if (
      typeof entry.correctOptionIndex !== "number" ||
      !Number.isInteger(entry.correctOptionIndex) ||
      entry.correctOptionIndex < 0 ||
      entry.correctOptionIndex >= normalizedOptions.length
    ) {
      throw new Error(ERROR_MESSAGES.QUIZ_INVALID);
    }

    if (
      entry.explanation !== undefined &&
      entry.explanation !== null &&
      (typeof entry.explanation !== "string" ||
        entry.explanation.trim().length > 500)
    ) {
      throw new Error(ERROR_MESSAGES.QUIZ_INVALID);
    }
  }

  return true;
};

export const createCourseValidation = [
  body("title")
    .isString()
    .withMessage(ERROR_MESSAGES.COURSE_TITLE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.COURSE_TITLE_REQUIRED)
    .bail()
    .isLength({ min: 5, max: 200 })
    .withMessage(ERROR_MESSAGES.COURSE_TITLE_LENGTH),

  body("description")
    .isString()
    .withMessage(ERROR_MESSAGES.COURSE_DESCRIPTION_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.COURSE_DESCRIPTION_REQUIRED)
    .bail()
    .isLength({ min: 20, max: 2000 })
    .withMessage(ERROR_MESSAGES.COURSE_DESCRIPTION_LENGTH),

  body("category")
    .isString()
    .withMessage(ERROR_MESSAGES.COURSE_CATEGORY_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.COURSE_CATEGORY_REQUIRED)
    .bail()
    .isLength({ max: 100 })
    .withMessage(ERROR_MESSAGES.COURSE_CATEGORY_LENGTH),

  body("courseType")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.COURSE_TYPE_STRING)
    .bail()
    .trim()
    .isIn(COURSE_TYPES)
    .withMessage(ERROR_MESSAGES.COURSE_TYPE_INVALID),

  body("thumbnail")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.THUMBNAIL_STRING)
    .bail()
    .trim()
    .custom(
      validateUrlOrUploadPathForFolders(ERROR_MESSAGES.THUMBNAIL_INVALID, [
        "thumbnails",
      ]),
    ),

  body("previewVideoUrl")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.PREVIEW_VIDEO_STRING)
    .bail()
    .trim()
    .custom(
      validateUrlOrUploadPathForFolders(ERROR_MESSAGES.PREVIEW_VIDEO_INVALID, [
        "videos",
      ]),
    ),
];

export const updateCourseValidation = [
  body("title")
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.TITLE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.TITLE_REQUIRED)
    .bail()
    .isLength({ min: 5, max: 200 })
    .withMessage(ERROR_MESSAGES.COURSE_TITLE_LENGTH),

  body("description")
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.DESCRIPTION_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.COURSE_DESCRIPTION_REQUIRED)
    .bail()
    .isLength({ min: 20, max: 2000 })
    .withMessage(ERROR_MESSAGES.COURSE_DESCRIPTION_LENGTH),

  body("category")
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.COURSE_CATEGORY_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.COURSE_CATEGORY_EMPTY)
    .bail()
    .isLength({ max: 100 })
    .withMessage(ERROR_MESSAGES.COURSE_CATEGORY_LENGTH),

  body("courseType")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.COURSE_TYPE_STRING)
    .bail()
    .trim()
    .isIn(COURSE_TYPES)
    .withMessage(ERROR_MESSAGES.COURSE_TYPE_INVALID),

  body("thumbnail")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.THUMBNAIL_STRING)
    .bail()
    .trim()
    .custom(
      validateUrlOrUploadPathForFolders(ERROR_MESSAGES.THUMBNAIL_INVALID, [
        "thumbnails",
      ]),
    ),

  body("previewVideoUrl")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.PREVIEW_VIDEO_STRING)
    .bail()
    .trim()
    .custom(
      validateUrlOrUploadPathForFolders(ERROR_MESSAGES.PREVIEW_VIDEO_INVALID, [
        "videos",
      ]),
    ),

  body("isPublished")
    .optional({ nullable: true })
    .isBoolean()
    .withMessage(ERROR_MESSAGES.IS_PUBLISHED_BOOLEAN)
    .bail()
    .toBoolean(),
];

export const createLessonValidation = [
  body("title")
    .isString()
    .withMessage(ERROR_MESSAGES.LESSON_TITLE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.LESSON_TITLE_REQUIRED)
    .bail()
    .isLength({ min: 2, max: 200 })
    .withMessage(ERROR_MESSAGES.LESSON_TITLE_LENGTH),

  body("description")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.LESSON_DESCRIPTION_STRING)
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(ERROR_MESSAGES.LESSON_DESCRIPTION_LENGTH),

  body("type")
    .isString()
    .withMessage(ERROR_MESSAGES.LESSON_TYPE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.LESSON_TYPE_REQUIRED)
    .bail()
    .isIn(LESSON_TYPES)
    .withMessage(ERROR_MESSAGES.LESSON_TYPE_INVALID),

  body("duration")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.DURATION_INTEGER)
    .bail()
    .toInt(),

  body("videoUrl")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.VIDEO_URL_STRING)
    .bail()
    .trim()
    .custom(
      validateUrlOrUploadPathForFolders(ERROR_MESSAGES.VIDEO_URL_INVALID, [
        "videos",
      ]),
    ),

  body("quiz")
    .optional({ nullable: true })
    .customSanitizer(parseJsonIfString)
    .custom(validateQuiz),

  body("isFree")
    .optional({ nullable: true })
    .isBoolean()
    .withMessage(ERROR_MESSAGES.IS_FREE_BOOLEAN)
    .bail()
    .toBoolean(),
];

export const updateLessonValidation = [
  body("title")
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.TITLE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.TITLE_REQUIRED)
    .bail()
    .isLength({ min: 2, max: 200 })
    .withMessage(ERROR_MESSAGES.LESSON_TITLE_LENGTH),

  body("description")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.LESSON_DESCRIPTION_STRING)
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(ERROR_MESSAGES.LESSON_DESCRIPTION_LENGTH),

  body("type")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.LESSON_TYPE_STRING)
    .bail()
    .trim()
    .isIn(LESSON_TYPES)
    .withMessage(ERROR_MESSAGES.LESSON_TYPE_INVALID),

  body("duration")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.DURATION_INTEGER)
    .bail()
    .toInt(),

  body("videoUrl")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.VIDEO_URL_STRING)
    .bail()
    .trim()
    .custom(
      validateUrlOrUploadPathForFolders(ERROR_MESSAGES.VIDEO_URL_INVALID, [
        "videos",
      ]),
    ),

  body("quiz")
    .optional({ nullable: true })
    .customSanitizer(parseJsonIfString)
    .custom(validateQuiz),

  body("isFree")
    .optional({ nullable: true })
    .isBoolean()
    .withMessage(ERROR_MESSAGES.IS_FREE_BOOLEAN)
    .bail()
    .toBoolean(),

  body("orderIndex")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.ORDER_INDEX_INTEGER)
    .bail()
    .toInt(),
];

export const createPackageValidation = [
  body("name")
    .isString()
    .withMessage(ERROR_MESSAGES.PACKAGE_NAME_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.PACKAGE_NAME_REQUIRED)
    .bail()
    .isLength({ min: 2, max: 200 })
    .withMessage(ERROR_MESSAGES.PACKAGE_NAME_LENGTH),

  body("description")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.PACKAGE_DESCRIPTION_STRING)
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(ERROR_MESSAGES.PACKAGE_DESCRIPTION_LENGTH),

  body("price")
    .notEmpty()
    .withMessage(ERROR_MESSAGES.PRICE_REQUIRED)
    .bail()
    .custom(validateMoneyValue(ERROR_MESSAGES.PRICE_RANGE))
    .bail()
    .toFloat(),

  body("discount")
    .optional({ nullable: true })
    .custom(validateMoneyValue(ERROR_MESSAGES.DISCOUNT_RANGE))
    .bail()
    .custom(validateDiscountNotAbovePrice)
    .bail()
    .toFloat(),

  body("duration")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.DURATION_INTEGER)
    .bail()
    .toInt(),

  body("maxStudents")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.MAX_STUDENTS_INTEGER)
    .bail()
    .toInt(),
];

export const updatePackageValidation = [
  body("name")
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.PACKAGE_NAME_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.PACKAGE_NAME_REQUIRED)
    .bail()
    .isLength({ min: 2, max: 200 })
    .withMessage(ERROR_MESSAGES.PACKAGE_NAME_LENGTH),

  body("description")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.PACKAGE_DESCRIPTION_STRING)
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(ERROR_MESSAGES.PACKAGE_DESCRIPTION_LENGTH),

  body("price")
    .optional({ nullable: true })
    .custom(validateMoneyValue(ERROR_MESSAGES.PRICE_RANGE))
    .bail()
    .toFloat(),

  body("discount")
    .optional({ nullable: true })
    .custom(validateMoneyValue(ERROR_MESSAGES.DISCOUNT_RANGE))
    .bail()
    .custom(validateDiscountNotAbovePrice)
    .bail()
    .toFloat(),

  body("duration")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.DURATION_INTEGER)
    .bail()
    .toInt(),

  body("maxStudents")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.MAX_STUDENTS_INTEGER)
    .bail()
    .toInt(),

  body("isActive")
    .optional({ nullable: true })
    .isBoolean()
    .withMessage(ERROR_MESSAGES.IS_ACTIVE_BOOLEAN)
    .bail()
    .toBoolean(),
];

export const uploadMaterialValidation = [
  body("title")
    .isString()
    .withMessage(ERROR_MESSAGES.MATERIAL_TITLE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.MATERIAL_TITLE_REQUIRED)
    .bail()
    .isLength({ min: 2, max: 200 })
    .withMessage(ERROR_MESSAGES.MATERIAL_TITLE_LENGTH),

  body("description")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.MATERIAL_DESCRIPTION_STRING)
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage(ERROR_MESSAGES.MATERIAL_DESCRIPTION_LENGTH),

  body("fileUrl")
    .isString()
    .withMessage(ERROR_MESSAGES.FILE_URL_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.FILE_URL_REQUIRED)
    .bail()
    .custom(
      validateUrlOrUploadPathForFolders(ERROR_MESSAGES.FILE_URL_INVALID, [
        "documents",
      ]),
    ),

  body("fileType")
    .isString()
    .withMessage(ERROR_MESSAGES.FILE_TYPE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.FILE_TYPE_REQUIRED)
    .bail()
    .isLength({ max: 100 })
    .withMessage(ERROR_MESSAGES.FILE_TYPE_LENGTH),

  body("fileSize")
    .notEmpty()
    .withMessage(ERROR_MESSAGES.FILE_SIZE_REQUIRED)
    .bail()
    .isInt({ min: 0 })
    .withMessage(ERROR_MESSAGES.FILE_SIZE_INTEGER)
    .bail()
    .toInt(),

  body("isDownloadable")
    .optional({ nullable: true })
    .isBoolean()
    .withMessage(ERROR_MESSAGES.IS_DOWNLOADABLE_BOOLEAN)
    .bail()
    .toBoolean(),
];

export const updateMaterialValidation = [
  body("title")
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.TITLE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.TITLE_REQUIRED)
    .bail()
    .isLength({ min: 2, max: 200 })
    .withMessage(ERROR_MESSAGES.MATERIAL_TITLE_LENGTH),

  body("description")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.MATERIAL_DESCRIPTION_STRING)
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage(ERROR_MESSAGES.MATERIAL_DESCRIPTION_LENGTH),

  body("fileUrl")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.FILE_URL_STRING)
    .bail()
    .trim()
    .custom(
      validateUrlOrUploadPathForFolders(ERROR_MESSAGES.FILE_URL_INVALID, [
        "documents",
      ]),
    ),

  body("fileType")
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.FILE_TYPE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.FILE_TYPE_EMPTY)
    .bail()
    .isLength({ max: 100 })
    .withMessage(ERROR_MESSAGES.FILE_TYPE_LENGTH),

  body("fileSize")
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage(ERROR_MESSAGES.FILE_SIZE_INTEGER)
    .bail()
    .toInt(),

  body("isDownloadable")
    .optional({ nullable: true })
    .isBoolean()
    .withMessage(ERROR_MESSAGES.IS_DOWNLOADABLE_BOOLEAN)
    .bail()
    .toBoolean(),
];

export const getCoursesValidation = [
  query("search")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.SEARCH_STRING)
    .bail()
    .trim()
    .isLength({ max: 100 })
    .withMessage(ERROR_MESSAGES.SEARCH_LENGTH),

  query("category")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.COURSE_CATEGORY_STRING)
    .bail()
    .trim()
    .isLength({ max: 100 })
    .withMessage(ERROR_MESSAGES.COURSE_CATEGORY_LENGTH),

  query("teacherId")
    .optional({ nullable: true, checkFalsy: true })
    .isUUID()
    .withMessage(ERROR_MESSAGES.TEACHER_ID_UUID),

  query("courseType")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.COURSE_TYPE_STRING)
    .bail()
    .trim()
    .isIn(COURSE_TYPES)
    .withMessage(ERROR_MESSAGES.COURSE_TYPE_INVALID),

  query("minRating")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0, max: 5 })
    .withMessage(ERROR_MESSAGES.MIN_RATING_RANGE)
    .bail()
    .toFloat(),

  query("minPrice")
    .optional({ nullable: true, checkFalsy: true })
    .custom(validateMoneyValue(ERROR_MESSAGES.MIN_PRICE_VALID))
    .bail()
    .toFloat(),

  query("maxPrice")
    .optional({ nullable: true, checkFalsy: true })
    .custom(validateMoneyValue(ERROR_MESSAGES.MAX_PRICE_VALID))
    .bail()
    .custom(validateMaxPriceNotBelowMinPrice)
    .bail()
    .toFloat(),

  query("sortBy")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.SORT_BY_INVALID)
    .bail()
    .trim()
    .isIn([...SORT_BY_VALUES])
    .withMessage(ERROR_MESSAGES.SORT_BY_INVALID),

  query("sortOrder")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.SORT_ORDER_INVALID)
    .bail()
    .trim()
    .isIn([...SORT_ORDER_VALUES])
    .withMessage(ERROR_MESSAGES.SORT_ORDER_INVALID),

  query("page")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.PAGE_INTEGER)
    .bail()
    .toInt(),

  query("limit")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1, max: 100 })
    .withMessage(ERROR_MESSAGES.LIMIT_RANGE)
    .bail()
    .toInt(),
];

import { body, query } from 'express-validator';
import { LessonType } from '@prisma/client';

/**
 * Validation rules for course endpoints
 */

export const COURSE_TYPES = ['LIVE', 'RECORDED', 'HYBRID'] as const;

// Error messages constants
const ERROR_MESSAGES = {
  COURSE_TITLE_STRING: 'Course title must be a string',
  COURSE_TITLE_REQUIRED: 'Course title is required',
  COURSE_TITLE_LENGTH: 'Title must be between 5 and 200 characters',
  COURSE_DESCRIPTION_STRING: 'Course description must be a string',
  COURSE_DESCRIPTION_REQUIRED: 'Course description is required',
  COURSE_DESCRIPTION_LENGTH: 'Description must be between 20 and 2000 characters',
  COURSE_CATEGORY_STRING: 'Course category must be a string',
  COURSE_CATEGORY_REQUIRED: 'Course category is required',
  COURSE_TYPE_STRING: 'Course type must be a string',
  COURSE_TYPE_INVALID: 'Course type must be LIVE, RECORDED, or HYBRID',
  THUMBNAIL_STRING: 'Thumbnail must be a string URL or file path',
  THUMBNAIL_INVALID: 'Thumbnail must be a valid URL or file path',
  PREVIEW_VIDEO_STRING: 'Preview video URL must be a string URL or file path',
  PREVIEW_VIDEO_INVALID: 'Preview video URL must be a valid URL or file path',
  TITLE_STRING: 'Title must be a string',
  TITLE_LENGTH: 'Title must not exceed 200 characters',
  DESCRIPTION_STRING: 'Description must be a string',
  DESCRIPTION_LENGTH: 'Description must not exceed 1000 characters',
  CATEGORY_STRING: 'Category must be a string',
  CATEGORY_EMPTY: 'Category cannot be empty',
  IS_PUBLISHED_BOOLEAN: 'isPublished must be a boolean',
  LESSON_TITLE_STRING: 'Lesson title must be a string',
  LESSON_TITLE_REQUIRED: 'Lesson title is required',
  LESSON_TITLE_LENGTH: 'Title must not exceed 200 characters',
  LESSON_DESCRIPTION_STRING: 'Description must be a string',
  LESSON_DESCRIPTION_LENGTH: 'Description must not exceed 1000 characters',
  LESSON_TYPE_STRING: 'Lesson type must be a string',
  LESSON_TYPE_REQUIRED: 'Lesson type is required',
  LESSON_TYPE_INVALID: 'Invalid lesson type',
  DURATION_INTEGER: 'Duration must be a positive integer',
  VIDEO_URL_STRING: 'Video URL must be a string URL or file path',
  VIDEO_URL_INVALID: 'Video URL must be a valid URL or file path',
  IS_FREE_BOOLEAN: 'isFree must be a boolean',
  ORDER_INDEX_INTEGER: 'Order index must be a positive integer',
  PACKAGE_NAME_STRING: 'Package name must be a string',
  PACKAGE_NAME_REQUIRED: 'Package name is required',
  PACKAGE_NAME_LENGTH: 'Name must not exceed 200 characters',
  PACKAGE_DESCRIPTION_STRING: 'Description must be a string',
  PACKAGE_DESCRIPTION_LENGTH: 'Description must not exceed 1000 characters',
  PRICE_REQUIRED: 'Price is required',
  PRICE_POSITIVE: 'Price must be a positive number',
  DISCOUNT_POSITIVE: 'Discount must be a positive number',
  MAX_STUDENTS_INTEGER: 'Max students must be a positive integer',
  IS_ACTIVE_BOOLEAN: 'isActive must be a boolean',
  MATERIAL_TITLE_STRING: 'Material title must be a string',
  MATERIAL_TITLE_REQUIRED: 'Material title is required',
  MATERIAL_TITLE_LENGTH: 'Title must not exceed 200 characters',
  MATERIAL_DESCRIPTION_STRING: 'Description must be a string',
  MATERIAL_DESCRIPTION_LENGTH: 'Description must not exceed 500 characters',
  FILE_URL_STRING: 'File URL must be a string URL or file path',
  FILE_URL_REQUIRED: 'File URL is required',
  FILE_URL_INVALID: 'File URL must be a valid URL or file path',
  FILE_TYPE_STRING: 'File type must be a string',
  FILE_TYPE_REQUIRED: 'File type is required',
  FILE_TYPE_EMPTY: 'File type cannot be empty',
  FILE_SIZE_REQUIRED: 'File size is required',
  FILE_SIZE_INTEGER: 'File size must be a non-negative integer',
  IS_DOWNLOADABLE_BOOLEAN: 'isDownloadable must be a boolean',
  SEARCH_STRING: 'Search must be a string',
  TEACHER_ID_UUID: 'teacherId must be a valid UUID',
  MIN_RATING_RANGE: 'minRating must be between 0 and 5',
  MIN_PRICE_POSITIVE: 'minPrice must be a positive number',
  MAX_PRICE_POSITIVE: 'maxPrice must be a positive number',
  MAX_PRICE_GREATER: 'maxPrice must be greater than or equal to minPrice',
  SORT_BY_INVALID: 'Invalid sortBy value',
  SORT_ORDER_INVALID: 'sortOrder must be asc or desc',
  PAGE_INTEGER: 'Page must be a positive integer',
  LIMIT_RANGE: 'Limit must be between 1 and 100',
} as const;

/**
 * Validates that a value is either a valid URL or a file path
 * Allows undefined, null, or empty strings for optional fields
 */
const validateUrlOrPath = (errorMessage: string) => (value: unknown) => {
  // Allow undefined, null, or empty string (these are optional fields)
  if (value === undefined || value === null || value === '') {
    return true;
  }
  if (typeof value !== 'string') {
    throw new Error(errorMessage);
  }
  const trimmedValue = value.trim();
  if (trimmedValue === '') {
    return true; // Allow empty after trimming
  }
  const isUrl = /^https?:\/\/.+/.test(trimmedValue);
  const isRelativePath = trimmedValue.startsWith('/');
  if (!isUrl && !isRelativePath) {
    throw new Error(errorMessage);
  }
  return true;
};

export const createCourseValidation = [
  body('title')
    .isString().withMessage(ERROR_MESSAGES.COURSE_TITLE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.COURSE_TITLE_REQUIRED)
    .bail()
    .isLength({ min: 5, max: 200 })
    .withMessage(ERROR_MESSAGES.COURSE_TITLE_LENGTH),

  body('description')
    .isString().withMessage(ERROR_MESSAGES.COURSE_DESCRIPTION_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.COURSE_DESCRIPTION_REQUIRED)
    .bail()
    .isLength({ min: 20, max: 2000 })
    .withMessage(ERROR_MESSAGES.COURSE_DESCRIPTION_LENGTH),

  body('category')
    .isString().withMessage(ERROR_MESSAGES.COURSE_CATEGORY_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.COURSE_CATEGORY_REQUIRED),

  body('courseType')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.COURSE_TYPE_STRING)
    .bail()
    .trim()
    .isIn([...COURSE_TYPES])
    .withMessage(ERROR_MESSAGES.COURSE_TYPE_INVALID),

  body('thumbnail')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.THUMBNAIL_STRING)
    .bail()
    .trim()
    .custom(validateUrlOrPath(ERROR_MESSAGES.THUMBNAIL_INVALID)),

  body('previewVideoUrl')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.PREVIEW_VIDEO_STRING)
    .bail()
    .trim()
    .custom(validateUrlOrPath(ERROR_MESSAGES.PREVIEW_VIDEO_INVALID)),
];

export const updateCourseValidation = [
  body('title')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.TITLE_STRING)
    .bail()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage(ERROR_MESSAGES.COURSE_TITLE_LENGTH),

  body('description')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.DESCRIPTION_STRING)
    .bail()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage(ERROR_MESSAGES.COURSE_DESCRIPTION_LENGTH),

  body('category')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.CATEGORY_STRING)
    .bail()
    .trim()
    .if((value) => value !== undefined && value !== null)
    .notEmpty()
    .withMessage(ERROR_MESSAGES.CATEGORY_EMPTY),

  body('courseType')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.COURSE_TYPE_STRING)
    .bail()
    .trim()
    .isIn([...COURSE_TYPES])
    .withMessage(ERROR_MESSAGES.COURSE_TYPE_INVALID),

  body('thumbnail')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.THUMBNAIL_STRING)
    .bail()
    .trim()
    .custom(validateUrlOrPath(ERROR_MESSAGES.THUMBNAIL_INVALID)),

  body('previewVideoUrl')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.PREVIEW_VIDEO_STRING)
    .bail()
    .trim()
    .custom(validateUrlOrPath(ERROR_MESSAGES.PREVIEW_VIDEO_INVALID)),

  body('isPublished')
    .optional({ nullable: true })
    .isBoolean().withMessage(ERROR_MESSAGES.IS_PUBLISHED_BOOLEAN)
    .bail()
    .toBoolean(),
];

export const createLessonValidation = [
  body('title')
    .isString().withMessage(ERROR_MESSAGES.LESSON_TITLE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.LESSON_TITLE_REQUIRED)
    .bail()
    .isLength({ max: 200 })
    .withMessage(ERROR_MESSAGES.LESSON_TITLE_LENGTH),

  body('description')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.LESSON_DESCRIPTION_STRING)
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(ERROR_MESSAGES.LESSON_DESCRIPTION_LENGTH),

  body('type')
    .isString().withMessage(ERROR_MESSAGES.LESSON_TYPE_STRING)
    .bail()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.LESSON_TYPE_REQUIRED)
    .bail()
    .isIn(Object.values(LessonType))
    .withMessage(ERROR_MESSAGES.LESSON_TYPE_INVALID),

  body('duration')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.DURATION_INTEGER)
    .bail()
    .toInt(),

  body('videoUrl')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.VIDEO_URL_STRING)
    .bail()
    .trim()
    .custom(validateUrlOrPath(ERROR_MESSAGES.VIDEO_URL_INVALID)),

  body('isFree')
    .optional({ nullable: true })
    .isBoolean().withMessage(ERROR_MESSAGES.IS_FREE_BOOLEAN)
    .bail()
    .toBoolean(),
];

export const updateLessonValidation = [
  body('title')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.TITLE_STRING)
    .bail()
    .trim()
    .isLength({ max: 200 })
    .withMessage(ERROR_MESSAGES.LESSON_TITLE_LENGTH),

  body('description')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.LESSON_DESCRIPTION_STRING)
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(ERROR_MESSAGES.LESSON_DESCRIPTION_LENGTH),

  body('type')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.LESSON_TYPE_STRING)
    .bail()
    .trim()
    .if((value) => value !== undefined && value !== null && value !== '')
    .isIn(Object.values(LessonType))
    .withMessage(ERROR_MESSAGES.LESSON_TYPE_INVALID),

  body('duration')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.DURATION_INTEGER)
    .bail()
    .toInt(),

  body('videoUrl')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.VIDEO_URL_STRING)
    .bail()
    .trim()
    .custom(validateUrlOrPath(ERROR_MESSAGES.VIDEO_URL_INVALID)),

  body('isFree')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage(ERROR_MESSAGES.IS_FREE_BOOLEAN)
    .bail()
    .toBoolean(),

  body('orderIndex')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.ORDER_INDEX_INTEGER)
    .bail()
    .toInt(),
];

export const createPackageValidation = [
  body('name')
    .isString().withMessage(ERROR_MESSAGES.PACKAGE_NAME_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.PACKAGE_NAME_REQUIRED)
    .bail()
    .isLength({ max: 200 })
    .withMessage(ERROR_MESSAGES.PACKAGE_NAME_LENGTH),

  body('description')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.PACKAGE_DESCRIPTION_STRING)
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(ERROR_MESSAGES.PACKAGE_DESCRIPTION_LENGTH),

  body('price')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.PRICE_REQUIRED)
    .bail()
    .isFloat({ min: 0 })
    .withMessage(ERROR_MESSAGES.PRICE_POSITIVE)
    .bail()
    .toFloat(),

  body('discount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage(ERROR_MESSAGES.DISCOUNT_POSITIVE)
    .bail()
    .toFloat(),

  body('duration')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.DURATION_INTEGER)
    .bail()
    .toInt(),

  body('maxStudents')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.MAX_STUDENTS_INTEGER)
    .bail()
    .toInt(),
];

export const updatePackageValidation = [
  body('name')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.PACKAGE_NAME_STRING)
    .bail()
    .trim()
    .isLength({ max: 200 })
    .withMessage(ERROR_MESSAGES.PACKAGE_NAME_LENGTH),

  body('description')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.PACKAGE_DESCRIPTION_STRING)
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(ERROR_MESSAGES.PACKAGE_DESCRIPTION_LENGTH),

  body('price')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage(ERROR_MESSAGES.PRICE_POSITIVE)
    .bail()
    .toFloat(),

  body('discount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage(ERROR_MESSAGES.DISCOUNT_POSITIVE)
    .bail()
    .toFloat(),

  body('duration')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.DURATION_INTEGER)
    .bail()
    .toInt(),

  body('maxStudents')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.MAX_STUDENTS_INTEGER)
    .bail()
    .toInt(),

  body('isActive')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage(ERROR_MESSAGES.IS_ACTIVE_BOOLEAN)
    .bail()
    .toBoolean(),
];

export const uploadMaterialValidation = [
  body('title')
    .isString().withMessage(ERROR_MESSAGES.MATERIAL_TITLE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.MATERIAL_TITLE_REQUIRED)
    .bail()
    .isLength({ max: 200 })
    .withMessage(ERROR_MESSAGES.MATERIAL_TITLE_LENGTH),

  body('description')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.MATERIAL_DESCRIPTION_STRING)
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage(ERROR_MESSAGES.MATERIAL_DESCRIPTION_LENGTH),

  body('fileUrl')
    .isString().withMessage(ERROR_MESSAGES.FILE_URL_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.FILE_URL_REQUIRED)
    .bail()
    .custom(validateUrlOrPath(ERROR_MESSAGES.FILE_URL_INVALID)),

  body('fileType')
    .isString().withMessage(ERROR_MESSAGES.FILE_TYPE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.FILE_TYPE_REQUIRED),

  body('fileSize')
    .notEmpty()
    .withMessage(ERROR_MESSAGES.FILE_SIZE_REQUIRED)
    .bail()
    .isInt({ min: 0 })
    .withMessage(ERROR_MESSAGES.FILE_SIZE_INTEGER)
    .bail()
    .toInt(),

  body('isDownloadable')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage(ERROR_MESSAGES.IS_DOWNLOADABLE_BOOLEAN)
    .bail()
    .toBoolean(),
];

export const updateMaterialValidation = [
  body('title')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.TITLE_STRING)
    .bail()
    .trim()
    .isLength({ max: 200 })
    .withMessage(ERROR_MESSAGES.MATERIAL_TITLE_LENGTH),

  body('description')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.MATERIAL_DESCRIPTION_STRING)
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage(ERROR_MESSAGES.MATERIAL_DESCRIPTION_LENGTH),

  body('fileUrl')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.FILE_URL_STRING)
    .bail()
    .trim()
    .if((value) => value !== undefined && value !== null && value !== '')
    .custom(validateUrlOrPath(ERROR_MESSAGES.FILE_URL_INVALID)),

  body('fileType')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.FILE_TYPE_STRING)
    .bail()
    .trim()
    .if((value) => value !== undefined && value !== null)
    .notEmpty()
    .withMessage(ERROR_MESSAGES.FILE_TYPE_EMPTY),

  body('fileSize')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage(ERROR_MESSAGES.FILE_SIZE_INTEGER)
    .bail()
    .toInt(),

  body('isDownloadable')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage(ERROR_MESSAGES.IS_DOWNLOADABLE_BOOLEAN)
    .bail()
    .toBoolean(),
];

export const getCoursesValidation = [
  query('search').optional({ nullable: true }).isString().trim(),
  query('category').optional({ nullable: true }).isString().trim(),
  query('teacherId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage(ERROR_MESSAGES.TEACHER_ID_UUID),
  query('courseType')
    .optional({ nullable: true })
    .isIn([...COURSE_TYPES])
    .withMessage(ERROR_MESSAGES.COURSE_TYPE_INVALID),
  query('minRating')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 5 })
    .withMessage(ERROR_MESSAGES.MIN_RATING_RANGE)
    .bail()
    .toFloat(),
  query('minPrice')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage(ERROR_MESSAGES.MIN_PRICE_POSITIVE)
    .bail()
    .toFloat(),
  query('maxPrice')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage(ERROR_MESSAGES.MAX_PRICE_POSITIVE)
    .bail()
    .toFloat()
    .custom((value, { req }) => {
      const min = (req as any)?.query?.minPrice as unknown as number | undefined;
      const max = value as unknown as number | undefined;
      if (min !== undefined && max !== undefined && Number(min) > Number(max)) {
        throw new Error(ERROR_MESSAGES.MAX_PRICE_GREATER);
      }
      return true;
    }),
  query('sortBy')
    .optional({ nullable: true })
    .isIn(['NEWEST', 'RATING', 'POPULARITY', 'PRICE_ASC', 'PRICE_DESC'])
    .withMessage(ERROR_MESSAGES.SORT_BY_INVALID),
  query('sortOrder')
    .optional({ nullable: true })
    .isIn(['asc', 'desc'])
    .withMessage(ERROR_MESSAGES.SORT_ORDER_INVALID),
  query('page')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage(ERROR_MESSAGES.PAGE_INTEGER)
    .bail()
    .toInt(),
  query('limit')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 100 })
    .withMessage(ERROR_MESSAGES.LIMIT_RANGE)
    .bail()
    .toInt(),
];

export default {
  createCourseValidation,
  updateCourseValidation,
  createLessonValidation,
  updateLessonValidation,
  createPackageValidation,
  updatePackageValidation,
  uploadMaterialValidation,
  getCoursesValidation,
};

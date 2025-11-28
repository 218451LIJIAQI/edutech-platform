import { body, query } from 'express-validator';
import { LessonType } from '@prisma/client';

/**
 * Validation rules for course endpoints
 */

const COURSE_TYPES = ['LIVE', 'RECORDED', 'HYBRID'] as const;

const validateUrlOrPath = (label: string) => (value: unknown) => {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string URL or file path`);
  }
  const isUrl = /^https?:\/\/.+/.test(value);
  const isRelativePath = value.startsWith('/');
  if (!isUrl && !isRelativePath) {
    throw new Error(`${label} must be a valid URL or file path`);
  }
  return true;
};

export const createCourseValidation = [
  body('title')
    .isString().withMessage('Course title must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Course title is required')
    .bail()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),

  body('description')
    .isString().withMessage('Course description must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Course description is required')
    .bail()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('category')
    .isString().withMessage('Course category must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Course category is required'),

  body('courseType')
    .optional({ nullable: true })
    .isString().withMessage('Course type must be a string')
    .bail()
    .trim()
    .isIn([...COURSE_TYPES])
    .withMessage('Course type must be LIVE, RECORDED, or HYBRID'),

  body('thumbnail')
    .optional({ nullable: true })
    .isString().withMessage('Thumbnail must be a string URL or file path')
    .bail()
    .trim()
    .custom(validateUrlOrPath('Thumbnail')),

  body('previewVideoUrl')
    .optional({ nullable: true })
    .isString().withMessage('Preview video URL must be a string URL or file path')
    .bail()
    .trim()
    .custom(validateUrlOrPath('Preview video URL')),
];

export const updateCourseValidation = [
  body('title')
    .optional({ nullable: true })
    .isString().withMessage('Title must be a string')
    .bail()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),

  body('description')
    .optional({ nullable: true })
    .isString().withMessage('Description must be a string')
    .bail()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('category')
    .optional({ nullable: true })
    .isString().withMessage('Category must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty'),

  body('courseType')
    .optional({ nullable: true })
    .isString().withMessage('Course type must be a string')
    .bail()
    .trim()
    .isIn([...COURSE_TYPES])
    .withMessage('Course type must be LIVE, RECORDED, or HYBRID'),

  body('thumbnail')
    .optional({ nullable: true })
    .isString().withMessage('Thumbnail must be a string URL or file path')
    .bail()
    .trim()
    .custom(validateUrlOrPath('Thumbnail')),

  body('previewVideoUrl')
    .optional({ nullable: true })
    .isString().withMessage('Preview video URL must be a string URL or file path')
    .bail()
    .trim()
    .custom(validateUrlOrPath('Preview video URL')),

  body('isPublished')
    .optional({ nullable: true })
    .isBoolean().withMessage('isPublished must be a boolean')
    .bail()
    .toBoolean(),
];

export const createLessonValidation = [
  body('title')
    .isString().withMessage('Lesson title must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Lesson title is required')
    .bail()
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),

  body('description')
    .optional({ nullable: true })
    .isString().withMessage('Description must be a string')
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  body('type')
    .isString().withMessage('Lesson type must be a string')
    .bail()
    .notEmpty()
    .withMessage('Lesson type is required')
    .bail()
    .isIn(Object.values(LessonType))
    .withMessage('Invalid lesson type'),

  body('duration')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer')
    .bail()
    .toInt(),

  body('videoUrl')
    .optional({ nullable: true })
    .isString().withMessage('Video URL must be a string URL or file path')
    .bail()
    .trim()
    .custom(validateUrlOrPath('Video URL')),

  body('isFree')
    .optional({ nullable: true })
    .isBoolean().withMessage('isFree must be a boolean')
    .bail()
    .toBoolean(),
];

export const updateLessonValidation = [
  body('title')
    .optional({ nullable: true })
    .isString().withMessage('Title must be a string')
    .bail()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),

  body('description')
    .optional({ nullable: true })
    .isString().withMessage('Description must be a string')
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  body('type')
    .optional({ nullable: true })
    .isString().withMessage('Lesson type must be a string')
    .bail()
    .isIn(Object.values(LessonType))
    .withMessage('Invalid lesson type'),

  body('duration')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer')
    .bail()
    .toInt(),

  body('videoUrl')
    .optional({ nullable: true })
    .isString().withMessage('Video URL must be a string URL or file path')
    .bail()
    .trim()
    .custom(validateUrlOrPath('Video URL')),

  body('isFree')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('isFree must be a boolean')
    .bail()
    .toBoolean(),

  body('orderIndex')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Order index must be a positive integer')
    .bail()
    .toInt(),
];

export const createPackageValidation = [
  body('name')
    .isString().withMessage('Package name must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Package name is required')
    .bail()
    .isLength({ max: 200 })
    .withMessage('Name must not exceed 200 characters'),

  body('description')
    .optional({ nullable: true })
    .isString().withMessage('Description must be a string')
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .bail()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
    .bail()
    .toFloat(),

  body('discount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Discount must be a positive number')
    .bail()
    .toFloat(),

  body('duration')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer')
    .bail()
    .toInt(),

  body('maxStudents')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Max students must be a positive integer')
    .bail()
    .toInt(),
];

export const updatePackageValidation = [
  body('name')
    .optional({ nullable: true })
    .isString().withMessage('Name must be a string')
    .bail()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Name must not exceed 200 characters'),

  body('description')
    .optional({ nullable: true })
    .isString().withMessage('Description must be a string')
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  body('price')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
    .bail()
    .toFloat(),

  body('discount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Discount must be a positive number')
    .bail()
    .toFloat(),

  body('duration')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer')
    .bail()
    .toInt(),

  body('maxStudents')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Max students must be a positive integer')
    .bail()
    .toInt(),

  body('isActive')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('isActive must be a boolean')
    .bail()
    .toBoolean(),
];

export const uploadMaterialValidation = [
  body('title')
    .isString().withMessage('Material title must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Material title is required')
    .bail()
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),

  body('description')
    .optional({ nullable: true })
    .isString().withMessage('Description must be a string')
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),

  body('fileUrl')
    .isString().withMessage('File URL must be a string URL or file path')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('File URL is required')
    .bail()
    .custom(validateUrlOrPath('File URL')),

  body('fileType')
    .isString().withMessage('File type must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('File type is required'),

  body('fileSize')
    .notEmpty()
    .withMessage('File size is required')
    .bail()
    .isInt({ min: 0 })
    .withMessage('File size must be a non-negative integer')
    .bail()
    .toInt(),

  body('isDownloadable')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('isDownloadable must be a boolean')
    .bail()
    .toBoolean(),
];

export const updateMaterialValidation = [
  body('title')
    .optional({ nullable: true })
    .isString().withMessage('Title must be a string')
    .bail()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),

  body('description')
    .optional({ nullable: true })
    .isString().withMessage('Description must be a string')
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),

  body('fileUrl')
    .optional({ nullable: true })
    .isString().withMessage('File URL must be a string URL or file path')
    .bail()
    .trim()
    .custom(validateUrlOrPath('File URL')),

  body('fileType')
    .optional({ nullable: true })
    .isString().withMessage('File type must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('File type cannot be empty'),

  body('fileSize')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('File size must be a non-negative integer')
    .bail()
    .toInt(),

  body('isDownloadable')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('isDownloadable must be a boolean')
    .bail()
    .toBoolean(),
];

export const getCoursesValidation = [
  query('search').optional({ nullable: true }).isString().trim(),
  query('category').optional({ nullable: true }).isString().trim(),
  query('teacherId').optional({ nullable: true }).isUUID().withMessage('teacherId must be a valid UUID'),
  query('courseType')
    .optional({ nullable: true })
    .isIn([...COURSE_TYPES])
    .withMessage('courseType must be LIVE, RECORDED, or HYBRID'),
  query('minRating')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 5 })
    .withMessage('minRating must be between 0 and 5')
    .bail()
    .toFloat(),
  query('minPrice')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('minPrice must be a positive number')
    .bail()
    .toFloat(),
  query('maxPrice')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('maxPrice must be a positive number')
    .bail()
    .toFloat()
    .custom((value, { req }) => {
      const min = (req as any)?.query?.minPrice as unknown as number | undefined;
      const max = value as unknown as number | undefined;
      if (min !== undefined && max !== undefined && Number(min) > Number(max)) {
        throw new Error('maxPrice must be greater than or equal to minPrice');
      }
      return true;
    }),
  query('sortBy')
    .optional({ nullable: true })
    .isIn(['NEWEST', 'RATING', 'POPULARITY', 'PRICE_ASC', 'PRICE_DESC'])
    .withMessage('Invalid sortBy value'),
  query('sortOrder')
    .optional({ nullable: true })
    .isIn(['asc', 'desc'])
    .withMessage('sortOrder must be asc or desc'),
  query('page')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .bail()
    .toInt(),
  query('limit')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
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

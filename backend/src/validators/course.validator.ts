import { body, query } from 'express-validator';
import { LessonType } from '@prisma/client';

/**
 * Validation rules for course endpoints
 */

export const createCourseValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Course title is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Course description is required')
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Course category is required'),

  body('courseType')
    .optional()
    .trim()
    .isIn(['LIVE', 'RECORDED', 'HYBRID'])
    .withMessage('Course type must be LIVE, RECORDED, or HYBRID'),

  body('thumbnail')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      // Allow both full URLs and relative paths
      const isUrl = /^https?:\/\/.+/.test(value);
      const isRelativePath = value.startsWith('/');
      if (!isUrl && !isRelativePath) {
        throw new Error('Thumbnail must be a valid URL or path');
      }
      return true;
    })
    .withMessage('Thumbnail must be a valid URL or file path'),

  body('previewVideoUrl')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      // Allow both full URLs and relative paths
      const isUrl = /^https?:\/\/.+/.test(value);
      const isRelativePath = value.startsWith('/');
      if (!isUrl && !isRelativePath) {
        throw new Error('Preview video URL must be a valid URL or path');
      }
      return true;
    })
    .withMessage('Preview video URL must be a valid URL or file path'),
];

export const updateCourseValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),

  body('courseType')
    .optional()
    .trim()
    .isIn(['LIVE', 'RECORDED', 'HYBRID'])
    .withMessage('Course type must be LIVE, RECORDED, or HYBRID'),

  body('thumbnail')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      // Allow both full URLs and relative paths
      const isUrl = /^https?:\/\/.+/.test(value);
      const isRelativePath = value.startsWith('/');
      if (!isUrl && !isRelativePath) {
        throw new Error('Thumbnail must be a valid URL or path');
      }
      return true;
    })
    .withMessage('Thumbnail must be a valid URL or file path'),

  body('previewVideoUrl')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      // Allow both full URLs and relative paths
      const isUrl = /^https?:\/\/.+/.test(value);
      const isRelativePath = value.startsWith('/');
      if (!isUrl && !isRelativePath) {
        throw new Error('Preview video URL must be a valid URL or path');
      }
      return true;
    })
    .withMessage('Preview video URL must be a valid URL or file path'),

  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean'),
];

export const createLessonValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Lesson title is required')
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  body('type')
    .notEmpty()
    .withMessage('Lesson type is required')
    .isIn(Object.values(LessonType))
    .withMessage('Invalid lesson type'),

  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),

  body('videoUrl')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      const isUrl = /^https?:\/\/.+/.test(value);
      const isRelativePath = value.startsWith('/');
      if (!isUrl && !isRelativePath) {
        throw new Error('Video URL must be a valid URL or path');
      }
      return true;
    })
    .withMessage('Video URL must be a valid URL or file path'),

  body('isFree')
    .optional()
    .isBoolean()
    .withMessage('isFree must be a boolean'),
];

export const updateLessonValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  body('type')
    .optional()
    .isIn(Object.values(LessonType))
    .withMessage('Invalid lesson type'),

  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),

  body('videoUrl')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      const isUrl = /^https?:\/\/.+/.test(value);
      const isRelativePath = value.startsWith('/');
      if (!isUrl && !isRelativePath) {
        throw new Error('Video URL must be a valid URL or path');
      }
      return true;
    })
    .withMessage('Video URL must be a valid URL or file path'),

  body('isFree')
    .optional()
    .isBoolean()
    .withMessage('isFree must be a boolean'),

  body('orderIndex')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order index must be a positive integer'),
];

export const createPackageValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Package name is required')
    .isLength({ max: 200 })
    .withMessage('Name must not exceed 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount must be a positive number'),

  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),

  body('maxStudents')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max students must be a positive integer'),
];

export const updatePackageValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Name must not exceed 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('discount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount must be a positive number'),

  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),

  body('maxStudents')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max students must be a positive integer'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

export const uploadMaterialValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Material title is required')
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),

  body('fileUrl')
    .trim()
    .notEmpty()
    .withMessage('File URL is required')
    .custom((value) => {
      if (!value) return true;
      const isUrl = /^https?:\/\/.+/.test(value);
      const isRelativePath = value.startsWith('/');
      if (!isUrl && !isRelativePath) {
        throw new Error('File URL must be a valid URL or path');
      }
      return true;
    })
    .withMessage('File URL must be a valid URL or file path'),

  body('fileType')
    .trim()
    .notEmpty()
    .withMessage('File type is required'),

  body('fileSize')
    .notEmpty()
    .withMessage('File size is required')
    .isInt({ min: 0 })
    .withMessage('File size must be a non-negative integer'),

  body('isDownloadable')
    .optional()
    .isBoolean()
    .withMessage('isDownloadable must be a boolean'),
];

export const updateMaterialValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),

  body('fileUrl')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      const isUrl = /^https?:\/\/.+/.test(value);
      const isRelativePath = value.startsWith('/');
      if (!isUrl && !isRelativePath) {
        throw new Error('File URL must be a valid URL or path');
      }
      return true;
    })
    .withMessage('File URL must be a valid URL or file path'),

  body('fileType')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('File type cannot be empty'),

  body('fileSize')
    .optional()
    .isInt({ min: 0 })
    .withMessage('File size must be a non-negative integer'),

  body('isDownloadable')
    .optional()
    .isBoolean()
    .withMessage('isDownloadable must be a boolean'),
];

export const getCoursesValidation = [
  query('search').optional().isString(),
  query('category').optional().isString(),
  query('teacherId').optional().isUUID().withMessage('teacherId must be a valid UUID'),
  query('courseType')
    .optional()
    .isIn(['LIVE', 'RECORDED', 'HYBRID'])
    .withMessage('courseType must be LIVE, RECORDED, or HYBRID'),
  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('minRating must be between 0 and 5'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minPrice must be a positive number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('maxPrice must be a positive number'),
  query('sortBy')
    .optional()
    .isIn(['NEWEST', 'RATING', 'POPULARITY', 'PRICE_ASC', 'PRICE_DESC'])
    .withMessage('Invalid sortBy value'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('sortOrder must be asc or desc'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
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


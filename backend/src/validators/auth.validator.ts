import { body } from 'express-validator';
import { UserRole } from '@prisma/client';

/**
 * Validation rules for authentication endpoints
 */

const passwordComplexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export const registerValidation = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .bail()
    .normalizeEmail(),

  body('password')
    .isString().withMessage('Password must be a string')
    .bail()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .bail()
    .matches(passwordComplexity)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('firstName')
    .isString().withMessage('First name must be a string')
    .bail()
    .trim()
    .notEmpty().withMessage('First name is required')
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .isString().withMessage('Last name must be a string')
    .bail()
    .trim()
    .notEmpty().withMessage('Last name is required')
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),

  body('role')
    .optional({ nullable: true })
    .isString().withMessage('Role must be a string')
    .bail()
    .isIn(Object.values(UserRole))
    .withMessage('Invalid role'),
];

export const loginValidation = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .bail()
    .normalizeEmail(),

  body('password')
    .isString().withMessage('Password must be a string')
    .bail()
    .notEmpty().withMessage('Password is required'),
];

export const refreshTokenValidation = [
  body('refreshToken')
    .isString().withMessage('Refresh token must be a string')
    .bail()
    .notEmpty().withMessage('Refresh token is required'),
];

export const updateProfileValidation = [
  body('firstName')
    .optional({ nullable: true })
    .isString().withMessage('First name must be a string')
    .bail()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .optional({ nullable: true })
    .isString().withMessage('Last name must be a string')
    .bail()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),

  body('avatar')
    .optional({ nullable: true })
    .isURL()
    .withMessage('Avatar must be a valid URL'),
];

export const changePasswordValidation = [
  body('currentPassword')
    .isString().withMessage('Current password must be a string')
    .bail()
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .isString().withMessage('New password must be a string')
    .bail()
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .bail()
    .matches(passwordComplexity)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
    .bail()
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from current password'),
];

export default {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  updateProfileValidation,
  changePasswordValidation,
};

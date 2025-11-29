import { body } from 'express-validator';
import { UserRole } from '@prisma/client';

/**
 * Validation rules for authentication endpoints
 */

// Password must contain at least one lowercase, one uppercase, and one digit
const passwordComplexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

// Error messages constants
const ERROR_MESSAGES = {
  INVALID_EMAIL: 'Please provide a valid email address',
  PASSWORD_STRING: 'Password must be a string',
  PASSWORD_MIN_LENGTH: 'Password must be at least 8 characters long',
  PASSWORD_COMPLEXITY: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  FIRST_NAME_STRING: 'First name must be a string',
  FIRST_NAME_REQUIRED: 'First name is required',
  FIRST_NAME_LENGTH: 'First name must be between 2 and 50 characters',
  LAST_NAME_STRING: 'Last name must be a string',
  LAST_NAME_REQUIRED: 'Last name is required',
  LAST_NAME_LENGTH: 'Last name must be between 2 and 50 characters',
  ROLE_STRING: 'Role must be a string',
  INVALID_ROLE: 'Invalid role',
  PASSWORD_REQUIRED: 'Password is required',
  REFRESH_TOKEN_STRING: 'Refresh token must be a string',
  REFRESH_TOKEN_REQUIRED: 'Refresh token is required',
  AVATAR_URL: 'Avatar must be a valid URL',
  CURRENT_PASSWORD_STRING: 'Current password must be a string',
  CURRENT_PASSWORD_REQUIRED: 'Current password is required',
  NEW_PASSWORD_STRING: 'New password must be a string',
  NEW_PASSWORD_REQUIRED: 'New password is required',
  NEW_PASSWORD_MIN_LENGTH: 'New password must be at least 8 characters long',
  NEW_PASSWORD_DIFFERENT: 'New password must be different from current password',
} as const;

export const registerValidation = [
  body('email')
    .isEmail().withMessage(ERROR_MESSAGES.INVALID_EMAIL)
    .bail()
    .normalizeEmail(),

  body('password')
    .isString().withMessage(ERROR_MESSAGES.PASSWORD_STRING)
    .bail()
    .isLength({ min: 8 }).withMessage(ERROR_MESSAGES.PASSWORD_MIN_LENGTH)
    .bail()
    .matches(passwordComplexity)
    .withMessage(ERROR_MESSAGES.PASSWORD_COMPLEXITY),

  body('firstName')
    .isString().withMessage(ERROR_MESSAGES.FIRST_NAME_STRING)
    .bail()
    .trim()
    .notEmpty().withMessage(ERROR_MESSAGES.FIRST_NAME_REQUIRED)
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage(ERROR_MESSAGES.FIRST_NAME_LENGTH),

  body('lastName')
    .isString().withMessage(ERROR_MESSAGES.LAST_NAME_STRING)
    .bail()
    .trim()
    .notEmpty().withMessage(ERROR_MESSAGES.LAST_NAME_REQUIRED)
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage(ERROR_MESSAGES.LAST_NAME_LENGTH),

  body('role')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.ROLE_STRING)
    .bail()
    .isIn(Object.values(UserRole))
    .withMessage(ERROR_MESSAGES.INVALID_ROLE),
];

export const loginValidation = [
  body('email')
    .isEmail().withMessage(ERROR_MESSAGES.INVALID_EMAIL)
    .bail()
    .normalizeEmail(),

  body('password')
    .isString().withMessage(ERROR_MESSAGES.PASSWORD_STRING)
    .bail()
    .notEmpty().withMessage(ERROR_MESSAGES.PASSWORD_REQUIRED),
];

export const refreshTokenValidation = [
  body('refreshToken')
    .isString().withMessage(ERROR_MESSAGES.REFRESH_TOKEN_STRING)
    .bail()
    .notEmpty().withMessage(ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED),
];

export const updateProfileValidation = [
  body('firstName')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.FIRST_NAME_STRING)
    .bail()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(ERROR_MESSAGES.FIRST_NAME_LENGTH),

  body('lastName')
    .optional({ nullable: true })
    .isString().withMessage(ERROR_MESSAGES.LAST_NAME_STRING)
    .bail()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(ERROR_MESSAGES.LAST_NAME_LENGTH),

  body('avatar')
    .optional({ nullable: true })
    .isURL()
    .withMessage(ERROR_MESSAGES.AVATAR_URL),
];

export const changePasswordValidation = [
  body('currentPassword')
    .isString().withMessage(ERROR_MESSAGES.CURRENT_PASSWORD_STRING)
    .bail()
    .notEmpty().withMessage(ERROR_MESSAGES.CURRENT_PASSWORD_REQUIRED),

  body('newPassword')
    .isString().withMessage(ERROR_MESSAGES.NEW_PASSWORD_STRING)
    .bail()
    .notEmpty().withMessage(ERROR_MESSAGES.NEW_PASSWORD_REQUIRED)
    .bail()
    .isLength({ min: 8 })
    .withMessage(ERROR_MESSAGES.NEW_PASSWORD_MIN_LENGTH)
    .bail()
    .matches(passwordComplexity)
    .withMessage(ERROR_MESSAGES.PASSWORD_COMPLEXITY)
    .bail()
    .custom((value, { req }) => {
      const currentPassword = req.body.currentPassword;
      if (typeof currentPassword === 'string' && value === currentPassword) {
        throw new Error(ERROR_MESSAGES.NEW_PASSWORD_DIFFERENT);
      }
      return true;
    }),
];

export default {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  updateProfileValidation,
  changePasswordValidation,
};

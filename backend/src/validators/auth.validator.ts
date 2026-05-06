import { body } from "express-validator";
import { UserRole } from "@prisma/client";
import { validateUrlOrUploadPathForFolders } from "../utils/url-or-path";
import { hasRefreshTokenCookieHeader } from "../utils/auth-cookie";

/**
 * Validation rules for authentication endpoints.
 *
 * Security notes:
 * - Public registration only allows STUDENT and TEACHER roles.
 * - ADMIN accounts should be created through a protected admin process, not public registration.
 * - Passwords are limited to a reasonable maximum length to reduce abuse and hashing overhead.
 */

// Password must contain at least one lowercase letter, one uppercase letter, and one digit.
const passwordComplexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;

const ALLOWED_REGISTER_ROLES = [UserRole.STUDENT, UserRole.TEACHER];

// Error message constants
const ERROR_MESSAGES = {
  EMAIL_STRING: "Email must be a string",
  EMAIL_REQUIRED: "Email is required",
  INVALID_EMAIL: "Please provide a valid email address",

  PASSWORD_STRING: "Password must be a string",
  PASSWORD_REQUIRED: "Password is required",
  PASSWORD_MIN_LENGTH: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
  PASSWORD_MAX_LENGTH: `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`,
  PASSWORD_COMPLEXITY:
    "Password must contain at least one uppercase letter, one lowercase letter, and one number",

  FIRST_NAME_STRING: "First name must be a string",
  FIRST_NAME_REQUIRED: "First name is required",
  FIRST_NAME_LENGTH: "First name must be between 2 and 50 characters",

  LAST_NAME_STRING: "Last name must be a string",
  LAST_NAME_REQUIRED: "Last name is required",
  LAST_NAME_LENGTH: "Last name must be between 2 and 50 characters",

  ROLE_STRING: "Role must be a string",
  INVALID_ROLE:
    "Invalid role. Public registration only allows STUDENT or TEACHER",

  REFRESH_TOKEN_STRING: "Refresh token must be a string",
  REFRESH_TOKEN_REQUIRED: "Refresh token is required",

  AVATAR_URL:
    "Avatar must be an external URL or use the /uploads/avatars/ folder",

  CURRENT_PASSWORD_STRING: "Current password must be a string",
  CURRENT_PASSWORD_REQUIRED: "Current password is required",

  NEW_PASSWORD_STRING: "New password must be a string",
  NEW_PASSWORD_REQUIRED: "New password is required",
  NEW_PASSWORD_MIN_LENGTH: `New password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
  NEW_PASSWORD_MAX_LENGTH: `New password must not exceed ${PASSWORD_MAX_LENGTH} characters`,
  NEW_PASSWORD_DIFFERENT:
    "New password must be different from current password",

  RESET_TOKEN_STRING: "Password reset token must be a string",
  RESET_TOKEN_REQUIRED: "Password reset token is required",

  RESET_CODE_STRING: "Verification code must be a string",
  RESET_CODE_REQUIRED: "Verification code is required",
  RESET_CODE_FORMAT: "Verification code must be exactly 6 digits",
} as const;

const emailValidation = body("email")
  .isString()
  .withMessage(ERROR_MESSAGES.EMAIL_STRING)
  .bail()
  .trim()
  .notEmpty()
  .withMessage(ERROR_MESSAGES.EMAIL_REQUIRED)
  .bail()
  .isEmail()
  .withMessage(ERROR_MESSAGES.INVALID_EMAIL)
  .bail()
  .normalizeEmail();

const passwordValidation = body("password")
  .isString()
  .withMessage(ERROR_MESSAGES.PASSWORD_STRING)
  .bail()
  .notEmpty()
  .withMessage(ERROR_MESSAGES.PASSWORD_REQUIRED)
  .bail()
  .isLength({ min: PASSWORD_MIN_LENGTH })
  .withMessage(ERROR_MESSAGES.PASSWORD_MIN_LENGTH)
  .bail()
  .isLength({ max: PASSWORD_MAX_LENGTH })
  .withMessage(ERROR_MESSAGES.PASSWORD_MAX_LENGTH)
  .bail()
  .matches(passwordComplexity)
  .withMessage(ERROR_MESSAGES.PASSWORD_COMPLEXITY);

const newPasswordValidation = body("newPassword")
  .isString()
  .withMessage(ERROR_MESSAGES.NEW_PASSWORD_STRING)
  .bail()
  .notEmpty()
  .withMessage(ERROR_MESSAGES.NEW_PASSWORD_REQUIRED)
  .bail()
  .isLength({ min: PASSWORD_MIN_LENGTH })
  .withMessage(ERROR_MESSAGES.NEW_PASSWORD_MIN_LENGTH)
  .bail()
  .isLength({ max: PASSWORD_MAX_LENGTH })
  .withMessage(ERROR_MESSAGES.NEW_PASSWORD_MAX_LENGTH)
  .bail()
  .matches(passwordComplexity)
  .withMessage(ERROR_MESSAGES.PASSWORD_COMPLEXITY);

export const registerValidation = [
  emailValidation,

  passwordValidation,

  body("firstName")
    .isString()
    .withMessage(ERROR_MESSAGES.FIRST_NAME_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.FIRST_NAME_REQUIRED)
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage(ERROR_MESSAGES.FIRST_NAME_LENGTH),

  body("lastName")
    .isString()
    .withMessage(ERROR_MESSAGES.LAST_NAME_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.LAST_NAME_REQUIRED)
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage(ERROR_MESSAGES.LAST_NAME_LENGTH),

  body("role")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.ROLE_STRING)
    .bail()
    .trim()
    .isIn(ALLOWED_REGISTER_ROLES)
    .withMessage(ERROR_MESSAGES.INVALID_ROLE),
];

export const loginValidation = [
  emailValidation,

  body("password")
    .isString()
    .withMessage(ERROR_MESSAGES.PASSWORD_STRING)
    .bail()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.PASSWORD_REQUIRED),
];

export const refreshTokenValidation = [
  body("refreshToken")
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.REFRESH_TOKEN_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED),

  body().custom((_value, { req }) => {
    const bodyRefreshToken = req.body?.refreshToken;

    const hasBodyRefreshToken =
      typeof bodyRefreshToken === "string" &&
      bodyRefreshToken.trim().length > 0;

    const hasCookieRefreshToken = hasRefreshTokenCookieHeader(
      req?.headers?.cookie,
    );

    if (hasBodyRefreshToken || hasCookieRefreshToken) {
      return true;
    }

    throw new Error(ERROR_MESSAGES.REFRESH_TOKEN_REQUIRED);
  }),
];

export const updateProfileValidation = [
  body("firstName")
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.FIRST_NAME_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.FIRST_NAME_REQUIRED)
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage(ERROR_MESSAGES.FIRST_NAME_LENGTH),

  body("lastName")
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.LAST_NAME_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.LAST_NAME_REQUIRED)
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage(ERROR_MESSAGES.LAST_NAME_LENGTH),

  body("avatar")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.AVATAR_URL)
    .bail()
    .trim()
    .custom(
      validateUrlOrUploadPathForFolders(ERROR_MESSAGES.AVATAR_URL, ["avatars"]),
    ),
];

export const changePasswordValidation = [
  body("currentPassword")
    .isString()
    .withMessage(ERROR_MESSAGES.CURRENT_PASSWORD_STRING)
    .bail()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.CURRENT_PASSWORD_REQUIRED),

  newPasswordValidation.custom((value, { req }) => {
    const currentPassword = req.body.currentPassword;

    if (typeof currentPassword === "string" && value === currentPassword) {
      throw new Error(ERROR_MESSAGES.NEW_PASSWORD_DIFFERENT);
    }

    return true;
  }),
];

export const forgotPasswordValidation = [emailValidation];

export const verifyPasswordResetCodeValidation = [
  emailValidation,

  body("code")
    .isString()
    .withMessage(ERROR_MESSAGES.RESET_CODE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.RESET_CODE_REQUIRED)
    .bail()
    .matches(/^\d{6}$/)
    .withMessage(ERROR_MESSAGES.RESET_CODE_FORMAT),
];

export const resetPasswordValidation = [
  body("resetToken")
    .isString()
    .withMessage(ERROR_MESSAGES.RESET_TOKEN_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.RESET_TOKEN_REQUIRED),

  newPasswordValidation,
];

import { body, param, query, type ValidationChain } from "express-validator";
import { normalizeCanonicalEmail } from "../utils/sanitize-user-content";
import { validateUrlOrUploadPathForFolders } from "../utils/url-or-path";

export const uuidParam = (
  name = "id",
  label = name,
): ValidationChain =>
  param(name)
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .isString()
    .bail()
    .trim()
    .isUUID()
    .withMessage(`Invalid ${label}`);

export const uuidBodyField = (
  name: string,
  label = name,
): ValidationChain =>
  body(name)
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .isString()
    .bail()
    .trim()
    .isUUID()
    .withMessage(`Invalid ${label}`);

export const paginationQueryValidators = (
  maxLimit = 100,
): ValidationChain[] => [
  query("page")
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: maxLimit })
    .withMessage(`Limit must be between 1 and ${maxLimit}`)
    .toInt(),
];

export const offsetPaginationQueryValidators = (
  maxLimit = 100,
): ValidationChain[] => [
  query("offset")
    .optional({ values: "falsy" })
    .isInt({ min: 0 })
    .withMessage("offset must be >= 0")
    .toInt(),
  query("limit")
    .optional({ values: "falsy" })
    .isInt({ min: 1, max: maxLimit })
    .withMessage(`limit must be 1-${maxLimit}`)
    .toInt(),
];

export const supportAttachmentBodyField = (
  options?: { nullableOnly?: boolean },
): ValidationChain =>
  body("attachment")
    .optional({ values: options?.nullableOnly ? "null" : "falsy" })
    .isString()
    .withMessage("attachment must be a string")
    .bail()
    .isLength({ max: 500 })
    .withMessage("attachment too long")
    .bail()
    .custom(
      validateUrlOrUploadPathForFolders(
        "Attachment must be an external URL or use the /uploads/support-attachments/ folder",
        ["support-attachments"],
      ),
    );

export const canonicalEmailBodyField = (
  field = "email",
  options?: { optional?: boolean },
): ValidationChain => {
  const chain = body(field);
  const base = options?.optional
    ? chain.optional({ nullable: true, checkFalsy: true })
    : chain;

  return base
    .isString()
    .withMessage("Email must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .bail()
    .customSanitizer((value: string) => normalizeCanonicalEmail(value));
};

import { body, param, query, type ValidationChain } from "express-validator";
import { normalizeCanonicalEmail } from "../utils/sanitize-user-content";

export const uuidParam = (
  name = "id",
  label = "ID",
): ValidationChain =>
  param(name)
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

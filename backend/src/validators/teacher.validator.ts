import { body, query, type Meta, type ValidationChain } from "express-validator";
import { RegistrationStatus, VerificationStatus } from "@prisma/client";
import { validateUrlOrUploadPathForFolders } from "../utils/url-or-path";
import { parseFiniteNumber } from "../utils/http";
import { paginationQueryValidators } from "./common.validator";

const MAX_HOURLY_RATE = 999999.99;

const TEACHER_DOCUMENT_TYPES = [
  "teaching_certificate",
  "degree",
  "professional_license",
  "id_card",
  "other",
] as const;

const ADMIN_REVIEWABLE_VERIFICATION_STATUSES = [
  VerificationStatus.APPROVED,
  VerificationStatus.REJECTED,
] as const;

const ADMIN_REVIEWABLE_REGISTRATION_STATUSES = [
  RegistrationStatus.APPROVED,
  RegistrationStatus.REJECTED,
] as const;

const ERROR_MESSAGES = {
  BIO_STRING: "Bio must be a string",
  BIO_LENGTH: "Bio must not exceed 1000 characters",
  HEADLINE_STRING: "Headline must be a string",
  HEADLINE_LENGTH: "Headline must not exceed 200 characters",
  HOURLY_RATE_VALID: `Hourly rate must be a valid number between 0 and ${MAX_HOURLY_RATE}`,

  CERT_TITLE_STRING: "Certification title must be a string",
  CERT_TITLE_REQUIRED: "Certification title is required",
  CERT_TITLE_LENGTH: "Certification title must be between 2 and 200 characters",
  ISSUER_STRING: "Issuer must be a string",
  ISSUER_REQUIRED: "Issuer is required",
  ISSUER_LENGTH: "Issuer name must be between 2 and 200 characters",
  ISSUE_DATE_REQUIRED: "Issue date is required",
  ISSUE_DATE_VALID: "Issue date must be a valid date",
  EXPIRY_DATE_VALID: "Expiry date must be a valid date",
  EXPIRY_AFTER_ISSUE: "Expiry date cannot be before issue date",
  CREDENTIAL_ID_STRING: "Credential ID must be a string",
  CREDENTIAL_ID_LENGTH: "Credential ID must not exceed 100 characters",
  CREDENTIAL_URL_STRING: "Credential URL must be a string URL or file path",
  CREDENTIAL_URL_INVALID:
    "Credential URL must be an external URL or use the /uploads/teacher-certificates/ folder",

  DOCUMENT_TYPE_STRING: "Document type must be a string",
  DOCUMENT_TYPE_REQUIRED: "Document type is required",
  DOCUMENT_TYPE_INVALID: "Invalid document type",
  DOCUMENT_URL_STRING: "Document URL must be a string URL or file path",
  DOCUMENT_URL_REQUIRED: "Document URL is required",
  DOCUMENT_URL_INVALID:
    "Document URL must be an external URL or use the /uploads/verifications/ folder",

  SELF_INTRO_STRING: "Self introduction must be a string",
  SELF_INTRO_REQUIRED: "Self introduction is required",
  SELF_INTRO_LENGTH: "Self introduction must not exceed 500 characters",
  EDUCATION_STRING: "Education background must be a string",
  EDUCATION_LENGTH: "Education background must not exceed 2000 characters",
  EXPERIENCE_STRING: "Teaching experience must be a string",
  EXPERIENCE_LENGTH: "Teaching experience must not exceed 2000 characters",
  TEACHING_STYLE_STRING: "Teaching style must be a string",
  TEACHING_STYLE_LENGTH: "Teaching style must not exceed 1000 characters",
  YEARS_REQUIRED: "Years of experience is required",
  YEARS_RANGE: "Years of experience must be between 0 and 70",

  PROFILE_PHOTO_STRING: "Profile photo must be a string URL or file path",
  PROFILE_PHOTO_INVALID:
    "Profile photo must be an external URL or use the /uploads/teacher-profiles/ folder",

  CERTIFICATE_PHOTOS_ARRAY:
    "Certificate photos must be an array with at most 12 items",
  CERTIFICATE_PHOTO_STRING:
    "Each certificate photo must be a string URL or file path",
  CERTIFICATE_PHOTO_EMPTY: "Certificate photos cannot contain empty values",
  CERTIFICATE_PHOTO_INVALID:
    "Certificate photos must be external URLs or use the /uploads/teacher-certificates/ folder",
  CERTIFICATE_PHOTO_DUPLICATE:
    "Certificate photos cannot contain duplicate values",

  STATUS_REQUIRED: "Status is required",
  STATUS_STRING: "Status must be a string",
  REVIEW_STATUS_INVALID: "Status must be APPROVED or REJECTED",
  REVIEW_NOTES_STRING: "Review notes must be a string",
  REVIEW_NOTES_LENGTH: "Review notes must not exceed 500 characters",
  REVIEW_NOTES_REQUIRED_FOR_REJECTION:
    "Review notes are required when rejecting a submission",

  IS_VERIFIED_BOOLEAN: "isVerified must be a boolean",
  MIN_RATING_RANGE: "minRating must be between 0 and 5",
} as const;

const parseDate = (value: unknown): Date | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  return undefined;
};

const validateHourlyRate = (value: unknown) => {
  const parsed = parseFiniteNumber(value);
  if (parsed === undefined || parsed < 0 || parsed > MAX_HOURLY_RATE) {
    throw new Error(ERROR_MESSAGES.HOURLY_RATE_VALID);
  }
  return true;
};

const validateNoDuplicateStrings = (message: string) => (value: unknown) => {
  if (!Array.isArray(value)) {
    return true;
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase());

  if (new Set(normalized).size !== normalized.length) {
    throw new Error(message);
  }

  return true;
};

const validateExpiryAfterIssue = (value: unknown, { req }: Meta) => {
  const expiryDate = parseDate(value);
  const issueDate = parseDate(req.body?.issueDate);

  if (expiryDate && issueDate && expiryDate < issueDate) {
    throw new Error(ERROR_MESSAGES.EXPIRY_AFTER_ISSUE);
  }

  return true;
};

const validateReviewNotesForRejection = (_value: unknown, { req }: Meta) => {
  const status = req.body?.status;
  const reviewNotes = req.body?.reviewNotes;

  if (
    (status === VerificationStatus.REJECTED ||
      status === RegistrationStatus.REJECTED) &&
    (typeof reviewNotes !== "string" || reviewNotes.trim().length === 0)
  ) {
    throw new Error(ERROR_MESSAGES.REVIEW_NOTES_REQUIRED_FOR_REJECTION);
  }

  return true;
};

const optionalTextBody = (
  field: string,
  stringMsg: string,
  lengthMsg: string,
  max: number,
): ValidationChain =>
  body(field)
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(stringMsg)
    .bail()
    .trim()
    .isLength({ max })
    .withMessage(lengthMsg);

const uniqueStringArrayValidators = (
  field: string,
  options: {
    optional?: boolean;
    min?: number;
    max: number;
    itemMax: number;
    arrayMsg: string;
    stringMsg: string;
    emptyMsg: string;
    lengthMsg: string;
    duplicateMsg: string;
  },
): ValidationChain[] => {
  const arrayBase = options.optional
    ? body(field).optional({ nullable: true })
    : body(field);
  const itemBase = options.optional
    ? body(`${field}.*`).optional({ nullable: true })
    : body(`${field}.*`);

  return [
    arrayBase
      .isArray({ min: options.min, max: options.max })
      .withMessage(options.arrayMsg)
      .bail()
      .custom(validateNoDuplicateStrings(options.duplicateMsg)),
    itemBase
      .isString()
      .withMessage(options.stringMsg)
      .bail()
      .trim()
      .notEmpty()
      .withMessage(options.emptyMsg)
      .bail()
      .isLength({ max: options.itemMax })
      .withMessage(options.lengthMsg),
  ];
};

const buildAdminReviewValidation = (allowedStatuses: readonly string[]) => [
  body("status")
    .exists({ checkNull: true })
    .withMessage(ERROR_MESSAGES.STATUS_REQUIRED)
    .bail()
    .isString()
    .withMessage(ERROR_MESSAGES.STATUS_STRING)
    .bail()
    .trim()
    .isIn([...allowedStatuses])
    .withMessage(ERROR_MESSAGES.REVIEW_STATUS_INVALID),
  body("reviewNotes")
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.REVIEW_NOTES_STRING)
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage(ERROR_MESSAGES.REVIEW_NOTES_LENGTH),
  body().custom(validateReviewNotesForRejection),
];

export const updateProfileValidation = [
  optionalTextBody("bio", ERROR_MESSAGES.BIO_STRING, ERROR_MESSAGES.BIO_LENGTH, 1000),
  optionalTextBody("headline", ERROR_MESSAGES.HEADLINE_STRING, ERROR_MESSAGES.HEADLINE_LENGTH, 200),
  body("hourlyRate")
    .customSanitizer((value: unknown) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    )
    .optional({ nullable: true })
    .custom(validateHourlyRate)
    .bail()
    .toFloat(),
];

export const addCertificationValidation = [
  body("title")
    .isString()
    .withMessage(ERROR_MESSAGES.CERT_TITLE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.CERT_TITLE_REQUIRED)
    .bail()
    .isLength({ min: 2, max: 200 })
    .withMessage(ERROR_MESSAGES.CERT_TITLE_LENGTH),
  body("issuer")
    .isString()
    .withMessage(ERROR_MESSAGES.ISSUER_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.ISSUER_REQUIRED)
    .bail()
    .isLength({ min: 2, max: 200 })
    .withMessage(ERROR_MESSAGES.ISSUER_LENGTH),
  body("issueDate")
    .exists({ checkNull: true })
    .withMessage(ERROR_MESSAGES.ISSUE_DATE_REQUIRED)
    .bail()
    .isISO8601()
    .withMessage(ERROR_MESSAGES.ISSUE_DATE_VALID)
    .bail()
    .toDate(),
  body("expiryDate")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage(ERROR_MESSAGES.EXPIRY_DATE_VALID)
    .bail()
    .toDate()
    .custom(validateExpiryAfterIssue),
  optionalTextBody(
    "credentialId",
    ERROR_MESSAGES.CREDENTIAL_ID_STRING,
    ERROR_MESSAGES.CREDENTIAL_ID_LENGTH,
    100,
  ),
  body("credentialUrl")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.CREDENTIAL_URL_STRING)
    .bail()
    .trim()
    .custom(
      validateUrlOrUploadPathForFolders(ERROR_MESSAGES.CREDENTIAL_URL_INVALID, [
        "teacher-certificates",
      ]),
    ),
];

export const submitVerificationValidation = [
  body("documentType")
    .isString()
    .withMessage(ERROR_MESSAGES.DOCUMENT_TYPE_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.DOCUMENT_TYPE_REQUIRED)
    .bail()
    .isIn([...TEACHER_DOCUMENT_TYPES])
    .withMessage(ERROR_MESSAGES.DOCUMENT_TYPE_INVALID),
  body("documentUrl")
    .isString()
    .withMessage(ERROR_MESSAGES.DOCUMENT_URL_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.DOCUMENT_URL_REQUIRED)
    .bail()
    .custom(
      validateUrlOrUploadPathForFolders(ERROR_MESSAGES.DOCUMENT_URL_INVALID, [
        "verifications",
      ]),
    ),
];

export const extendedProfileValidation = [
  body("selfIntroduction")
    .isString()
    .withMessage(ERROR_MESSAGES.SELF_INTRO_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.SELF_INTRO_REQUIRED)
    .bail()
    .isLength({ max: 500 })
    .withMessage(ERROR_MESSAGES.SELF_INTRO_LENGTH),
  optionalTextBody(
    "educationBackground",
    ERROR_MESSAGES.EDUCATION_STRING,
    ERROR_MESSAGES.EDUCATION_LENGTH,
    2000,
  ),
  optionalTextBody(
    "teachingExperience",
    ERROR_MESSAGES.EXPERIENCE_STRING,
    ERROR_MESSAGES.EXPERIENCE_LENGTH,
    2000,
  ),
  ...uniqueStringArrayValidators("awards", {
    optional: true,
    max: 20,
    itemMax: 150,
    arrayMsg: "Awards must be an array with at most 20 items",
    stringMsg: "Each award must be a string",
    emptyMsg: "Awards cannot contain empty values",
    lengthMsg: "Each award must not exceed 150 characters",
    duplicateMsg: "Awards cannot contain duplicate values",
  }),
  ...uniqueStringArrayValidators("specialties", {
    min: 1,
    max: 20,
    itemMax: 100,
    arrayMsg: "Please add between 1 and 20 specialties",
    stringMsg: "Each specialty must be a string",
    emptyMsg: "Specialties cannot contain empty values",
    lengthMsg: "Each specialty must not exceed 100 characters",
    duplicateMsg: "Specialties cannot contain duplicate values",
  }),
  optionalTextBody(
    "teachingStyle",
    ERROR_MESSAGES.TEACHING_STYLE_STRING,
    ERROR_MESSAGES.TEACHING_STYLE_LENGTH,
    1000,
  ),
  ...uniqueStringArrayValidators("languages", {
    min: 1,
    max: 20,
    itemMax: 50,
    arrayMsg: "Please add between 1 and 20 languages",
    stringMsg: "Each language must be a string",
    emptyMsg: "Languages cannot contain empty values",
    lengthMsg: "Each language must not exceed 50 characters",
    duplicateMsg: "Languages cannot contain duplicate values",
  }),
  body("yearsOfExperience")
    .exists({ checkNull: true })
    .withMessage(ERROR_MESSAGES.YEARS_REQUIRED)
    .bail()
    .isInt({ min: 0, max: 70 })
    .withMessage(ERROR_MESSAGES.YEARS_RANGE)
    .bail()
    .toInt(),
  body("profilePhoto")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(ERROR_MESSAGES.PROFILE_PHOTO_STRING)
    .bail()
    .trim()
    .custom(
      validateUrlOrUploadPathForFolders(ERROR_MESSAGES.PROFILE_PHOTO_INVALID, [
        "teacher-profiles",
      ]),
    ),
  body("certificatePhotos")
    .optional({ nullable: true })
    .isArray({ max: 12 })
    .withMessage(ERROR_MESSAGES.CERTIFICATE_PHOTOS_ARRAY)
    .bail()
    .custom(
      validateNoDuplicateStrings(ERROR_MESSAGES.CERTIFICATE_PHOTO_DUPLICATE),
    ),
  body("certificatePhotos.*")
    .optional({ nullable: true })
    .isString()
    .withMessage(ERROR_MESSAGES.CERTIFICATE_PHOTO_STRING)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(ERROR_MESSAGES.CERTIFICATE_PHOTO_EMPTY)
    .bail()
    .custom(
      validateUrlOrUploadPathForFolders(
        ERROR_MESSAGES.CERTIFICATE_PHOTO_INVALID,
        ["teacher-certificates"],
      ),
    ),
];

export const reviewVerificationValidation = buildAdminReviewValidation(
  ADMIN_REVIEWABLE_VERIFICATION_STATUSES,
);

export const reviewRegistrationValidation = buildAdminReviewValidation(
  ADMIN_REVIEWABLE_REGISTRATION_STATUSES,
);

export const getTeachersValidation = [
  query("isVerified")
    .optional({ nullable: true, checkFalsy: true })
    .isBoolean()
    .withMessage(ERROR_MESSAGES.IS_VERIFIED_BOOLEAN)
    .bail()
    .toBoolean(),
  query("minRating")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0, max: 5 })
    .withMessage(ERROR_MESSAGES.MIN_RATING_RANGE)
    .bail()
    .toFloat(),
  ...paginationQueryValidators(100),
];

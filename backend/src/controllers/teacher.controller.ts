import { Request, Response } from "express";
import {
  RegistrationStatus,
  UserRole,
  VerificationStatus,
} from "@prisma/client";
import teacherService from "../services/teacher.service";
import asyncHandler from "../utils/async-handler";
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
} from "../utils/errors";
import { applyProtectedAssetHeaders } from "../utils/protected-asset";

type ReviewVerificationStatus = "APPROVED" | "REJECTED";
type ReviewRegistrationStatus = "APPROVED" | "REJECTED";

/**
 * Teacher Controller
 * Handles HTTP requests for teacher-related endpoints.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const MAX_SHORT_TEXT_LENGTH = 200;
const MAX_LONG_TEXT_LENGTH = 5000;
const MAX_ARRAY_ITEMS = 30;
const MAX_URL_LENGTH = 1000;

const sendSuccess = (
  res: Response,
  data?: unknown,
  message?: string,
  statusCode = 200,
) => {
  res.status(statusCode).json({
    status: "success",
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
  });
};

const getAuthenticatedUser = (req: Request): { id: string; role: UserRole } => {
  if (!req.user) {
    throw new AuthenticationError("Authentication required");
  }

  return {
    id: req.user.id,
    role: req.user.role,
  };
};

const requireAdmin = (req: Request): string => {
  const user = getAuthenticatedUser(req);

  if (user.role !== UserRole.ADMIN) {
    throw new AuthorizationError("Admin access required");
  }

  return user.id;
};

const getFirstQueryValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0].trim() : undefined;
  }

  if (typeof value === "string") {
    const parsed = value.trim();
    return parsed.length > 0 ? parsed : undefined;
  }

  return undefined;
};

const parseRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} is required`);
  }

  const parsed = value.trim();

  if (parsed.length === 0) {
    throw new BadRequestError(`${fieldName} cannot be empty`);
  }

  return parsed;
};

const parseOptionalString = (
  value: unknown,
  fieldName: string,
  maxLength = MAX_LONG_TEXT_LENGTH,
): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} must be a string`);
  }

  const parsed = value.trim();

  if (parsed.length === 0) {
    return undefined;
  }

  if (parsed.length > maxLength) {
    throw new BadRequestError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return parsed;
};

const parseRequiredLimitedString = (
  value: unknown,
  fieldName: string,
  maxLength = MAX_LONG_TEXT_LENGTH,
): string => {
  const parsed = parseRequiredString(value, fieldName);

  if (parsed.length > maxLength) {
    throw new BadRequestError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return parsed;
};

const parseRequiredId = (value: unknown, fieldName: string): string => {
  return parseRequiredLimitedString(value, fieldName, MAX_SHORT_TEXT_LENGTH);
};

const parseOptionalBoolean = (
  value: unknown,
  fieldName: string,
): boolean | undefined => {
  const rawValue = getFirstQueryValue(value);

  if (!rawValue) {
    return undefined;
  }

  if (rawValue === "true") return true;
  if (rawValue === "false") return false;

  throw new BadRequestError(`${fieldName} must be true or false`);
};

const parseNumber = (
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {},
): number | undefined => {
  if (value === undefined || value === null || value === "") {
    if (options.required) {
      throw new BadRequestError(`${fieldName} is required`);
    }

    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new BadRequestError(`${fieldName} must be a valid number`);
  }

  if (options.integer && !Number.isInteger(parsed)) {
    throw new BadRequestError(`${fieldName} must be an integer`);
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new BadRequestError(`${fieldName} must be at least ${options.min}`);
  }

  if (options.max !== undefined && parsed > options.max) {
    throw new BadRequestError(`${fieldName} must be at most ${options.max}`);
  }

  return parsed;
};

const parsePositiveInteger = (
  value: unknown,
  fallback?: number,
  fieldName = "value",
  max = MAX_LIMIT,
): number | undefined => {
  const rawValue = getFirstQueryValue(value);

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestError(`${fieldName} must be a positive integer`);
  }

  return Math.min(parsed, max);
};

const parseDate = (value: unknown, fieldName: string): Date => {
  const rawValue = parseRequiredString(value, fieldName);
  const parsed = new Date(rawValue);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestError(`${fieldName} must be a valid date`);
  }

  return parsed;
};

const parseOptionalDate = (
  value: unknown,
  fieldName: string,
): Date | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const rawValue = parseRequiredString(value, fieldName);
  const parsed = new Date(rawValue);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestError(`${fieldName} must be a valid date`);
  }

  return parsed;
};

const parseOptionalStringArray = (
  value: unknown,
  fieldName: string,
  maxItems = MAX_ARRAY_ITEMS,
): string[] | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(`${fieldName} must be an array of strings`);
  }

  if (value.length > maxItems) {
    throw new BadRequestError(
      `${fieldName} must not contain more than ${maxItems} items`,
    );
  }

  const parsed = value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new BadRequestError(
        `${fieldName}[${index}] must be a non-empty string`,
      );
    }

    return item.trim();
  });

  return Array.from(new Set(parsed));
};

const parseOptionalUrlLikeString = (
  value: unknown,
  fieldName: string,
): string | undefined => {
  return parseOptionalString(value, fieldName, MAX_URL_LENGTH);
};

const parseRequiredUrlLikeString = (
  value: unknown,
  fieldName: string,
): string => {
  return parseRequiredLimitedString(value, fieldName, MAX_URL_LENGTH);
};

const parseReviewVerificationStatus = (
  value: unknown,
): ReviewVerificationStatus => {
  const status = parseRequiredString(value, "status");

  if (
    status !== VerificationStatus.APPROVED &&
    status !== VerificationStatus.REJECTED
  ) {
    throw new BadRequestError("status must be APPROVED or REJECTED");
  }

  return status;
};

const parseReviewRegistrationStatus = (
  value: unknown,
): ReviewRegistrationStatus => {
  const status = parseRequiredString(value, "status");

  if (
    status !== RegistrationStatus.APPROVED &&
    status !== RegistrationStatus.REJECTED
  ) {
    throw new BadRequestError("status must be APPROVED or REJECTED");
  }

  return status;
};

const parsePagination = (
  query: Request["query"],
  useDefaults = true,
): { page?: number; limit?: number } => {
  return {
    page: parsePositiveInteger(
      query.page,
      useDefaults ? DEFAULT_PAGE : undefined,
      "page",
    ),
    limit: parsePositiveInteger(
      query.limit,
      useDefaults ? DEFAULT_LIMIT : undefined,
      "limit",
      MAX_LIMIT,
    ),
  };
};

class TeacherController {
  /**
   * Get all teachers.
   * GET /api/teachers
   */
  getAllTeachers = asyncHandler(async (req: Request, res: Response) => {
    const result = await teacherService.getAllTeachers({
      isVerified: parseOptionalBoolean(req.query.isVerified, "isVerified"),
      category: parseOptionalString(
        req.query.category,
        "category",
        MAX_SHORT_TEXT_LENGTH,
      ),
      minRating: parseNumber(req.query.minRating, "minRating", {
        min: 0,
        max: 5,
      }),
      search: parseOptionalString(
        req.query.search,
        "search",
        MAX_SHORT_TEXT_LENGTH,
      ),
      ...parsePagination(req.query, false),
    });

    sendSuccess(res, result);
  });

  /**
   * Get teacher by ID.
   * GET /api/teachers/:id
   */
  getTeacherById = asyncHandler(async (req: Request, res: Response) => {
    const teacherId = parseRequiredId(req.params.id, "Teacher ID");

    const teacher = await teacherService.getTeacherById(teacherId);

    sendSuccess(res, teacher);
  });

  /**
   * Get current teacher's profile.
   * GET /api/teachers/me/profile
   */
  getMyProfile = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);

    const teacher = await teacherService.getTeacherByUserId(userId);

    sendSuccess(res, teacher);
  });

  /**
   * Update teacher profile.
   * PUT /api/teachers/me/profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);

    const teacher = await teacherService.updateTeacherProfile(userId, {
      bio: parseOptionalString(req.body?.bio, "bio"),
      headline: parseOptionalString(
        req.body?.headline,
        "headline",
        MAX_SHORT_TEXT_LENGTH,
      ),
      hourlyRate: parseNumber(req.body?.hourlyRate, "hourlyRate", {
        min: 0,
      }),
    });

    sendSuccess(res, teacher, "Profile updated successfully");
  });

  /**
   * Add certification.
   * POST /api/teachers/me/certifications
   */
  addCertification = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);

    const issueDate = parseDate(req.body?.issueDate, "issueDate");
    const expiryDate = parseOptionalDate(req.body?.expiryDate, "expiryDate");

    if (expiryDate && expiryDate < issueDate) {
      throw new BadRequestError("expiryDate cannot be earlier than issueDate");
    }

    const certification = await teacherService.addCertification(userId, {
      title: parseRequiredLimitedString(
        req.body?.title,
        "title",
        MAX_SHORT_TEXT_LENGTH,
      ),
      issuer: parseRequiredLimitedString(
        req.body?.issuer,
        "issuer",
        MAX_SHORT_TEXT_LENGTH,
      ),
      issueDate,
      expiryDate,
      credentialId: parseOptionalString(
        req.body?.credentialId,
        "credentialId",
        MAX_SHORT_TEXT_LENGTH,
      ),
      credentialUrl: parseOptionalUrlLikeString(
        req.body?.credentialUrl,
        "credentialUrl",
      ),
    });

    sendSuccess(res, certification, "Certification added successfully", 201);
  });

  /**
   * Delete certification.
   * DELETE /api/teachers/me/certifications/:id
   */
  deleteCertification = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);
    const certificationId = parseRequiredId(req.params.id, "Certification ID");

    const result = await teacherService.deleteCertification(
      userId,
      certificationId,
    );

    sendSuccess(
      res,
      undefined,
      result.message || "Certification deleted successfully",
    );
  });

  /**
   * Submit verification document.
   * POST /api/teachers/me/verifications
   */
  submitVerification = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);

    const verification = await teacherService.submitVerification(
      userId,
      parseRequiredLimitedString(
        req.body?.documentType,
        "documentType",
        MAX_SHORT_TEXT_LENGTH,
      ),
      parseRequiredUrlLikeString(req.body?.documentUrl, "documentUrl"),
    );

    sendSuccess(res, verification, "Verification submitted successfully", 201);
  });

  /**
   * Get teacher's verifications.
   * GET /api/teachers/me/verifications
   */
  getMyVerifications = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);

    const verifications = await teacherService.getVerifications(userId);

    sendSuccess(res, verifications);
  });

  /**
   * View verification document through a protected access path.
   * GET /api/teachers/verifications/:id/document
   */
  getVerificationDocument = asyncHandler(
    async (req: Request, res: Response) => {
      const user = getAuthenticatedUser(req);
      const verificationId = parseRequiredId(req.params.id, "Verification ID");

      const asset = await teacherService.getVerificationDocumentAsset(
        user.id,
        user.role,
        verificationId,
      );

      if (asset.redirectUrl) {
        applyProtectedAssetHeaders(res);
        return res.redirect(asset.redirectUrl);
      }

      if (!asset.absolutePath) {
        throw new BadRequestError("Verification document is unavailable");
      }

      applyProtectedAssetHeaders(res, {
        disposition: "inline",
        filename: asset.filename,
      });

      return res.sendFile(asset.absolutePath);
    },
  );

  /**
   * View a teacher certificate upload through a protected access path.
   * GET /api/teachers/certificate-assets?url=/uploads/teacher-certificates/file
   */
  getCertificateAsset = asyncHandler(async (req: Request, res: Response) => {
    const user = getAuthenticatedUser(req);
    const certificateUrl = parseRequiredUrlLikeString(
      req.query.url,
      "Certificate URL",
    );

    const asset = await teacherService.getCertificateAsset(
      user.id,
      user.role,
      certificateUrl,
    );

    if (!asset.absolutePath) {
      throw new BadRequestError("Certificate file is unavailable");
    }

    applyProtectedAssetHeaders(res, {
      disposition: "inline",
      filename: asset.filename,
    });

    return res.sendFile(asset.absolutePath);
  });

  /**
   * Get teacher statistics.
   * GET /api/teachers/me/stats
   */
  getMyStats = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);

    const stats = await teacherService.getTeacherStats(userId);

    sendSuccess(res, stats);
  });

  /**
   * Get all pending verifications.
   * Admin-only endpoint.
   * GET /api/teachers/verifications/pending
   */
  getPendingVerifications = asyncHandler(
    async (req: Request, res: Response) => {
      requireAdmin(req);

      const verifications = await teacherService.getPendingVerifications();

      sendSuccess(res, verifications);
    },
  );

  /**
   * Review verification.
   * Admin-only endpoint.
   * PUT /api/teachers/verifications/:id/review
   */
  reviewVerification = asyncHandler(async (req: Request, res: Response) => {
    const adminId = requireAdmin(req);
    const verificationId = parseRequiredId(req.params.id, "Verification ID");
    const status = parseReviewVerificationStatus(req.body?.status);

    const verification = await teacherService.reviewVerification(
      verificationId,
      adminId,
      status,
      parseOptionalString(req.body?.reviewNotes, "reviewNotes"),
    );

    sendSuccess(res, verification, "Verification reviewed successfully");
  });

  /**
   * Submit extended profile for review.
   * POST /api/teachers/me/profile/submit
   */
  submitExtendedProfile = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);

    const yearsOfExperience = parseNumber(
      req.body?.yearsOfExperience,
      "yearsOfExperience",
      {
        min: 0,
        integer: true,
      },
    );

    const profile = await teacherService.submitExtendedProfile(userId, {
      selfIntroduction: parseOptionalString(
        req.body?.selfIntroduction,
        "selfIntroduction",
      ),
      educationBackground: parseOptionalString(
        req.body?.educationBackground,
        "educationBackground",
      ),
      teachingExperience: parseOptionalString(
        req.body?.teachingExperience,
        "teachingExperience",
      ),
      awards: parseOptionalStringArray(req.body?.awards, "awards"),
      specialties: parseOptionalStringArray(
        req.body?.specialties,
        "specialties",
      ),
      teachingStyle: parseOptionalString(
        req.body?.teachingStyle,
        "teachingStyle",
      ),
      languages: parseOptionalStringArray(req.body?.languages, "languages"),
      yearsOfExperience,
      profilePhoto: parseOptionalUrlLikeString(
        req.body?.profilePhoto,
        "profilePhoto",
      ),
      certificatePhotos: parseOptionalStringArray(
        req.body?.certificatePhotos,
        "certificatePhotos",
      ),
    });

    sendSuccess(res, profile, "Profile submitted for review successfully", 201);
  });

  /**
   * Get extended profile.
   * GET /api/teachers/me/profile/extended
   */
  getExtendedProfile = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);

    const profile = await teacherService.getExtendedProfile(userId);

    sendSuccess(res, profile);
  });

  /**
   * Update extended profile for approved teachers.
   * PUT /api/teachers/me/profile/update
   */
  updateExtendedProfile = asyncHandler(async (req: Request, res: Response) => {
    const { id: userId } = getAuthenticatedUser(req);

    const yearsOfExperience = parseNumber(
      req.body?.yearsOfExperience,
      "yearsOfExperience",
      {
        min: 0,
        integer: true,
      },
    );

    const profile = await teacherService.updateExtendedProfile(userId, {
      selfIntroduction: parseOptionalString(
        req.body?.selfIntroduction,
        "selfIntroduction",
      ),
      educationBackground: parseOptionalString(
        req.body?.educationBackground,
        "educationBackground",
      ),
      teachingExperience: parseOptionalString(
        req.body?.teachingExperience,
        "teachingExperience",
      ),
      awards: parseOptionalStringArray(req.body?.awards, "awards"),
      specialties: parseOptionalStringArray(
        req.body?.specialties,
        "specialties",
      ),
      teachingStyle: parseOptionalString(
        req.body?.teachingStyle,
        "teachingStyle",
      ),
      languages: parseOptionalStringArray(req.body?.languages, "languages"),
      yearsOfExperience,
      profilePhoto: parseOptionalUrlLikeString(
        req.body?.profilePhoto,
        "profilePhoto",
      ),
      certificatePhotos: parseOptionalStringArray(
        req.body?.certificatePhotos,
        "certificatePhotos",
      ),
    });

    sendSuccess(
      res,
      profile,
      "Profile updated successfully and submitted for review",
    );
  });

  /**
   * Get all teachers pending profile verification.
   * Admin-only endpoint.
   * GET /api/teachers/admin/pending-profiles
   */
  getPendingProfileVerifications = asyncHandler(
    async (req: Request, res: Response) => {
      requireAdmin(req);

      const { page, limit } = parsePagination(req.query);

      const result = await teacherService.getPendingProfileVerifications(
        page as number,
        limit as number,
      );

      sendSuccess(res, result);
    },
  );

  /**
   * Review teacher extended profile.
   * Admin-only endpoint.
   * PUT /api/teachers/admin/profiles/:id/review
   */
  reviewTeacherProfile = asyncHandler(async (req: Request, res: Response) => {
    const adminId = requireAdmin(req);
    const profileId = parseRequiredId(req.params.id, "Profile ID");
    const status = parseReviewVerificationStatus(req.body?.status);

    const profile = await teacherService.reviewTeacherProfile(
      profileId,
      adminId,
      status,
      parseOptionalString(req.body?.reviewNotes, "reviewNotes"),
    );

    sendSuccess(res, profile, "Teacher profile reviewed successfully");
  });

  /**
   * Get all verified teachers for student view.
   * GET /api/teachers/verified
   */
  getVerifiedTeachers = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query);

    const result = await teacherService.getVerifiedTeachers({
      search: parseOptionalString(
        req.query.search,
        "search",
        MAX_SHORT_TEXT_LENGTH,
      ),
      minRating: parseNumber(req.query.minRating, "minRating", {
        min: 0,
        max: 5,
      }),
      page: page as number,
      limit: limit as number,
    });

    sendSuccess(res, result);
  });

  /**
   * Get pending teacher registrations.
   * Admin-only endpoint.
   * GET /api/teachers/admin/pending-registrations
   */
  getPendingRegistrations = asyncHandler(
    async (req: Request, res: Response) => {
      requireAdmin(req);

      const { page, limit } = parsePagination(req.query);

      const result = await teacherService.getPendingRegistrations(
        page as number,
        limit as number,
      );

      sendSuccess(res, result);
    },
  );

  /**
   * Review teacher registration.
   * Admin-only endpoint.
   * PUT /api/teachers/admin/registrations/:id/review
   */
  reviewRegistration = asyncHandler(async (req: Request, res: Response) => {
    const adminId = requireAdmin(req);
    const registrationId = parseRequiredId(req.params.id, "Registration ID");
    const status = parseReviewRegistrationStatus(req.body?.status);

    const updated = await teacherService.reviewRegistration(
      registrationId,
      adminId,
      status,
      parseOptionalString(req.body?.reviewNotes, "reviewNotes"),
    );

    sendSuccess(res, updated, "Teacher registration reviewed successfully");
  });
}

export default new TeacherController();

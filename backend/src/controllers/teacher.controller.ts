import { Request, Response } from "express";
import { RegistrationStatus, VerificationStatus } from "@prisma/client";
import teacherService from "../services/teacher.service";
import asyncHandler from "../utils/async-handler";
import { BadRequestError } from "../utils/errors";
import { sendProtectedAsset } from "../utils/protected-asset";
import {
  parseNullableNumber,
  parseNullableString,
  parseNumber,
  parseOptionalBoolean,
  parseOptionalDate,
  parseOptionalString,
  parseQueryPositiveInt,
  parseRequiredDate,
  parseRequiredEnum,
  parseRequiredParam,
  parseRequiredString,
  parseStringArray,
  requireAdminUser,
  requireAdminUserId,
  requireAuthUser,
  requireAuthUserId,
  sendCreated,
  sendSuccess,
} from "../utils/http";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_SHORT_TEXT_LENGTH = 200;
const MAX_LONG_TEXT_LENGTH = 5000;
const MAX_ARRAY_ITEMS = 30;
const MAX_URL_LENGTH = 1000;

const REVIEW_VERIFICATION_STATUSES = [
  VerificationStatus.APPROVED,
  VerificationStatus.REJECTED,
] as const;

const REVIEW_REGISTRATION_STATUSES = [
  RegistrationStatus.APPROVED,
  RegistrationStatus.REJECTED,
] as const;

const parsePagination = (query: Request["query"], useDefaults = true) => ({
  page: parseQueryPositiveInt(query.page, "page", {
    fallback: useDefaults ? DEFAULT_PAGE : undefined,
    max: MAX_LIMIT,
  }),
  limit: parseQueryPositiveInt(query.limit, "limit", {
    fallback: useDefaults ? DEFAULT_LIMIT : undefined,
    max: MAX_LIMIT,
  }),
});

const parseExtendedProfilePayload = (body: Request["body"]) => ({
  selfIntroduction: parseOptionalString(
    body?.selfIntroduction,
    "selfIntroduction",
    MAX_LONG_TEXT_LENGTH,
  ),
  educationBackground: parseOptionalString(
    body?.educationBackground,
    "educationBackground",
    MAX_LONG_TEXT_LENGTH,
  ),
  teachingExperience: parseOptionalString(
    body?.teachingExperience,
    "teachingExperience",
    MAX_LONG_TEXT_LENGTH,
  ),
  awards: parseStringArray(body?.awards, "awards", {
    maxItems: MAX_ARRAY_ITEMS,
  }),
  specialties: parseStringArray(body?.specialties, "specialties", {
    maxItems: MAX_ARRAY_ITEMS,
  }),
  teachingStyle: parseOptionalString(
    body?.teachingStyle,
    "teachingStyle",
    MAX_LONG_TEXT_LENGTH,
  ),
  languages: parseStringArray(body?.languages, "languages", {
    maxItems: MAX_ARRAY_ITEMS,
  }),
  yearsOfExperience: parseNumber(
    body?.yearsOfExperience,
    "yearsOfExperience",
    { min: 0, integer: true },
  ),
  profilePhoto: parseOptionalString(
    body?.profilePhoto,
    "profilePhoto",
    MAX_URL_LENGTH,
  ),
  certificatePhotos: parseStringArray(
    body?.certificatePhotos,
    "certificatePhotos",
    { maxItems: MAX_ARRAY_ITEMS },
  ),
});

class TeacherController {
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

  getTeacherById = asyncHandler(async (req: Request, res: Response) => {
    const teacher = await teacherService.getTeacherById(
      parseRequiredString(req.params.id, "Teacher ID", {
        maxLength: MAX_SHORT_TEXT_LENGTH,
      }),
    );
    sendSuccess(res, teacher);
  });

  getMyProfile = asyncHandler(async (req: Request, res: Response) => {
    const teacher = await teacherService.getTeacherByUserId(
      requireAuthUserId(req),
    );
    sendSuccess(res, teacher);
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const teacher = await teacherService.updateTeacherProfile(
      requireAuthUserId(req),
      {
        bio: parseNullableString(req.body?.bio, "bio", 1000),
        headline: parseNullableString(
          req.body?.headline,
          "headline",
          MAX_SHORT_TEXT_LENGTH,
        ),
        hourlyRate: parseNullableNumber(req.body?.hourlyRate, "hourlyRate", {
          min: 0,
        }),
      },
    );
    sendSuccess(res, teacher, "Profile updated successfully");
  });

  addCertification = asyncHandler(async (req: Request, res: Response) => {
    const issueDate = parseRequiredDate(req.body?.issueDate, "issueDate");
    const expiryDate = parseOptionalDate(req.body?.expiryDate, "expiryDate");

    if (expiryDate && expiryDate < issueDate) {
      throw new BadRequestError("expiryDate cannot be earlier than issueDate");
    }

    const certification = await teacherService.addCertification(
      requireAuthUserId(req),
      {
        title: parseRequiredString(req.body?.title, "title", {
          maxLength: MAX_SHORT_TEXT_LENGTH,
        }),
        issuer: parseRequiredString(req.body?.issuer, "issuer", {
          maxLength: MAX_SHORT_TEXT_LENGTH,
        }),
        issueDate,
        expiryDate,
        credentialId: parseOptionalString(
          req.body?.credentialId,
          "credentialId",
          MAX_SHORT_TEXT_LENGTH,
        ),
        credentialUrl: parseOptionalString(
          req.body?.credentialUrl,
          "credentialUrl",
          MAX_URL_LENGTH,
        ),
      },
    );

    sendCreated(res, certification, "Certification added successfully");
  });

  deleteCertification = asyncHandler(async (req: Request, res: Response) => {
    const result = await teacherService.deleteCertification(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Certification ID"),
    );
    sendSuccess(
      res,
      undefined,
      result.message || "Certification deleted successfully",
    );
  });

  submitVerification = asyncHandler(async (req: Request, res: Response) => {
    const verification = await teacherService.submitVerification(
      requireAuthUserId(req),
      parseRequiredString(req.body?.documentType, "documentType", {
        maxLength: MAX_SHORT_TEXT_LENGTH,
      }),
      parseRequiredString(req.body?.documentUrl, "documentUrl", {
        maxLength: MAX_URL_LENGTH,
      }),
    );
    sendCreated(res, verification, "Verification submitted successfully");
  });

  getMyVerifications = asyncHandler(async (req: Request, res: Response) => {
    const verifications = await teacherService.getVerifications(
      requireAuthUserId(req),
    );
    sendSuccess(res, verifications);
  });

  getVerificationDocument = asyncHandler(
    async (req: Request, res: Response) => {
      const user = requireAuthUser(req);
      const asset = await teacherService.getVerificationDocumentAsset(
        user.id,
        user.role,
        parseRequiredParam(req.params.id, "Verification ID"),
      );

      sendProtectedAsset(res, asset, {
        disposition: "inline",
        unavailableMessage: "Verification document is unavailable",
      });
    },
  );

  getCertificateAsset = asyncHandler(async (req: Request, res: Response) => {
    const user = requireAuthUser(req);
    const asset = await teacherService.getCertificateAsset(
      user.id,
      user.role,
      parseRequiredString(req.query.url, "Certificate URL", {
        maxLength: MAX_URL_LENGTH,
      }),
    );

    sendProtectedAsset(res, asset, {
      disposition: "inline",
      unavailableMessage: "Certificate file is unavailable",
    });
  });

  getMyStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await teacherService.getTeacherStats(requireAuthUserId(req));
    sendSuccess(res, stats);
  });

  getPendingVerifications = asyncHandler(
    async (req: Request, res: Response) => {
      requireAdminUser(req);
      const verifications = await teacherService.getPendingVerifications();
      sendSuccess(res, verifications);
    },
  );

  reviewVerification = asyncHandler(async (req: Request, res: Response) => {
    const verification = await teacherService.reviewVerification(
      parseRequiredParam(req.params.id, "Verification ID"),
      requireAdminUserId(req),
      parseRequiredEnum(
        req.body?.status,
        REVIEW_VERIFICATION_STATUSES,
        "status",
        "status must be APPROVED or REJECTED",
      ),
      parseOptionalString(
        req.body?.reviewNotes,
        "reviewNotes",
        MAX_LONG_TEXT_LENGTH,
      ),
    );
    sendSuccess(res, verification, "Verification reviewed successfully");
  });

  submitExtendedProfile = asyncHandler(async (req: Request, res: Response) => {
    const profile = await teacherService.submitExtendedProfile(
      requireAuthUserId(req),
      parseExtendedProfilePayload(req.body),
    );
    sendCreated(res, profile, "Profile submitted for review successfully");
  });

  getExtendedProfile = asyncHandler(async (req: Request, res: Response) => {
    const profile = await teacherService.getExtendedProfile(
      requireAuthUserId(req),
    );
    sendSuccess(res, profile);
  });

  updateExtendedProfile = asyncHandler(async (req: Request, res: Response) => {
    const profile = await teacherService.updateExtendedProfile(
      requireAuthUserId(req),
      parseExtendedProfilePayload(req.body),
    );
    sendSuccess(
      res,
      profile,
      "Profile updated successfully and submitted for review",
    );
  });

  getPendingProfileVerifications = asyncHandler(
    async (req: Request, res: Response) => {
      requireAdminUser(req);
      const { page, limit } = parsePagination(req.query);
      const result = await teacherService.getPendingProfileVerifications(
        page as number,
        limit as number,
      );
      sendSuccess(res, result);
    },
  );

  reviewTeacherProfile = asyncHandler(async (req: Request, res: Response) => {
    const profile = await teacherService.reviewTeacherProfile(
      parseRequiredParam(req.params.id, "Profile ID"),
      requireAdminUserId(req),
      parseRequiredEnum(
        req.body?.status,
        REVIEW_VERIFICATION_STATUSES,
        "status",
        "status must be APPROVED or REJECTED",
      ),
      parseOptionalString(
        req.body?.reviewNotes,
        "reviewNotes",
        MAX_LONG_TEXT_LENGTH,
      ),
    );
    sendSuccess(res, profile, "Teacher profile reviewed successfully");
  });

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

  getPendingRegistrations = asyncHandler(
    async (req: Request, res: Response) => {
      requireAdminUser(req);
      const { page, limit } = parsePagination(req.query);
      const result = await teacherService.getPendingRegistrations(
        page as number,
        limit as number,
      );
      sendSuccess(res, result);
    },
  );

  reviewRegistration = asyncHandler(async (req: Request, res: Response) => {
    const updated = await teacherService.reviewRegistration(
      parseRequiredParam(req.params.id, "Registration ID"),
      requireAdminUserId(req),
      parseRequiredEnum(
        req.body?.status,
        REVIEW_REGISTRATION_STATUSES,
        "status",
        "status must be APPROVED or REJECTED",
      ),
      parseOptionalString(
        req.body?.reviewNotes,
        "reviewNotes",
        MAX_LONG_TEXT_LENGTH,
      ),
    );
    sendSuccess(res, updated, "Teacher registration reviewed successfully");
  });
}

export default new TeacherController();

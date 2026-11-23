import {
  Prisma,
  VerificationMethod,
  VerificationStatus,
  RegistrationStatus,
  UserRole,
} from "@prisma/client";
import config from "../config/env";
import prisma from "../config/database";
import logger from "../utils/logger";
import type {
  TeacherProfile,
  Certification,
  TeacherVerification,
  Course,
} from "@prisma/client";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "../utils/errors";
import { buildProtectedAssetDescriptor } from "../utils/protected-asset";
import {
  ensureUrlOrUploadPathForFolders,
  extractUploadPathFromUrlOrPath,
  normalizeOptionalUrlOrPath,
} from "../utils/url-or-path";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";
import autoVerificationService from "./auto-verification.service";
import { buildPaginationMeta, normalizePagination } from "./shared/pagination";
import { toNumber } from "./shared/payment-utils";
import { ensureActiveAdmin } from "./shared/service-helpers";
import {
  buildApprovedTeacherProfileUpdateData,
  buildPublicTeacherWhere,
  createTeacherProfileSubmissionPayload,
  extendedProfileInclude,
  isApprovedTeacherProfileCompletionStatus,
  mapExtendedProfileResponse,
  mapTeacherByIdResponse,
  overlayPendingProfileSubmission,
  parseJsonArray,
  parseProfileJsonLists,
  pendingProfileVerificationInclude,
  PROFILE_STATUS_APPROVED,
  PROFILE_STATUS_INCOMPLETE,
  PROFILE_STATUS_PENDING_REVIEW,
  teacherByIdInclude,
  type ExtendedProfileResponse,
  type PendingProfileVerificationResponse,
  type TeacherByIdResponse,
  type TeacherExtendedProfileInput,
} from "./teacher/teacher-profile-helpers";
import {
  applyActualTeacherStudentCounts,
  calculateActualTeacherStudentCount,
  createTeacherNotification,
  ensureRequiredIdentifier,
  pendingTeacherRegistrationInclude,
  pendingTeacherVerificationInclude,
  requireTeacherProfileById,
  requireTeacherProfileByUserId,
  requireTeacherVerificationById,
  reviewedTeacherRegistrationInclude,
  teacherListInclude,
  teacherOwnProfileInclude,
  teacherProfileSubmissionInclude,
  teacherProfileUpdateInclude,
} from "./teacher/teacher-service-helpers";

const SUPERSEDED_PROFILE_SUBMISSION_REVIEW_NOTE =
  "Superseded by a newer profile submission review";
const TEACHER_CERTIFICATE_UPLOAD_FOLDER = "teacher-certificates";
const MAX_SHORT_TEXT_LENGTH = 150;
const MAX_LONG_TEXT_LENGTH = 5000;
const MAX_TEXT_LIST_ITEMS = 30;

type ReviewVerificationStatus = "APPROVED" | "REJECTED";
type ReviewRegistrationStatus = "APPROVED" | "REJECTED";

type TeacherUpdateInput = {
  bio?: string;
  headline?: string;
  hourlyRate?: number;
};

const mapVerificationAccess = <T extends { id: string }>(verification: T) => ({
  ...verification,
  accessUrl:
    "documentUrl" in verification &&
    typeof verification.documentUrl === "string" &&
    !extractUploadPathFromUrlOrPath(verification.documentUrl)
      ? verification.documentUrl
      : `/api/${config.API_VERSION}/teachers/verifications/${verification.id}/document`,
});

const isTeacherCertificateUploadPath = (uploadPath: string): boolean =>
  uploadPath.split("/")[0] === TEACHER_CERTIFICATE_UPLOAD_FOLDER;

const collectTeacherCertificateUploadPaths = (teacherProfile: {
  certificatePhotos: string | null;
  certifications: Array<{ credentialUrl: string | null }>;
  profileSubmissions: Array<{ payload: Prisma.JsonValue | null }>;
}): Set<string> => {
  const uploadPaths = new Set<string>();
  const addCandidate = (value: string | null | undefined) => {
    const uploadPath = value ? extractUploadPathFromUrlOrPath(value) : null;
    if (uploadPath && isTeacherCertificateUploadPath(uploadPath)) {
      uploadPaths.add(uploadPath);
    }
  };

  for (const item of parseJsonArray(teacherProfile.certificatePhotos)) {
    if (typeof item === "string") addCandidate(item);
  }

  for (const certification of teacherProfile.certifications) {
    addCandidate(certification.credentialUrl);
  }

  for (const submission of teacherProfile.profileSubmissions) {
    const payload = submission.payload;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const photos = (payload as Record<string, unknown>).certificatePhotos;
      if (Array.isArray(photos)) {
        for (const item of photos) {
          if (typeof item === "string") addCandidate(item);
        }
      }
    }
  }

  return uploadPaths;
};

const normalizeOptionalTeacherText = (
  value?: string,
  maxLength = MAX_LONG_TEXT_LENGTH,
): string | undefined => {
  if (value === undefined) return undefined;
  const trimmedValue = sanitizeUserPlainText(value);
  if (!trimmedValue) return undefined;

  if (trimmedValue.length > maxLength) {
    throw new ValidationError(
      `Text value must not exceed ${maxLength} characters`,
    );
  }
  return trimmedValue;
};

const normalizeRequiredTeacherText = (
  value: string | undefined,
  fieldName: string,
  maxLength = MAX_SHORT_TEXT_LENGTH,
): string => {
  const normalizedValue = normalizeOptionalTeacherText(value, maxLength);
  if (!normalizedValue) {
    throw new ValidationError(`${fieldName} is required`);
  }
  return normalizedValue;
};

const normalizeTeacherTextList = (values?: string[]): string[] | undefined => {
  if (values === undefined) return undefined;

  const normalizedValues = values
    .map((value) => sanitizeUserPlainText(value))
    .filter(Boolean);

  if (normalizedValues.length > MAX_TEXT_LIST_ITEMS) {
    throw new ValidationError(
      `List values must not exceed ${MAX_TEXT_LIST_ITEMS} items`,
    );
  }

  return normalizedValues;
};

const normalizeNonNegativeNumber = (
  value: number | undefined,
  fieldName: string,
): number | undefined => {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError(`${fieldName} must be a non-negative number`);
  }
  return Math.round(value * 100) / 100;
};

const normalizeTeacherAsset = (
  value: string | undefined,
  allowedFolders: string[],
  errorMessage: string,
): string | undefined => {
  const normalizedValue = normalizeOptionalUrlOrPath(value) ?? undefined;
  return normalizedValue
    ? ensureUrlOrUploadPathForFolders(
        normalizedValue,
        allowedFolders,
        errorMessage,
      )
    : undefined;
};

const normalizeTeacherAssetList = (
  values: string[] | undefined,
  allowedFolders: string[],
  errorMessage: string,
): string[] | undefined => {
  if (values === undefined) return undefined;
  return values
    .map((value) => normalizeOptionalUrlOrPath(value) ?? undefined)
    .filter((value): value is string => Boolean(value))
    .map((value) =>
      ensureUrlOrUploadPathForFolders(value, allowedFolders, errorMessage),
    );
};

const normalizeTeacherExtendedProfileInput = (
  data: TeacherExtendedProfileInput,
): TeacherExtendedProfileInput => ({
  ...data,
  selfIntroduction: normalizeOptionalTeacherText(data.selfIntroduction),
  educationBackground: normalizeOptionalTeacherText(data.educationBackground),
  teachingExperience: normalizeOptionalTeacherText(data.teachingExperience),
  awards: normalizeTeacherTextList(data.awards),
  specialties: normalizeTeacherTextList(data.specialties),
  teachingStyle: normalizeOptionalTeacherText(data.teachingStyle),
  languages: normalizeTeacherTextList(data.languages),
  yearsOfExperience:
    data.yearsOfExperience === undefined
      ? undefined
      : Math.floor(
          normalizeNonNegativeNumber(
            data.yearsOfExperience,
            "Years of experience",
          ) ?? 0,
        ),
  profilePhoto: normalizeTeacherAsset(
    data.profilePhoto,
    ["teacher-profiles"],
    "Profile photo must be an external URL or use the /uploads/teacher-profiles/ folder",
  ),
  certificatePhotos: normalizeTeacherAssetList(
    data.certificatePhotos,
    ["teacher-certificates"],
    "Certificate photos must be external URLs or use the /uploads/teacher-certificates/ folder",
  ),
});

const normalizeTeacherProfileUpdateData = (
  data: TeacherUpdateInput,
): Prisma.TeacherProfileUpdateInput => {
  const updateData: Prisma.TeacherProfileUpdateInput = {};

  if (data.bio !== undefined) {
    updateData.bio = normalizeOptionalTeacherText(data.bio);
  }
  if (data.headline !== undefined) {
    updateData.headline = normalizeOptionalTeacherText(
      data.headline,
      MAX_SHORT_TEXT_LENGTH,
    );
  }
  if (data.hourlyRate !== undefined) {
    updateData.hourlyRate = normalizeNonNegativeNumber(
      data.hourlyRate,
      "Hourly rate",
    );
  }

  if (Object.keys(updateData).length === 0) {
    throw new ValidationError(
      "At least one profile field must be provided for update",
    );
  }

  return updateData;
};

const normalizeReviewVerificationStatus = (
  status: ReviewVerificationStatus,
): VerificationStatus => {
  if (status === VerificationStatus.APPROVED) return VerificationStatus.APPROVED;
  if (status === VerificationStatus.REJECTED) return VerificationStatus.REJECTED;
  throw new ValidationError("Review status must be APPROVED or REJECTED");
};

const normalizeReviewRegistrationStatus = (
  status: ReviewRegistrationStatus,
): RegistrationStatus => {
  if (status === RegistrationStatus.APPROVED) return RegistrationStatus.APPROVED;
  if (status === RegistrationStatus.REJECTED) return RegistrationStatus.REJECTED;
  throw new ValidationError("Registration status must be APPROVED or REJECTED");
};

const assertValidDate = (
  date: Date | undefined,
  fieldName: string,
): Date | undefined => {
  if (date === undefined) return undefined;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`);
  }
  return date;
};

class TeacherService {
  private async saveExtendedProfileSubmission(
    userId: string,
    data: TeacherExtendedProfileInput,
    preserveApprovedVisibility: boolean,
  ) {
    const normalizedUserId = ensureRequiredIdentifier(userId, "User ID");
    const teacherProfile =
      await requireTeacherProfileByUserId(normalizedUserId);
    const normalizedData = normalizeTeacherExtendedProfileInput(data);
    const submissionTime = new Date();
    const nextCompletionStatus =
      preserveApprovedVisibility &&
      isApprovedTeacherProfileCompletionStatus(
        teacherProfile.profileCompletionStatus,
      )
        ? PROFILE_STATUS_APPROVED
        : PROFILE_STATUS_PENDING_REVIEW;

    return prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.teacherProfile.update({
        where: { userId: normalizedUserId },
        data: {
          profileCompletionStatus: nextCompletionStatus,
          profileSubmittedAt: submissionTime,
          profileReviewedAt: null,
          profileReviewNotes: null,
        },
        include: teacherProfileSubmissionInclude,
      });

      await tx.teacherProfileSubmission.create({
        data: {
          teacherProfileId: teacherProfile.id,
          status: VerificationStatus.PENDING,
          submittedAt: submissionTime,
          payload: createTeacherProfileSubmissionPayload(normalizedData),
        },
      });

      return updatedProfile;
    });
  }

  async getAllTeachers(filters: {
    isVerified?: boolean;
    category?: string;
    minRating?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const pagination = normalizePagination(filters.page, filters.limit);
    const where = buildPublicTeacherWhere(filters);

    const [teachers, total] = await Promise.all([
      prisma.teacherProfile.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        include: teacherListInclude,
        orderBy: [{ averageRating: "desc" }, { createdAt: "desc" }],
      }),
      prisma.teacherProfile.count({ where }),
    ]);

    return {
      teachers: await applyActualTeacherStudentCounts(teachers),
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async getTeacherById(teacherId: string): Promise<TeacherByIdResponse> {
    const normalizedTeacherId = ensureRequiredIdentifier(
      teacherId,
      "Teacher ID",
    );

    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: normalizedTeacherId },
      include: teacherByIdInclude,
    });

    if (
      !teacher ||
      teacher.registrationStatus !== RegistrationStatus.APPROVED ||
      !isApprovedTeacherProfileCompletionStatus(
        teacher.profileCompletionStatus,
      ) ||
      !teacher.user.isActive
    ) {
      throw new NotFoundError("Teacher not found");
    }

    const actualStudentCount =
      await calculateActualTeacherStudentCount(normalizedTeacherId);
    return mapTeacherByIdResponse(teacher, actualStudentCount);
  }

  async getTeacherByUserId(userId: string): Promise<
    TeacherProfile & {
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatar: string | null;
        createdAt: Date;
      };
      certifications: Certification[];
      courses: Course[];
      verifications: TeacherVerification[];
    }
  > {
    const normalizedUserId = ensureRequiredIdentifier(userId, "User ID");
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId: normalizedUserId },
      include: teacherOwnProfileInclude,
    });

    if (!teacher) {
      throw new NotFoundError("Teacher profile not found");
    }
    return teacher;
  }

  async updateTeacherProfile(userId: string, data: TeacherUpdateInput) {
    const normalizedUserId = ensureRequiredIdentifier(userId, "User ID");
    await requireTeacherProfileByUserId(normalizedUserId);

    return prisma.teacherProfile.update({
      where: { userId: normalizedUserId },
      data: normalizeTeacherProfileUpdateData(data),
      include: teacherProfileUpdateInclude,
    });
  }

  async addCertification(
    userId: string,
    data: {
      title: string;
      issuer: string;
      issueDate: Date;
      expiryDate?: Date;
      credentialId?: string;
      credentialUrl?: string;
    },
  ): Promise<Certification> {
    const normalizedUserId = ensureRequiredIdentifier(userId, "User ID");
    const teacherProfile =
      await requireTeacherProfileByUserId(normalizedUserId);

    const normalizedIssueDate = assertValidDate(data.issueDate, "Issue date");
    const normalizedExpiryDate = assertValidDate(
      data.expiryDate,
      "Expiry date",
    );

    if (!normalizedIssueDate) {
      throw new ValidationError("Issue date is required");
    }

    if (normalizedExpiryDate && normalizedExpiryDate < normalizedIssueDate) {
      throw new ValidationError(
        "Expiry date cannot be earlier than issue date",
      );
    }

    return prisma.certification.create({
      data: {
        teacherProfileId: teacherProfile.id,
        title: normalizeRequiredTeacherText(data.title, "Certification title"),
        issuer: normalizeRequiredTeacherText(
          data.issuer,
          "Certification issuer",
        ),
        issueDate: normalizedIssueDate,
        expiryDate: normalizedExpiryDate,
        credentialId: normalizeOptionalTeacherText(
          data.credentialId,
          MAX_SHORT_TEXT_LENGTH,
        ),
        credentialUrl: normalizeTeacherAsset(
          data.credentialUrl,
          [TEACHER_CERTIFICATE_UPLOAD_FOLDER],
          "Credential URL must be an external URL or use the /uploads/teacher-certificates/ folder",
        ),
      },
    });
  }

  async deleteCertification(
    userId: string,
    certificationId: string,
  ): Promise<{ message: string }> {
    const normalizedUserId = ensureRequiredIdentifier(userId, "User ID");
    const normalizedCertificationId = ensureRequiredIdentifier(
      certificationId,
      "Certification ID",
    );
    const teacherProfile =
      await requireTeacherProfileByUserId(normalizedUserId);

    const certification = await prisma.certification.findUnique({
      where: { id: normalizedCertificationId },
      select: { id: true, teacherProfileId: true },
    });

    if (
      !certification ||
      certification.teacherProfileId !== teacherProfile.id
    ) {
      throw new AuthorizationError(
        "You can only delete your own certifications",
      );
    }

    await prisma.certification.delete({
      where: { id: normalizedCertificationId },
    });

    return { message: "Certification deleted successfully" };
  }

  async submitVerification(
    userId: string,
    documentType: string,
    documentUrl: string,
  ): Promise<TeacherVerification> {
    const normalizedUserId = ensureRequiredIdentifier(userId, "User ID");
    const normalizedDocumentType = normalizeRequiredTeacherText(
      documentType,
      "Document type",
    );
    const normalizedDocumentUrl = ensureRequiredIdentifier(
      ensureUrlOrUploadPathForFolders(
        documentUrl,
        ["verifications"],
        "Document URL must be an external URL or use the /uploads/verifications/ folder",
      ),
      "Document URL",
    );
    const teacherProfile =
      await requireTeacherProfileByUserId(normalizedUserId);

    const verification = await prisma.teacherVerification.create({
      data: {
        teacherProfileId: teacherProfile.id,
        documentType: normalizedDocumentType,
        documentUrl: normalizedDocumentUrl,
        status: VerificationStatus.PENDING,
      },
    });

    void this.triggerAutoVerification(verification.id);
    return mapVerificationAccess(verification);
  }

  private async triggerAutoVerification(verificationId: string): Promise<void> {
    try {
      await autoVerificationService.processVerification(verificationId);
    } catch (error) {
      logger.error("Auto-verification processing failed (non-blocking)", {
        verificationId,
        error,
      });
    }
  }

  async getVerifications(userId: string): Promise<TeacherVerification[]> {
    const normalizedUserId = ensureRequiredIdentifier(userId, "User ID");
    const teacherProfile =
      await requireTeacherProfileByUserId(normalizedUserId);

    const verifications = await prisma.teacherVerification.findMany({
      where: { teacherProfileId: teacherProfile.id },
      orderBy: { submittedAt: "desc" },
    });

    return verifications.map(mapVerificationAccess);
  }

  async reviewVerification(
    verificationId: string,
    adminId: string,
    status: ReviewVerificationStatus,
    reviewNotes?: string,
  ): Promise<TeacherVerification> {
    const normalizedVerificationId = ensureRequiredIdentifier(
      verificationId,
      "Verification ID",
    );
    const normalizedStatus = normalizeReviewVerificationStatus(status);
    const normalizedReviewNotes = normalizeOptionalTeacherText(reviewNotes);

    if (
      normalizedStatus === VerificationStatus.REJECTED &&
      !normalizedReviewNotes
    ) {
      throw new ValidationError(
        "Review notes are required when rejecting a verification",
      );
    }

    const normalizedAdminId = await ensureActiveAdmin(
      adminId,
      "review teacher records",
    );
    const verification = await requireTeacherVerificationById(
      normalizedVerificationId,
    );

    if (verification.status !== VerificationStatus.PENDING) {
      throw new ValidationError("Only pending verifications can be reviewed");
    }

    const reviewTimestamp = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.teacherVerification.updateMany({
        where: {
          id: normalizedVerificationId,
          status: VerificationStatus.PENDING,
        },
        data: {
          status: normalizedStatus,
          verificationMethod: VerificationMethod.MANUAL,
          reviewedBy: normalizedAdminId,
          reviewNotes: normalizedReviewNotes ?? null,
          reviewedAt: reviewTimestamp,
        },
      });

      if (updateResult.count !== 1) {
        throw new ValidationError(
          "Verification status changed while review was being processed",
        );
      }

      const hasApprovedVerification =
        normalizedStatus === VerificationStatus.APPROVED ||
        (await tx.teacherVerification.count({
          where: {
            teacherProfileId: verification.teacherProfileId,
            status: VerificationStatus.APPROVED,
          },
        })) > 0;

      await tx.teacherProfile.update({
        where: { id: verification.teacherProfileId },
        data: {
          isVerified: hasApprovedVerification,
          verificationStatus: hasApprovedVerification
            ? VerificationStatus.APPROVED
            : normalizedStatus,
        },
      });

      return tx.teacherVerification.findUniqueOrThrow({
        where: { id: normalizedVerificationId },
      });
    });

    await createTeacherNotification({
      userId: verification.teacherProfile.userId,
      title:
        normalizedStatus === VerificationStatus.APPROVED
          ? "Verification Approved"
          : "Verification Rejected",
      message:
        normalizedStatus === VerificationStatus.APPROVED
          ? "Your verification has been approved."
          : `Your verification has been rejected. Reason: ${
              normalizedReviewNotes || "Not specified"
            }`,
      type: "verification",
    });

    return mapVerificationAccess(updated);
  }

  async getPendingVerifications() {
    const verifications = await prisma.teacherVerification.findMany({
      where: { status: VerificationStatus.PENDING },
      include: pendingTeacherVerificationInclude,
      orderBy: { submittedAt: "asc" },
    });

    return verifications.map(mapVerificationAccess);
  }

  async getVerificationDocumentAsset(
    requesterUserId: string,
    requesterRole: UserRole,
    verificationId: string,
  ) {
    const normalizedRequesterUserId = ensureRequiredIdentifier(
      requesterUserId,
      "User ID",
    );
    const normalizedVerificationId = ensureRequiredIdentifier(
      verificationId,
      "Verification ID",
    );

    const verification = await prisma.teacherVerification.findUnique({
      where: { id: normalizedVerificationId },
      select: {
        id: true,
        documentType: true,
        documentUrl: true,
        teacherProfile: { select: { userId: true } },
      },
    });

    if (!verification) {
      throw new NotFoundError("Verification not found");
    }

    if (
      requesterRole !== UserRole.ADMIN &&
      verification.teacherProfile.userId !== normalizedRequesterUserId
    ) {
      throw new AuthorizationError(
        "You can only access your own verification documents",
      );
    }

    return buildProtectedAssetDescriptor(verification.documentUrl, {
      allowedFolders: ["verifications"],
      fallbackFileName: `${verification.documentType}-${verification.id}`,
    });
  }

  async getCertificateAsset(
    requesterUserId: string,
    requesterRole: UserRole,
    certificateUrl: string,
  ) {
    const normalizedRequesterUserId = ensureRequiredIdentifier(
      requesterUserId,
      "User ID",
    );
    const normalizedCertificateUrl = ensureRequiredIdentifier(
      certificateUrl,
      "Certificate URL",
    );
    const uploadPath = extractUploadPathFromUrlOrPath(normalizedCertificateUrl);

    if (!uploadPath || !isTeacherCertificateUploadPath(uploadPath)) {
      throw new ValidationError(
        "Certificate URL must point to the /uploads/teacher-certificates/ folder",
      );
    }

    if (requesterRole !== UserRole.ADMIN && requesterRole !== UserRole.TEACHER) {
      throw new AuthorizationError(
        "Only admins or the owning teacher can access certificate files",
      );
    }

    if (requesterRole === UserRole.TEACHER) {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: normalizedRequesterUserId },
        select: {
          certificatePhotos: true,
          certifications: { select: { credentialUrl: true } },
          profileSubmissions: {
            where: { status: VerificationStatus.PENDING },
            select: { payload: true },
          },
        },
      });

      if (!teacherProfile) {
        throw new NotFoundError("Teacher profile not found");
      }

      if (
        !collectTeacherCertificateUploadPaths(teacherProfile).has(uploadPath)
      ) {
        throw new AuthorizationError(
          "You can only access certificate files linked to your own profile",
        );
      }
    }

    return buildProtectedAssetDescriptor(normalizedCertificateUrl, {
      allowedFolders: [TEACHER_CERTIFICATE_UPLOAD_FOLDER],
      fallbackFileName: "teacher-certificate",
    });
  }

  async getTeacherStats(userId: string) {
    const normalizedUserId = ensureRequiredIdentifier(userId, "User ID");
    const teacherProfile =
      await requireTeacherProfileByUserId(normalizedUserId);

    const [totalCourses, totalEnrollments, totalStudents] = await Promise.all([
      prisma.course.count({ where: { teacherProfileId: teacherProfile.id } }),
      prisma.enrollment.count({
        where: {
          package: { course: { teacherProfileId: teacherProfile.id } },
        },
      }),
      calculateActualTeacherStudentCount(teacherProfile.id),
    ]);

    return {
      totalCourses,
      totalEnrollments,
      totalRevenue: toNumber(teacherProfile.totalEarnings),
      averageRating: toNumber(teacherProfile.averageRating),
      totalStudents,
      isVerified: teacherProfile.isVerified,
    };
  }

  async submitExtendedProfile(userId: string, data: TeacherExtendedProfileInput) {
    return this.saveExtendedProfileSubmission(userId, data, false);
  }

  async getExtendedProfile(userId: string): Promise<ExtendedProfileResponse> {
    const normalizedUserId = ensureRequiredIdentifier(userId, "User ID");
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: normalizedUserId },
      include: extendedProfileInclude,
    });

    if (!teacherProfile) {
      throw new NotFoundError("Teacher profile not found");
    }

    return mapExtendedProfileResponse(teacherProfile);
  }

  async updateExtendedProfile(userId: string, data: TeacherExtendedProfileInput) {
    return this.saveExtendedProfileSubmission(userId, data, true);
  }

  async getPendingRegistrations(page = 1, limit = 10) {
    const pagination = normalizePagination(page, limit);
    const where = { registrationStatus: RegistrationStatus.PENDING };

    const [teachers, total] = await Promise.all([
      prisma.teacherProfile.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        include: pendingTeacherRegistrationInclude,
        orderBy: { createdAt: "asc" },
      }),
      prisma.teacherProfile.count({ where }),
    ]);

    return {
      teachers,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async reviewRegistration(
    teacherProfileId: string,
    adminId: string,
    status: ReviewRegistrationStatus,
    reviewNotes?: string,
  ) {
    const normalizedTeacherProfileId = ensureRequiredIdentifier(
      teacherProfileId,
      "Teacher profile ID",
    );
    const normalizedStatus = normalizeReviewRegistrationStatus(status);
    const normalizedReviewNotes = normalizeOptionalTeacherText(reviewNotes);

    await ensureActiveAdmin(adminId, "review teacher records");

    const reviewed = await prisma.$transaction(async (tx) => {
      const currentProfile = await tx.teacherProfile.findUnique({
        where: { id: normalizedTeacherProfileId },
        select: {
          id: true,
          registrationStatus: true,
          user: { select: { id: true } },
        },
      });

      if (!currentProfile) {
        throw new NotFoundError("Teacher profile not found");
      }

      if (currentProfile.registrationStatus !== RegistrationStatus.PENDING) {
        throw new ValidationError("Only pending registrations can be reviewed");
      }

      const nextIsActive = normalizedStatus !== RegistrationStatus.REJECTED;
      const reviewedProfile = await tx.teacherProfile.update({
        where: { id: normalizedTeacherProfileId },
        data: { registrationStatus: normalizedStatus },
        include: reviewedTeacherRegistrationInclude,
      });

      await tx.user.update({
        where: { id: currentProfile.user.id },
        data: { isActive: nextIsActive },
      });

      return {
        ...reviewedProfile,
        user: {
          ...reviewedProfile.user,
          isActive: nextIsActive,
        },
      };
    });

    await createTeacherNotification({
      userId: reviewed.user.id,
      title:
        normalizedStatus === RegistrationStatus.APPROVED
          ? "Teacher Registration Approved"
          : "Teacher Registration Rejected",
      message:
        normalizedStatus === RegistrationStatus.APPROVED
          ? "Your teacher registration has been approved."
          : `Your teacher registration has been rejected. Reason: ${
              normalizedReviewNotes || "Not specified"
            }`,
      type: "registration",
    });

    return reviewed;
  }

  async getPendingProfileVerifications(
    page = 1,
    limit = 10,
  ): Promise<{
    teachers: PendingProfileVerificationResponse[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const pagination = normalizePagination(page, limit);
    const where: Prisma.TeacherProfileWhereInput = {
      profileSubmissions: {
        some: { status: VerificationStatus.PENDING },
      },
    };

    const [teachers, total] = await Promise.all([
      prisma.teacherProfile.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        include: pendingProfileVerificationInclude,
        orderBy: { profileSubmittedAt: "asc" },
      }),
      prisma.teacherProfile.count({ where }),
    ]);

    return {
      teachers: teachers.map(overlayPendingProfileSubmission),
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async reviewTeacherProfile(
    teacherProfileId: string,
    adminId: string,
    status: ReviewVerificationStatus,
    reviewNotes?: string,
  ) {
    const normalizedTeacherProfileId = ensureRequiredIdentifier(
      teacherProfileId,
      "Teacher profile ID",
    );
    const normalizedStatus = normalizeReviewVerificationStatus(status);
    const normalizedReviewNotes = normalizeOptionalTeacherText(reviewNotes);
    const normalizedAdminId = await ensureActiveAdmin(
      adminId,
      "review teacher records",
    );

    const teacherProfile = await requireTeacherProfileById(
      normalizedTeacherProfileId,
    );

    const submission = await prisma.teacherProfileSubmission.findFirst({
      where: {
        teacherProfileId: normalizedTeacherProfileId,
        status: VerificationStatus.PENDING,
      },
      orderBy: { submittedAt: "desc" },
    });

    if (!submission) {
      throw new NotFoundError("No submission found for this teacher");
    }

    const reviewTimestamp = new Date();
    const isApproved = normalizedStatus === VerificationStatus.APPROVED;

    const updated = await prisma.$transaction(async (tx) => {
      const currentSubmission = await tx.teacherProfileSubmission.findUnique({
        where: { id: submission.id },
        select: { id: true, status: true, payload: true },
      });

      if (
        !currentSubmission ||
        currentSubmission.status !== VerificationStatus.PENDING
      ) {
        throw new ValidationError(
          "Profile submission has already been reviewed",
        );
      }

      const profileData: Prisma.TeacherProfileUpdateInput = isApproved
        ? buildApprovedTeacherProfileUpdateData(
            teacherProfile,
            currentSubmission.payload,
            normalizedReviewNotes,
            reviewTimestamp,
          )
        : {
            profileCompletionStatus: isApprovedTeacherProfileCompletionStatus(
              teacherProfile.profileCompletionStatus,
            )
              ? PROFILE_STATUS_APPROVED
              : PROFILE_STATUS_INCOMPLETE,
            profileReviewedAt: reviewTimestamp,
            profileReviewNotes: normalizedReviewNotes,
          };

      const updatedProfile = await tx.teacherProfile.update({
        where: { id: normalizedTeacherProfileId },
        data: profileData,
        include: teacherProfileSubmissionInclude,
      });

      await tx.teacherProfileSubmission.update({
        where: { id: submission.id },
        data: {
          status: normalizedStatus,
          reviewedBy: normalizedAdminId,
          reviewedAt: reviewTimestamp,
          reviewNotes: normalizedReviewNotes,
          payload: Prisma.DbNull,
        },
      });

      await tx.teacherProfileSubmission.updateMany({
        where: {
          teacherProfileId: normalizedTeacherProfileId,
          status: VerificationStatus.PENDING,
          NOT: { id: submission.id },
        },
        data: {
          status: VerificationStatus.REJECTED,
          reviewedBy: normalizedAdminId,
          reviewedAt: reviewTimestamp,
          reviewNotes: SUPERSEDED_PROFILE_SUBMISSION_REVIEW_NOTE,
          payload: Prisma.DbNull,
        },
      });

      return updatedProfile;
    });

    await createTeacherNotification({
      userId: updated.user.id,
      title: isApproved ? "Profile Approved" : "Profile Rejected",
      message: isApproved
        ? "Your teacher profile submission has been approved."
        : `Your teacher profile submission was rejected. Reason: ${
            normalizedReviewNotes || "Not specified"
          }`,
      type: "profile",
    });

    return updated;
  }

  async getVerifiedTeachers(filters: {
    search?: string;
    minRating?: number;
    page?: number;
    limit?: number;
  }) {
    const pagination = normalizePagination(filters.page, filters.limit);
    const where = buildPublicTeacherWhere({
      isVerified: true,
      minRating: filters.minRating,
      search: filters.search,
    });

    const [teachers, total] = await Promise.all([
      prisma.teacherProfile.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        include: teacherListInclude,
        orderBy: [{ averageRating: "desc" }, { createdAt: "desc" }],
      }),
      prisma.teacherProfile.count({ where }),
    ]);

    const teachersWithActualCounts =
      await applyActualTeacherStudentCounts(teachers);

    return {
      teachers: teachersWithActualCounts.map((teacher) => ({
        ...teacher,
        ...parseProfileJsonLists(teacher),
      })),
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }
}

export default new TeacherService();

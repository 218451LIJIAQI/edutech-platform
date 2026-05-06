import { RegistrationStatus, VerificationStatus } from "@prisma/client";
import type { Prisma, TeacherProfile } from "@prisma/client";
import { sanitizeUserPlainText } from "../../utils/sanitize-user-content";

export const PROFILE_STATUS_INCOMPLETE = "INCOMPLETE";
export const PROFILE_STATUS_PENDING_REVIEW = "PENDING_REVIEW";
export const PROFILE_STATUS_APPROVED = "APPROVED";
export const LEGACY_PROFILE_STATUS_COMPLETE = "COMPLETE";

export const normalizeTeacherProfileCompletionStatus = (
  status: string | null | undefined,
): string => {
  if (status === LEGACY_PROFILE_STATUS_COMPLETE) {
    return PROFILE_STATUS_APPROVED;
  }

  return status ?? PROFILE_STATUS_INCOMPLETE;
};

export const isApprovedTeacherProfileCompletionStatus = (
  status: string | null | undefined,
): boolean =>
  normalizeTeacherProfileCompletionStatus(status) === PROFILE_STATUS_APPROVED;

export const teacherByIdInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      isActive: true,
      createdAt: true,
    },
  },
  certifications: true,
  courses: {
    where: { isPublished: true },
    include: {
      _count: {
        select: { lessons: true },
      },
    },
    orderBy: { createdAt: "desc" },
  },
  verifications: {
    where: { status: VerificationStatus.APPROVED },
    select: {
      id: true,
      documentType: true,
      status: true,
      submittedAt: true,
      reviewedAt: true,
    },
  },
} satisfies Prisma.TeacherProfileInclude;

export const extendedProfileInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatar: true,
    },
  },
  certifications: true,
  profileSubmissions: {
    where: { status: VerificationStatus.PENDING },
    orderBy: { submittedAt: "desc" },
    take: 1,
    select: {
      submittedAt: true,
    },
  },
} satisfies Prisma.TeacherProfileInclude;

export const pendingProfileVerificationInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatar: true,
    },
  },
  profileSubmissions: {
    where: { status: VerificationStatus.PENDING },
    orderBy: { submittedAt: "desc" },
    take: 1,
  },
} satisfies Prisma.TeacherProfileInclude;

export type TeacherByIdRecord = Prisma.TeacherProfileGetPayload<{
  include: typeof teacherByIdInclude;
}>;

export type TeacherByIdResponse = Omit<
  TeacherByIdRecord,
  | "awards"
  | "specialties"
  | "languages"
  | "certificatePhotos"
  | "totalStudents"
  | "selfIntroduction"
  | "educationBackground"
  | "teachingExperience"
  | "teachingStyle"
  | "yearsOfExperience"
  | "profilePhoto"
> & {
  totalStudents: number;
  awards: unknown[];
  specialties: unknown[];
  languages: unknown[];
  certificatePhotos: unknown[];
  selfIntroduction: string | null | undefined;
  educationBackground: string | null | undefined;
  teachingExperience: string | null | undefined;
  teachingStyle: string | null | undefined;
  yearsOfExperience: number | null | undefined;
  profilePhoto: string | null | undefined;
};

export type ExtendedProfileRecord = Prisma.TeacherProfileGetPayload<{
  include: typeof extendedProfileInclude;
}>;

export type ExtendedProfileResponse = Omit<
  ExtendedProfileRecord,
  "awards" | "specialties" | "languages" | "certificatePhotos"
> & {
  awards: unknown[];
  specialties: unknown[];
  languages: unknown[];
  certificatePhotos: unknown[];
  hasPendingProfileSubmission: boolean;
  pendingProfileSubmittedAt?: Date;
};

export type PendingProfileVerificationTeacher =
  Prisma.TeacherProfileGetPayload<{
    include: typeof pendingProfileVerificationInclude;
  }>;

export type PendingProfileVerificationResponse = Omit<
  PendingProfileVerificationTeacher,
  | "awards"
  | "specialties"
  | "languages"
  | "certificatePhotos"
  | "selfIntroduction"
  | "educationBackground"
  | "teachingExperience"
  | "teachingStyle"
  | "yearsOfExperience"
  | "profilePhoto"
> & {
  awards: unknown[];
  specialties: unknown[];
  languages: unknown[];
  certificatePhotos: unknown[];
  selfIntroduction: string | null | undefined;
  educationBackground: string | null | undefined;
  teachingExperience: string | null | undefined;
  teachingStyle: string | null | undefined;
  yearsOfExperience: number | null | undefined;
  profilePhoto: string | null | undefined;
};

export interface TeacherExtendedProfileInput {
  selfIntroduction?: string;
  educationBackground?: string;
  teachingExperience?: string;
  awards?: string[];
  specialties?: string[];
  teachingStyle?: string;
  languages?: string[];
  yearsOfExperience?: number;
  profilePhoto?: string;
  certificatePhotos?: string[];
}

interface TeacherProfileSubmissionDraft {
  selfIntroduction?: string | null;
  educationBackground?: string | null;
  teachingExperience?: string | null;
  awards?: string[];
  specialties?: string[];
  teachingStyle?: string | null;
  languages?: string[];
  yearsOfExperience?: number | null;
  profilePhoto?: string | null;
  certificatePhotos?: string[];
}

const clampRating = (value: number): number => Math.min(Math.max(value, 0), 5);

const sanitizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = sanitizeUserPlainText(value);
  return trimmed.length > 0 ? trimmed : undefined;
};

const sanitizeNullableString = (value: unknown): string | null | undefined => {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = sanitizeUserPlainText(value);
  return trimmed.length > 0 ? trimmed : null;
};

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => sanitizeUserPlainText(item))
    .filter((item) => item.length > 0);
};

const sanitizeOptionalStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return sanitizeStringArray(value);
};

const sanitizeNullableNonNegativeInteger = (
  value: unknown,
): number | null | undefined => {
  if (value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  const integerValue = Math.floor(value);
  return integerValue >= 0 ? integerValue : undefined;
};

export const parseJsonArray = (
  jsonString: string | null | undefined,
): unknown[] => {
  if (!jsonString) {
    return [];
  }

  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const buildPublicTeacherWhere = (filters: {
  isVerified?: boolean;
  category?: string;
  minRating?: number;
  search?: string;
}): Prisma.TeacherProfileWhereInput => {
  const search = sanitizeOptionalString(filters.search);
  const category = sanitizeOptionalString(filters.category);

  const where: Prisma.TeacherProfileWhereInput = {
    registrationStatus: RegistrationStatus.APPROVED,
    profileCompletionStatus: {
      in: [PROFILE_STATUS_APPROVED, LEGACY_PROFILE_STATUS_COMPLETE],
    },
    user: {
      is: {
        isActive: true,
      },
    },
  };

  if (typeof filters.isVerified === "boolean") {
    where.isVerified = filters.isVerified;
  }

  if (
    typeof filters.minRating === "number" &&
    Number.isFinite(filters.minRating)
  ) {
    where.averageRating = {
      gte: clampRating(filters.minRating),
    };
  }

  if (search) {
    where.OR = [
      {
        user: { is: { firstName: { contains: search, mode: "insensitive" } } },
      },
      { user: { is: { lastName: { contains: search, mode: "insensitive" } } } },
      { headline: { contains: search, mode: "insensitive" } },
      { bio: { contains: search, mode: "insensitive" } },
      { specialties: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.courses = {
      some: {
        isPublished: true,
        category: {
          equals: category,
          mode: "insensitive",
        },
      },
    };
  }

  return where;
};

const normalizeSubmissionDraft = (
  payload: Prisma.JsonValue | null | undefined,
): TeacherProfileSubmissionDraft => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const value = payload as Record<string, unknown>;

  return {
    selfIntroduction: sanitizeNullableString(value.selfIntroduction),
    educationBackground: sanitizeNullableString(value.educationBackground),
    teachingExperience: sanitizeNullableString(value.teachingExperience),
    awards: sanitizeOptionalStringArray(value.awards),
    specialties: sanitizeOptionalStringArray(value.specialties),
    teachingStyle: sanitizeNullableString(value.teachingStyle),
    languages: sanitizeOptionalStringArray(value.languages),
    yearsOfExperience: sanitizeNullableNonNegativeInteger(
      value.yearsOfExperience,
    ),
    profilePhoto: sanitizeNullableString(value.profilePhoto),
    certificatePhotos: sanitizeOptionalStringArray(value.certificatePhotos),
  };
};

export const createTeacherProfileSubmissionPayload = (
  data: TeacherExtendedProfileInput,
): Prisma.InputJsonValue => ({
  selfIntroduction: sanitizeOptionalString(data.selfIntroduction) ?? null,
  educationBackground: sanitizeOptionalString(data.educationBackground) ?? null,
  teachingExperience: sanitizeOptionalString(data.teachingExperience) ?? null,
  awards: sanitizeStringArray(data.awards),
  specialties: sanitizeStringArray(data.specialties),
  teachingStyle: sanitizeOptionalString(data.teachingStyle) ?? null,
  languages: sanitizeStringArray(data.languages),
  yearsOfExperience:
    typeof data.yearsOfExperience === "number" &&
    Number.isFinite(data.yearsOfExperience) &&
    data.yearsOfExperience >= 0
      ? Math.floor(data.yearsOfExperience)
      : null,
  profilePhoto: sanitizeOptionalString(data.profilePhoto) ?? null,
  certificatePhotos: sanitizeStringArray(data.certificatePhotos),
});

export const mapTeacherByIdResponse = (
  teacher: TeacherByIdRecord,
  actualStudentCount: number,
): TeacherByIdResponse => {
  const approved = isApprovedTeacherProfileCompletionStatus(
    teacher.profileCompletionStatus,
  );

  return {
    ...teacher,
    profileCompletionStatus: normalizeTeacherProfileCompletionStatus(
      teacher.profileCompletionStatus,
    ),
    totalStudents: Math.max(0, Math.floor(actualStudentCount)),
    awards: approved ? parseJsonArray(teacher.awards) : [],
    specialties: approved ? parseJsonArray(teacher.specialties) : [],
    languages: approved ? parseJsonArray(teacher.languages) : [],
    certificatePhotos: approved
      ? parseJsonArray(teacher.certificatePhotos)
      : [],
    selfIntroduction: approved ? teacher.selfIntroduction : undefined,
    educationBackground: approved ? teacher.educationBackground : undefined,
    teachingExperience: approved ? teacher.teachingExperience : undefined,
    teachingStyle: approved ? teacher.teachingStyle : undefined,
    yearsOfExperience: approved ? teacher.yearsOfExperience : undefined,
    profilePhoto: approved
      ? teacher.profilePhoto
      : (teacher.user.avatar ?? null),
  };
};

export const mapExtendedProfileResponse = (
  teacherProfile: ExtendedProfileRecord,
): ExtendedProfileResponse => ({
  ...teacherProfile,
  profileCompletionStatus: normalizeTeacherProfileCompletionStatus(
    teacherProfile.profileCompletionStatus,
  ),
  awards: parseJsonArray(teacherProfile.awards),
  specialties: parseJsonArray(teacherProfile.specialties),
  languages: parseJsonArray(teacherProfile.languages),
  certificatePhotos: parseJsonArray(teacherProfile.certificatePhotos),
  hasPendingProfileSubmission: teacherProfile.profileSubmissions.length > 0,
  pendingProfileSubmittedAt: teacherProfile.profileSubmissions[0]?.submittedAt,
});

export const overlayPendingProfileSubmission = (
  teacher: PendingProfileVerificationTeacher,
): PendingProfileVerificationResponse => {
  const draft = normalizeSubmissionDraft(
    teacher.profileSubmissions[0]?.payload,
  );

  const response: PendingProfileVerificationResponse = {
    ...teacher,
    awards: parseJsonArray(teacher.awards),
    specialties: parseJsonArray(teacher.specialties),
    languages: parseJsonArray(teacher.languages),
    certificatePhotos: parseJsonArray(teacher.certificatePhotos),
    selfIntroduction: teacher.selfIntroduction,
    educationBackground: teacher.educationBackground,
    teachingExperience: teacher.teachingExperience,
    teachingStyle: teacher.teachingStyle,
    yearsOfExperience: teacher.yearsOfExperience,
    profilePhoto: teacher.profilePhoto,
  };

  if (draft.selfIntroduction !== undefined) {
    response.selfIntroduction = draft.selfIntroduction;
  }

  if (draft.educationBackground !== undefined) {
    response.educationBackground = draft.educationBackground;
  }

  if (draft.teachingExperience !== undefined) {
    response.teachingExperience = draft.teachingExperience;
  }

  if (draft.awards !== undefined) {
    response.awards = draft.awards;
  }

  if (draft.specialties !== undefined) {
    response.specialties = draft.specialties;
  }

  if (draft.teachingStyle !== undefined) {
    response.teachingStyle = draft.teachingStyle;
  }

  if (draft.languages !== undefined) {
    response.languages = draft.languages;
  }

  if (draft.yearsOfExperience !== undefined) {
    response.yearsOfExperience = draft.yearsOfExperience;
  }

  if (draft.profilePhoto !== undefined) {
    response.profilePhoto = draft.profilePhoto;
  }

  if (draft.certificatePhotos !== undefined) {
    response.certificatePhotos = draft.certificatePhotos;
  }

  return response;
};

export const buildApprovedTeacherProfileUpdateData = (
  teacherProfile: TeacherProfile,
  payload: Prisma.JsonValue | null | undefined,
  reviewNotes?: string,
): Prisma.TeacherProfileUpdateInput => {
  const draft = normalizeSubmissionDraft(payload);

  return {
    selfIntroduction:
      draft.selfIntroduction !== undefined
        ? draft.selfIntroduction
        : teacherProfile.selfIntroduction,
    educationBackground:
      draft.educationBackground !== undefined
        ? draft.educationBackground
        : teacherProfile.educationBackground,
    teachingExperience:
      draft.teachingExperience !== undefined
        ? draft.teachingExperience
        : teacherProfile.teachingExperience,
    awards:
      draft.awards !== undefined
        ? JSON.stringify(draft.awards)
        : teacherProfile.awards,
    specialties:
      draft.specialties !== undefined
        ? JSON.stringify(draft.specialties)
        : teacherProfile.specialties,
    teachingStyle:
      draft.teachingStyle !== undefined
        ? draft.teachingStyle
        : teacherProfile.teachingStyle,
    languages:
      draft.languages !== undefined
        ? JSON.stringify(draft.languages)
        : teacherProfile.languages,
    yearsOfExperience:
      draft.yearsOfExperience !== undefined
        ? draft.yearsOfExperience
        : teacherProfile.yearsOfExperience,
    profilePhoto:
      draft.profilePhoto !== undefined
        ? draft.profilePhoto
        : teacherProfile.profilePhoto,
    certificatePhotos:
      draft.certificatePhotos !== undefined
        ? JSON.stringify(draft.certificatePhotos)
        : teacherProfile.certificatePhotos,
    profileCompletionStatus: PROFILE_STATUS_APPROVED,
    profileReviewedAt: new Date(),
    profileReviewNotes: sanitizeOptionalString(reviewNotes) ?? null,
  };
};

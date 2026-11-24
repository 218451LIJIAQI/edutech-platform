import {
  CourseType,
  LessonType,
  LiveSessionStatus,
  Prisma,
} from "@prisma/client";
import prisma from "../config/database";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "../utils/errors";
import { parseOptionalDate } from "../utils/http";
import { buildProtectedAssetDescriptor } from "../utils/protected-asset";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";
import { ensureUrlOrUploadPathForFolders } from "../utils/url-or-path";
import notificationService from "./notification.service";
import { broadcastLiveSessionStatusChange } from "../socket/live-session.handler";
import { buildPaginationMeta, normalizePagination } from "./shared/pagination";
import { buildCurrentEnrollmentWhere } from "./shared/enrollment-access";
import { isUniqueConstraintError } from "./shared/service-helpers";
import {
  buildCourseListOrderBy,
  buildLessonUpdateData,
  buildPublishedCourseWhere,
  calculateFinalPrice,
  courseListInclude,
  gradeLessonQuiz,
  normalizeLessonQuiz,
  paginateCoursesByPrice,
  toLessonQuizJson,
  type LessonQuiz,
} from "./course/course-helpers";
import {
  attachEnrollmentCountsToCourses,
  attachEnrollmentCountsToTeacherCourses,
  calculateNextLessonOrderIndex,
  courseDetailInclude,
  courseQuizAttemptInclude,
  ensureRequiredCourseIdentifier,
  listCourseLessonIdsInOrder,
  mapCourseDetailResponse,
  mapCourseQuizAttempt,
  moveLessonIdToOrderIndex,
  recalculateCourseEnrollmentsProgress,
  resequenceCourseLessons,
  requireLessonWithCourse,
  requireMaterialWithCourse,
  requireOwnedCourse,
  requirePackageWithCourse,
  requireTeacherProfileByUserId,
  teacherCourseInclude,
} from "./course/course-service-helpers";
import { calculateActualTeacherStudentCount } from "./teacher/teacher-service-helpers";

export const COURSE_FIELD_LIMITS = {
  COURSE_TITLE_MIN: 3,
  COURSE_TITLE_MAX: 200,
  COURSE_DESCRIPTION_MIN: 10,
  COURSE_DESCRIPTION_MAX: 5000,
  COURSE_CATEGORY_MIN: 2,
  COURSE_CATEGORY_MAX: 100,
  LESSON_TITLE_MIN: 2,
  LESSON_TITLE_MAX: 200,
  LESSON_DESCRIPTION_MAX: 3000,
  PACKAGE_NAME_MIN: 2,
  PACKAGE_NAME_MAX: 200,
  PACKAGE_DESCRIPTION_MAX: 2000,
  MATERIAL_TITLE_MIN: 2,
  MATERIAL_TITLE_MAX: 200,
  MATERIAL_DESCRIPTION_MAX: 2000,
  MATERIAL_FILE_TYPE_MAX: 100,
  NOTIFICATION_TITLE_MAX: 150,
  NOTIFICATION_MESSAGE_MAX: 2000,
  LIVE_SESSION_TITLE_MIN: 2,
  LIVE_SESSION_TITLE_MAX: 200,
  LIVE_SESSION_DESCRIPTION_MAX: 2000,
  MAX_PRICE: 99999999.99,
  MAX_DURATION_MINUTES: 60 * 24 * 365,
  MAX_PACKAGE_DURATION_DAYS: 3650,
  MAX_FILE_SIZE_BYTES: 1024 * 1024 * 1024 * 5,
} as const;

const LESSON_ORDER_RETRY_ATTEMPTS = 3;

const withLessonOrderRetry = async <T>(operation: () => Promise<T>) => {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;

      if (
        !isUniqueConstraintError(error) ||
        attempt >= LESSON_ORDER_RETRY_ATTEMPTS
      ) {
        throw error;
      }
    }
  }
};

const collapseInlineWhitespace = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

const normalizeRequiredText = (
  value: string | undefined,
  fieldName: string,
  options: {
    minLength?: number;
    maxLength?: number;
    preserveLineBreaks?: boolean;
  } = {},
): string => {
  const sanitized = sanitizeUserPlainText(value ?? "");
  const normalized = options.preserveLineBreaks
    ? sanitized
    : collapseInlineWhitespace(sanitized);

  if (!normalized) {
    throw new ValidationError(`${fieldName} is required`);
  }

  if (
    options.minLength !== undefined &&
    normalized.length < options.minLength
  ) {
    throw new ValidationError(
      `${fieldName} must be at least ${options.minLength} characters`,
    );
  }

  if (
    options.maxLength !== undefined &&
    normalized.length > options.maxLength
  ) {
    throw new ValidationError(
      `${fieldName} must not exceed ${options.maxLength} characters`,
    );
  }

  return normalized;
};

const normalizeOptionalText = (
  value: string | undefined,
  fieldName: string,
  options: {
    maxLength?: number;
    preserveLineBreaks?: boolean;
  } = {},
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const sanitized = sanitizeUserPlainText(value);
  const normalized = options.preserveLineBreaks
    ? sanitized
    : collapseInlineWhitespace(sanitized);

  if (!normalized) {
    return undefined;
  }

  if (
    options.maxLength !== undefined &&
    normalized.length > options.maxLength
  ) {
    throw new ValidationError(
      `${fieldName} must not exceed ${options.maxLength} characters`,
    );
  }

  return normalized;
};

const normalizeNullableOptionalText = (
  value: string | null | undefined,
  fieldName: string,
  options: {
    maxLength?: number;
    preserveLineBreaks?: boolean;
  } = {},
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return normalizeOptionalText(value, fieldName, options) ?? null;
};

const toFiniteNumber = (value: unknown, fieldName: string): number => {
  const numericValue =
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
      ? (value as { toNumber: () => number }).toNumber()
      : Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }

  return numericValue;
};

const normalizeMoney = (
  value: unknown,
  fieldName: string,
  options: { allowZero?: boolean } = {},
): number => {
  const allowZero = options.allowZero ?? true;
  const numericValue = toFiniteNumber(value, fieldName);

  if (numericValue < 0 || (!allowZero && numericValue === 0)) {
    throw new ValidationError(
      allowZero
        ? `${fieldName} must not be negative`
        : `${fieldName} must be greater than 0`,
    );
  }

  if (numericValue > COURSE_FIELD_LIMITS.MAX_PRICE) {
    throw new ValidationError(`${fieldName} is too large`);
  }

  return Math.round((numericValue + Number.EPSILON) * 100) / 100;
};

const normalizePositiveInteger = (
  value: unknown,
  fieldName: string,
  options: { required?: boolean; max?: number } = {},
): number | undefined => {
  if (value === undefined || value === null) {
    if (options.required) {
      throw new ValidationError(`${fieldName} is required`);
    }

    return undefined;
  }

  const numericValue = toFiniteNumber(value, fieldName);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer`);
  }

  if (options.max !== undefined && numericValue > options.max) {
    throw new ValidationError(`${fieldName} is too large`);
  }

  return numericValue;
};

const normalizeNullablePositiveInteger = (
  value: number | null | undefined,
  fieldName: string,
  options: { max?: number } = {},
): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return normalizePositiveInteger(value, fieldName, options) ?? null;
};

const normalizeNonNegativeInteger = (
  value: unknown,
  fieldName: string,
  options: { required?: boolean; max?: number } = {},
): number | undefined => {
  if (value === undefined || value === null) {
    if (options.required) {
      throw new ValidationError(`${fieldName} is required`);
    }

    return undefined;
  }

  const numericValue = toFiniteNumber(value, fieldName);

  if (!Number.isInteger(numericValue) || numericValue < 0) {
    throw new ValidationError(`${fieldName} must be a non-negative integer`);
  }

  if (options.max !== undefined && numericValue > options.max) {
    throw new ValidationError(`${fieldName} is too large`);
  }

  return numericValue;
};

const normalizeOptionalAssetUrl = (
  value: string | undefined,
  folders: string[],
  errorMessage: string,
): string | undefined => {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  return ensureUrlOrUploadPathForFolders(normalized, folders, errorMessage);
};

const normalizeNullableAssetUrl = (
  value: string | null | undefined,
  folders: string[],
  errorMessage: string,
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return ensureUrlOrUploadPathForFolders(normalized, folders, errorMessage);
};

const normalizeOptionalHttpUrl = (
  value: string | null | undefined,
  fieldName: string,
): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ValidationError(`${fieldName} must be a valid HTTP or HTTPS URL`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ValidationError(`${fieldName} must use http or https protocol`);
  }

  return parsed.toString();
};

const normalizeCourseCreateData = (data: {
  title: string;
  description: string;
  category: string;
  courseType?: CourseType;
  thumbnail?: string;
  previewVideoUrl?: string;
}) => ({
  title: normalizeRequiredText(data.title, "Course title", {
    minLength: COURSE_FIELD_LIMITS.COURSE_TITLE_MIN,
    maxLength: COURSE_FIELD_LIMITS.COURSE_TITLE_MAX,
  }),
  description: normalizeRequiredText(data.description, "Course description", {
    minLength: COURSE_FIELD_LIMITS.COURSE_DESCRIPTION_MIN,
    maxLength: COURSE_FIELD_LIMITS.COURSE_DESCRIPTION_MAX,
    preserveLineBreaks: true,
  }),
  category: normalizeRequiredText(data.category, "Course category", {
    minLength: COURSE_FIELD_LIMITS.COURSE_CATEGORY_MIN,
    maxLength: COURSE_FIELD_LIMITS.COURSE_CATEGORY_MAX,
  }),
  courseType: data.courseType,
  thumbnail: normalizeOptionalAssetUrl(
    data.thumbnail,
    ["thumbnails"],
    "Course thumbnail must be an external URL or use the /uploads/thumbnails/ folder",
  ),
  previewVideoUrl: normalizeOptionalAssetUrl(
    data.previewVideoUrl,
    ["videos"],
    "Preview video URL must be an external URL or use the /uploads/videos/ folder",
  ),
});

const normalizeCourseUpdateData = (data: {
  title?: string;
  description?: string;
  category?: string;
  courseType?: CourseType;
  thumbnail?: string | null;
  previewVideoUrl?: string | null;
  isPublished?: boolean;
}): Prisma.CourseUpdateInput => {
  const updateData: Prisma.CourseUpdateInput = {};

  if (data.title !== undefined) {
    updateData.title = normalizeRequiredText(data.title, "Course title", {
      minLength: COURSE_FIELD_LIMITS.COURSE_TITLE_MIN,
      maxLength: COURSE_FIELD_LIMITS.COURSE_TITLE_MAX,
    });
  }

  if (data.description !== undefined) {
    updateData.description = normalizeRequiredText(
      data.description,
      "Course description",
      {
        minLength: COURSE_FIELD_LIMITS.COURSE_DESCRIPTION_MIN,
        maxLength: COURSE_FIELD_LIMITS.COURSE_DESCRIPTION_MAX,
        preserveLineBreaks: true,
      },
    );
  }

  if (data.category !== undefined) {
    updateData.category = normalizeRequiredText(
      data.category,
      "Course category",
      {
        minLength: COURSE_FIELD_LIMITS.COURSE_CATEGORY_MIN,
        maxLength: COURSE_FIELD_LIMITS.COURSE_CATEGORY_MAX,
      },
    );
  }

  if (data.courseType !== undefined) {
    updateData.courseType = data.courseType;
  }

  if (data.thumbnail !== undefined) {
    updateData.thumbnail = normalizeNullableAssetUrl(
      data.thumbnail,
      ["thumbnails"],
      "Course thumbnail must be an external URL or use the /uploads/thumbnails/ folder",
    );
  }

  if (data.previewVideoUrl !== undefined) {
    updateData.previewVideoUrl = normalizeNullableAssetUrl(
      data.previewVideoUrl,
      ["videos"],
      "Preview video URL must be an external URL or use the /uploads/videos/ folder",
    );
  }

  if (data.isPublished !== undefined) {
    updateData.isPublished = data.isPublished;
  }

  return updateData;
};

const normalizeLessonCreateData = (data: {
  title: string;
  description?: string;
  type: LessonType;
  duration?: number;
  videoUrl?: string;
  quiz?: LessonQuiz | null;
  isFree?: boolean;
}) => ({
  title: normalizeRequiredText(data.title, "Lesson title", {
    minLength: COURSE_FIELD_LIMITS.LESSON_TITLE_MIN,
    maxLength: COURSE_FIELD_LIMITS.LESSON_TITLE_MAX,
  }),
  description: normalizeOptionalText(data.description, "Lesson description", {
    maxLength: COURSE_FIELD_LIMITS.LESSON_DESCRIPTION_MAX,
    preserveLineBreaks: true,
  }),
  type: data.type,
  duration: normalizePositiveInteger(data.duration, "Lesson duration", {
    max: COURSE_FIELD_LIMITS.MAX_DURATION_MINUTES,
  }),
  videoUrl: normalizeOptionalAssetUrl(
    data.videoUrl,
    ["videos"],
    "Lesson video URL must be an external URL or use the /uploads/videos/ folder",
  ),
  quiz: data.quiz,
  isFree: data.isFree,
});

const normalizePackageCreateData = (data: {
  name: string;
  description?: string;
  price: number;
  discount?: number;
  duration?: number;
  maxStudents?: number;
  features?: Prisma.InputJsonValue;
}) => {
  const price = normalizeMoney(data.price, "Package price");
  const discount = normalizeMoney(data.discount ?? 0, "Package discount");

  if (discount > price) {
    throw new ValidationError("Package discount must not exceed package price");
  }

  return {
    name: normalizeRequiredText(data.name, "Package name", {
      minLength: COURSE_FIELD_LIMITS.PACKAGE_NAME_MIN,
      maxLength: COURSE_FIELD_LIMITS.PACKAGE_NAME_MAX,
    }),
    description: normalizeOptionalText(
      data.description,
      "Package description",
      {
        maxLength: COURSE_FIELD_LIMITS.PACKAGE_DESCRIPTION_MAX,
        preserveLineBreaks: true,
      },
    ),
    price,
    discount,
    finalPrice: calculateFinalPrice(price, discount),
    duration: normalizePositiveInteger(data.duration, "Package duration", {
      max: COURSE_FIELD_LIMITS.MAX_PACKAGE_DURATION_DAYS,
    }),
    maxStudents: normalizePositiveInteger(data.maxStudents, "Maximum students"),
    features: data.features,
  };
};

const normalizePackageUpdateData = (
  currentPackage: {
    price: unknown;
    discount: unknown | null;
    finalPrice: unknown;
  },
  data: {
    name?: string;
    description?: string | null;
    price?: number;
    discount?: number | null;
    duration?: number | null;
    maxStudents?: number | null;
    features?: Prisma.InputJsonValue;
    isActive?: boolean;
  },
): Prisma.LessonPackageUpdateInput => {
  const updateData: Prisma.LessonPackageUpdateInput = {};

  if (data.name !== undefined) {
    updateData.name = normalizeRequiredText(data.name, "Package name", {
      minLength: COURSE_FIELD_LIMITS.PACKAGE_NAME_MIN,
      maxLength: COURSE_FIELD_LIMITS.PACKAGE_NAME_MAX,
    });
  }

  if (data.description !== undefined) {
    updateData.description = normalizeNullableOptionalText(
      data.description,
      "Package description",
      {
        maxLength: COURSE_FIELD_LIMITS.PACKAGE_DESCRIPTION_MAX,
        preserveLineBreaks: true,
      },
    );
  }

  const shouldRecalculatePrice =
    data.price !== undefined || data.discount !== undefined;
  if (shouldRecalculatePrice) {
    const price =
      data.price !== undefined
        ? normalizeMoney(data.price, "Package price")
        : normalizeMoney(currentPackage.price, "Package price");

    const discount =
      data.discount !== undefined
        ? normalizeMoney(data.discount ?? 0, "Package discount")
        : normalizeMoney(currentPackage.discount ?? 0, "Package discount");

    if (discount > price) {
      throw new ValidationError(
        "Package discount must not exceed package price",
      );
    }

    updateData.price = price;
    updateData.discount = discount;
    updateData.finalPrice = calculateFinalPrice(price, discount);
  }

  if (data.duration !== undefined) {
    updateData.duration = normalizeNullablePositiveInteger(
      data.duration,
      "Package duration",
      { max: COURSE_FIELD_LIMITS.MAX_PACKAGE_DURATION_DAYS },
    );
  }

  if (data.maxStudents !== undefined) {
    updateData.maxStudents = normalizeNullablePositiveInteger(
      data.maxStudents,
      "Maximum students",
    );
  }

  if (data.features !== undefined) {
    updateData.features = data.features;
  }

  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  if (!shouldRecalculatePrice && updateData.finalPrice === undefined) {
    updateData.finalPrice = currentPackage.finalPrice as
      | Prisma.Decimal
      | number;
  }

  return updateData;
};

const normalizeMaterialCreateData = (data: {
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  isDownloadable?: boolean;
}) => ({
  title: normalizeRequiredText(data.title, "Material title", {
    minLength: COURSE_FIELD_LIMITS.MATERIAL_TITLE_MIN,
    maxLength: COURSE_FIELD_LIMITS.MATERIAL_TITLE_MAX,
  }),
  description: normalizeOptionalText(data.description, "Material description", {
    maxLength: COURSE_FIELD_LIMITS.MATERIAL_DESCRIPTION_MAX,
    preserveLineBreaks: true,
  }),
  fileUrl: ensureUrlOrUploadPathForFolders(
    data.fileUrl,
    ["documents"],
    "Material file URL must be an external URL or use the /uploads/documents/ folder",
  ),
  fileType: normalizeRequiredText(data.fileType, "Material file type", {
    minLength: 1,
    maxLength: COURSE_FIELD_LIMITS.MATERIAL_FILE_TYPE_MAX,
  }),
  fileSize: normalizeNonNegativeInteger(data.fileSize, "Material file size", {
    required: true,
    max: COURSE_FIELD_LIMITS.MAX_FILE_SIZE_BYTES,
  }) as number,
  isDownloadable: data.isDownloadable,
});

const normalizeMaterialUpdateData = (data: {
  title?: string;
  description?: string | null;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  isDownloadable?: boolean;
}): Prisma.MaterialUpdateInput => {
  const updateData: Prisma.MaterialUpdateInput = {};

  if (data.title !== undefined) {
    updateData.title = normalizeRequiredText(data.title, "Material title", {
      minLength: COURSE_FIELD_LIMITS.MATERIAL_TITLE_MIN,
      maxLength: COURSE_FIELD_LIMITS.MATERIAL_TITLE_MAX,
    });
  }

  if (data.description !== undefined) {
    updateData.description = normalizeNullableOptionalText(
      data.description,
      "Material description",
      {
        maxLength: COURSE_FIELD_LIMITS.MATERIAL_DESCRIPTION_MAX,
        preserveLineBreaks: true,
      },
    );
  }

  if (data.fileUrl !== undefined) {
    updateData.fileUrl = ensureUrlOrUploadPathForFolders(
      data.fileUrl,
      ["documents"],
      "Material file URL must be an external URL or use the /uploads/documents/ folder",
    );
  }

  if (data.fileType !== undefined) {
    updateData.fileType = normalizeRequiredText(
      data.fileType,
      "Material file type",
      {
        minLength: 1,
        maxLength: COURSE_FIELD_LIMITS.MATERIAL_FILE_TYPE_MAX,
      },
    );
  }

  if (data.fileSize !== undefined) {
    updateData.fileSize = normalizeNonNegativeInteger(
      data.fileSize,
      "Material file size",
      {
        required: true,
        max: COURSE_FIELD_LIMITS.MAX_FILE_SIZE_BYTES,
      },
    );
  }

  if (data.isDownloadable !== undefined) {
    updateData.isDownloadable = data.isDownloadable;
  }

  return updateData;
};

const ensureValidQuizAnswers = (answers: number[]) => {
  if (!Array.isArray(answers)) {
    throw new ValidationError("Quiz answers must be provided as an array");
  }

  if (answers.length === 0) {
    throw new ValidationError("Quiz answers are required");
  }

  for (const answer of answers) {
    if (!Number.isInteger(answer) || answer < 0) {
      throw new ValidationError(
        "Quiz answers must contain valid non-negative option indexes",
      );
    }
  }
};

export const ensureCourseCanBeSafelyDeleted = async (courseId: string) => {
  const [enrollmentCount, paymentCount, orderItemCount] = await Promise.all([
    prisma.enrollment.count({
      where: { package: { courseId } },
    }),
    prisma.payment.count({
      where: { package: { courseId } },
    }),
    prisma.orderItem.count({
      where: { package: { courseId } },
    }),
  ]);

  if (enrollmentCount > 0 || paymentCount > 0 || orderItemCount > 0) {
    throw new ValidationError(
      "Cannot delete a course that already has enrollments, payments, or order records. Unpublish it instead.",
    );
  }
};

const ensurePackageCanBeSafelyDeleted = async (packageId: string) => {
  const [enrollmentCount, paymentCount, orderItemCount] = await Promise.all([
    prisma.enrollment.count({ where: { packageId } }),
    prisma.payment.count({ where: { packageId } }),
    prisma.orderItem.count({ where: { packageId } }),
  ]);

  if (enrollmentCount > 0 || paymentCount > 0 || orderItemCount > 0) {
    throw new ValidationError(
      "Cannot delete a package that already has enrollments, payments, or order records. Deactivate it instead.",
    );
  }
};

/**
 * Course Service
 * Handles course, lesson, quiz, package, material, live session, course notification, and protected download management.
 */
class CourseService {
  async getAllCourses(filters: {
    category?: string;
    teacherId?: string;
    search?: string;
    courseType?: CourseType;
    minRating?: number;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: "NEWEST" | "RATING" | "POPULARITY" | "PRICE_ASC" | "PRICE_DESC";
    sortOrder?: "asc" | "desc";
    page?: number;
    limit?: number;
  }) {
    const {
      category,
      teacherId,
      search,
      courseType,
      minRating,
      minPrice,
      maxPrice,
      sortBy = "NEWEST",
      sortOrder = "desc",
    } = filters;

    const pagination = normalizePagination(filters.page, filters.limit, {
      defaultLimit: 12,
    });

    const where = buildPublishedCourseWhere({
      category: category?.trim(),
      teacherId: teacherId?.trim(),
      search: search?.trim(),
      courseType,
      minRating,
      minPrice,
      maxPrice,
    });
    const orderBy = buildCourseListOrderBy(sortBy, sortOrder);

    if (sortBy === "PRICE_ASC" || sortBy === "PRICE_DESC") {
      const [allMatchingCourses, total] = await Promise.all([
        prisma.course.findMany({
          where,
          include: courseListInclude,
        }),
        prisma.course.count({ where }),
      ]);

      const paginatedCourses = paginateCoursesByPrice(
        allMatchingCourses,
        pagination,
        sortBy,
      );
      const coursesWithCounts =
        await attachEnrollmentCountsToCourses(paginatedCourses);

      return {
        courses: coursesWithCounts,
        pagination: buildPaginationMeta(
          total,
          pagination.page,
          pagination.limit,
        ),
      };
    }

    const [rawCourses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        include: courseListInclude,
        orderBy: orderBy || { createdAt: "desc" },
      }),
      prisma.course.count({ where }),
    ]);

    const coursesWithCounts = await attachEnrollmentCountsToCourses(rawCourses);

    return {
      courses: coursesWithCounts,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async getCourseById(courseId: string, userId?: string) {
    const normalizedCourseId = ensureRequiredCourseIdentifier(
      courseId,
      "Course ID",
    );
    const course = await prisma.course.findUnique({
      where: { id: normalizedCourseId },
      include: courseDetailInclude,
    });

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    let requester: {
      role: "STUDENT" | "TEACHER" | "ADMIN";
      teacherProfile: { id: string } | null;
    } | null = null;

    if (userId) {
      requester = await prisma.user.findUnique({
        where: { id: userId.trim() },
        select: {
          role: true,
          teacherProfile: {
            select: { id: true },
          },
        },
      });
    }

    let isEnrolled = false;
    if (userId) {
      const enrollment = await prisma.enrollment.findFirst({
        where: buildCurrentEnrollmentWhere(
          {
            userId: userId.trim(),
            package: { courseId: course.id },
          },
          new Date(),
        ),
        select: { id: true },
      });
      isEnrolled = !!enrollment;
    }

    const isCourseOwnerOrAdmin =
      requester?.role === "ADMIN" ||
      requester?.teacherProfile?.id === course.teacherProfileId;
    const isPubliclyAccessible =
      course.isPublished &&
      course.teacherProfile.registrationStatus === "APPROVED" &&
      course.teacherProfile.user.isActive;

    if (!isPubliclyAccessible && !isCourseOwnerOrAdmin && !isEnrolled) {
      throw new NotFoundError("Course not found");
    }

    const [actualTeacherStudentCount, coursesWithCount] = await Promise.all([
      calculateActualTeacherStudentCount(course.teacherProfileId),
      attachEnrollmentCountsToCourses([course]),
    ]);
    const courseWithCount = coursesWithCount[0];
    const mappedCourse = mapCourseDetailResponse(course, {
      isEnrolled,
      canViewQuizAnswers: isCourseOwnerOrAdmin,
      canManageMaterials: isCourseOwnerOrAdmin,
    });

    const { isActive: _teacherUserActive, ...publicTeacherUser } =
      mappedCourse.teacherProfile.user;

    return {
      ...mappedCourse,
      _count: courseWithCount._count,
      teacherProfile: {
        ...mappedCourse.teacherProfile,
        user: publicTeacherUser,
        totalStudents: actualTeacherStudentCount,
      },
    };
  }

  async createCourse(
    userId: string,
    data: {
      title: string;
      description: string;
      category: string;
      courseType?: CourseType;
      thumbnail?: string;
      previewVideoUrl?: string;
    },
  ) {
    const teacherProfile = await requireTeacherProfileByUserId(userId);
    const normalizedData = normalizeCourseCreateData(data);

    return prisma.course.create({
      data: {
        teacherProfileId: teacherProfile.id,
        ...normalizedData,
      },
      include: {
        teacherProfile: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  async updateCourse(
    userId: string,
    courseId: string,
    data: {
      title?: string;
      description?: string;
      category?: string;
      courseType?: CourseType;
      thumbnail?: string | null;
      previewVideoUrl?: string | null;
      isPublished?: boolean;
    },
  ) {
    const ownedCourse = await requireOwnedCourse(userId, courseId);
    const updateData = normalizeCourseUpdateData(data);

    return prisma.course.update({
      where: { id: ownedCourse.id },
      data: updateData,
    });
  }

  async deleteCourse(userId: string, courseId: string) {
    const ownedCourse = await requireOwnedCourse(userId, courseId);
    await ensureCourseCanBeSafelyDeleted(ownedCourse.id);

    await prisma.course.delete({
      where: { id: ownedCourse.id },
    });

    return { message: "Course deleted successfully" };
  }

  async createLesson(
    userId: string,
    courseId: string,
    data: {
      title: string;
      description?: string;
      type: LessonType;
      duration?: number;
      videoUrl?: string;
      quiz?: LessonQuiz | null;
      isFree?: boolean;
    },
  ) {
    const ownedCourse = await requireOwnedCourse(userId, courseId);
    const normalizedData = normalizeLessonCreateData(data);

    return withLessonOrderRetry(() =>
      prisma.$transaction(async (tx) => {
        const orderedLessonIds = await listCourseLessonIdsInOrder(
          ownedCourse.id,
          tx,
        );
        const provisionalOrderIndex = await calculateNextLessonOrderIndex(
          ownedCourse.id,
          tx,
        );

        const createdLesson = await tx.lesson.create({
          data: {
            courseId: ownedCourse.id,
            orderIndex: provisionalOrderIndex,
            title: normalizedData.title,
            description: normalizedData.description,
            type: normalizedData.type,
            duration: normalizedData.duration,
            videoUrl: normalizedData.videoUrl,
            quiz: toLessonQuizJson(normalizedData.quiz),
            isFree: normalizedData.isFree,
          },
        });

        const nextOrderedIds = [...orderedLessonIds, createdLesson.id];
        await resequenceCourseLessons(tx, ownedCourse.id, nextOrderedIds);
        await recalculateCourseEnrollmentsProgress(
          tx,
          ownedCourse.id,
          nextOrderedIds.length,
        );

        const refreshedLesson = await tx.lesson.findUnique({
          where: { id: createdLesson.id },
        });

        if (!refreshedLesson) {
          throw new NotFoundError("Lesson not found after creation");
        }

        return refreshedLesson;
      }),
    );
  }

  async updateLesson(
    userId: string,
    lessonId: string,
    data: {
      title?: string;
      description?: string | null;
      type?: LessonType;
      duration?: number | null;
      videoUrl?: string | null;
      quiz?: LessonQuiz | null;
      isFree?: boolean;
      orderIndex?: number;
    },
  ) {
    const lesson = await requireLessonWithCourse(lessonId);
    await requireOwnedCourse(userId, lesson.courseId);

    const normalizedLessonId = lesson.id;
    const requestedOrderIndex =
      data.orderIndex === undefined
        ? undefined
        : normalizePositiveInteger(data.orderIndex, "Lesson order index", {
            required: true,
          });

    const lessonUpdateData = buildLessonUpdateData({
      title:
        data.title === undefined
          ? undefined
          : normalizeRequiredText(data.title, "Lesson title", {
              minLength: COURSE_FIELD_LIMITS.LESSON_TITLE_MIN,
              maxLength: COURSE_FIELD_LIMITS.LESSON_TITLE_MAX,
            }),
      description: normalizeNullableOptionalText(
        data.description,
        "Lesson description",
        {
          maxLength: COURSE_FIELD_LIMITS.LESSON_DESCRIPTION_MAX,
          preserveLineBreaks: true,
        },
      ),
      type: data.type,
      duration: normalizeNullablePositiveInteger(
        data.duration,
        "Lesson duration",
        { max: COURSE_FIELD_LIMITS.MAX_DURATION_MINUTES },
      ),
      videoUrl: normalizeNullableAssetUrl(
        data.videoUrl,
        ["videos"],
        "Lesson video URL must be an external URL or use the /uploads/videos/ folder",
      ),
      quiz: data.quiz,
      isFree: data.isFree,
    });

    if (
      requestedOrderIndex === undefined ||
      requestedOrderIndex === lesson.orderIndex
    ) {
      return prisma.lesson.update({
        where: { id: normalizedLessonId },
        data: lessonUpdateData,
      });
    }

    return withLessonOrderRetry(() =>
      prisma.$transaction(async (tx) => {
        const orderedLessonIds = await listCourseLessonIdsInOrder(
          lesson.courseId,
          tx,
        );
        const reorderedLessonIds = moveLessonIdToOrderIndex(
          orderedLessonIds,
          normalizedLessonId,
          requestedOrderIndex,
        );

        await resequenceCourseLessons(
          tx,
          lesson.courseId,
          reorderedLessonIds,
          normalizedLessonId,
          lessonUpdateData,
        );

        const refreshedLesson = await tx.lesson.findUnique({
          where: { id: normalizedLessonId },
        });

        if (!refreshedLesson) {
          throw new NotFoundError("Lesson not found after update");
        }

        return refreshedLesson;
      }),
    );
  }

  async deleteLesson(userId: string, lessonId: string) {
    const lesson = await requireLessonWithCourse(lessonId);
    await requireOwnedCourse(userId, lesson.courseId);

    await withLessonOrderRetry(() =>
      prisma.$transaction(async (tx) => {
        await tx.lesson.delete({
          where: { id: lesson.id },
        });

        const remainingLessonIds = await listCourseLessonIdsInOrder(
          lesson.courseId,
          tx,
        );
        await resequenceCourseLessons(tx, lesson.courseId, remainingLessonIds);
        await recalculateCourseEnrollmentsProgress(
          tx,
          lesson.courseId,
          remainingLessonIds.length,
        );
      }),
    );

    return { message: "Lesson deleted successfully" };
  }

  async submitLessonQuiz(userId: string, lessonId: string, answers: number[]) {
    const normalizedUserId = ensureRequiredCourseIdentifier(userId, "User ID");
    const normalizedLessonId = ensureRequiredCourseIdentifier(
      lessonId,
      "Lesson ID",
    );
    ensureValidQuizAnswers(answers);

    const lesson = await prisma.lesson.findUnique({
      where: { id: normalizedLessonId },
      select: {
        id: true,
        title: true,
        isFree: true,
        quiz: true,
        course: {
          select: {
            id: true,
            isPublished: true,
            teacherProfile: {
              select: {
                registrationStatus: true,
                user: { select: { isActive: true } },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundError("Lesson not found");
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: buildCurrentEnrollmentWhere(
        {
          userId: normalizedUserId,
          package: { courseId: lesson.course.id },
        },
        new Date(),
      ),
      select: { id: true },
    });

    const canAccessFreePublishedLesson =
      lesson.isFree &&
      lesson.course.isPublished &&
      lesson.course.teacherProfile.registrationStatus === "APPROVED" &&
      lesson.course.teacherProfile.user.isActive;

    if (!enrollment && !canAccessFreePublishedLesson) {
      throw new AuthorizationError(
        "You must be enrolled in this course to take the quiz",
      );
    }

    const quiz = normalizeLessonQuiz(lesson.quiz);
    if (!quiz) {
      throw new ValidationError("This lesson does not have a quiz yet");
    }

    const {
      results,
      correctAnswers,
      totalQuestions,
      scorePercentage,
      passPercentage,
      passed,
    } = gradeLessonQuiz(quiz, answers);

    await prisma.quizAttempt.create({
      data: {
        lessonId: lesson.id,
        studentId: normalizedUserId,
        answers,
        results,
        scorePercentage,
        correctAnswers,
        totalQuestions,
        passed,
      },
    });

    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      totalQuestions,
      correctAnswers,
      scorePercentage,
      passPercentage,
      passed,
      results,
    };
  }

  async getCourseQuizAttempts(userId: string, courseId: string) {
    const ownedCourse = await requireOwnedCourse(userId, courseId);

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        lesson: { courseId: ownedCourse.id },
      },
      include: courseQuizAttemptInclude,
      orderBy: [{ submittedAt: "desc" }],
    });

    return attempts.map(mapCourseQuizAttempt);
  }

  async getMyCourseQuizAttempts(userId: string, courseId: string) {
    const normalizedUserId = ensureRequiredCourseIdentifier(userId, "User ID");
    const normalizedCourseId = ensureRequiredCourseIdentifier(
      courseId,
      "Course ID",
    );

    const [course, activeEnrollment] = await Promise.all([
      prisma.course.findUnique({
        where: { id: normalizedCourseId },
        select: {
          id: true,
          isPublished: true,
          teacherProfile: {
            select: {
              registrationStatus: true,
              user: { select: { isActive: true } },
            },
          },
        },
      }),
      prisma.enrollment.findFirst({
        where: buildCurrentEnrollmentWhere(
          {
            userId: normalizedUserId,
            package: { courseId: normalizedCourseId },
          },
          new Date(),
        ),
        select: { id: true },
      }),
    ]);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    const isCoursePublic =
      course.isPublished &&
      course.teacherProfile.registrationStatus === "APPROVED" &&
      course.teacherProfile.user.isActive;

    if (!activeEnrollment && !isCoursePublic) {
      throw new AuthorizationError(
        "You do not have active access to this course",
      );
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        studentId: normalizedUserId,
        lesson: activeEnrollment
          ? { courseId: normalizedCourseId }
          : { courseId: normalizedCourseId, isFree: true },
      },
      include: courseQuizAttemptInclude,
      orderBy: [{ submittedAt: "desc" }],
    });

    return attempts.map(mapCourseQuizAttempt);
  }

  async getCourseLiveSessions(userId: string, courseId: string) {
    const normalizedUserId = ensureRequiredCourseIdentifier(userId, "User ID");
    const normalizedCourseId = ensureRequiredCourseIdentifier(
      courseId,
      "Course ID",
    );

    const [course, requester, activeEnrollment] = await Promise.all([
      prisma.course.findUnique({
        where: { id: normalizedCourseId },
        select: {
          id: true,
          isPublished: true,
          teacherProfileId: true,
          teacherProfile: {
            select: {
              registrationStatus: true,
              user: { select: { isActive: true } },
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: normalizedUserId },
        select: {
          role: true,
          teacherProfile: { select: { id: true } },
        },
      }),
      prisma.enrollment.findFirst({
        where: buildCurrentEnrollmentWhere(
          {
            userId: normalizedUserId,
            package: { courseId: normalizedCourseId },
          },
          new Date(),
        ),
        select: { id: true },
      }),
    ]);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    const isOwnerOrAdmin =
      requester?.role === "ADMIN" ||
      requester?.teacherProfile?.id === course.teacherProfileId;
    const isEnrolled = Boolean(activeEnrollment);

    const isCoursePublic =
      course.isPublished &&
      course.teacherProfile.registrationStatus === "APPROVED" &&
      course.teacherProfile.user.isActive;

    if (!isOwnerOrAdmin && !isEnrolled && !isCoursePublic) {
      throw new NotFoundError("Course not found");
    }

    const sessions = await prisma.liveSession.findMany({
      where: {
        lesson: {
          courseId: course.id,
          ...(isOwnerOrAdmin || isEnrolled ? {} : { isFree: true }),
        },
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            orderIndex: true,
            type: true,
            isFree: true,
          },
        },
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    });

    return sessions.map((session) => ({
      id: session.id,
      lessonId: session.lessonId,
      lessonTitle: session.lesson.title,
      lessonOrderIndex: session.lesson.orderIndex,
      title: session.title,
      description: session.description,
      scheduledAt: session.scheduledAt,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      duration: session.duration,
      maxParticipants: session.maxParticipants,
      status: session.status,
      meetingUrl:
        isOwnerOrAdmin || session.status === LiveSessionStatus.ONGOING
          ? session.meetingUrl
          : null,
      recordingUrl:
        isOwnerOrAdmin || isEnrolled || session.lesson.isFree
          ? session.recordingUrl
          : null,
      createdAt: session.createdAt,
    }));
  }

  async createLiveSession(
    userId: string,
    lessonId: string,
    data: {
      title: string;
      description?: string;
      scheduledAt: string;
      duration?: number;
      meetingUrl?: string;
      maxParticipants?: number;
    },
  ) {
    const lesson = await requireLessonWithCourse(lessonId);
    await requireOwnedCourse(userId, lesson.courseId);

    if (lesson.type !== LessonType.LIVE && lesson.type !== LessonType.HYBRID) {
      throw new ValidationError(
        "Live sessions can only be scheduled on LIVE or HYBRID lessons",
      );
    }

    const scheduledDate = parseOptionalDate(data.scheduledAt, "scheduledAt");
    if (!scheduledDate) {
      throw new ValidationError("scheduledAt is required");
    }

    return prisma.liveSession.create({
      data: {
        lessonId: lesson.id,
        title: normalizeRequiredText(data.title, "Session title", {
          minLength: COURSE_FIELD_LIMITS.LIVE_SESSION_TITLE_MIN,
          maxLength: COURSE_FIELD_LIMITS.LIVE_SESSION_TITLE_MAX,
        }),
        description:
          normalizeOptionalText(data.description, "Session description", {
            maxLength: COURSE_FIELD_LIMITS.LIVE_SESSION_DESCRIPTION_MAX,
            preserveLineBreaks: true,
          }) ?? null,
        scheduledAt: scheduledDate,
        duration:
          normalizePositiveInteger(data.duration, "Session duration", {
            max: COURSE_FIELD_LIMITS.MAX_DURATION_MINUTES,
          }) ?? null,
        meetingUrl: normalizeOptionalHttpUrl(data.meetingUrl, "Meeting URL"),
        maxParticipants:
          normalizePositiveInteger(
            data.maxParticipants,
            "Maximum participants",
            { max: 10000 },
          ) ?? null,
        status: LiveSessionStatus.SCHEDULED,
      },
    });
  }

  async updateLiveSessionStatus(
    userId: string,
    sessionId: string,
    status: LiveSessionStatus,
    recordingUrl?: string | null,
  ) {
    const normalizedSessionId = ensureRequiredCourseIdentifier(
      sessionId,
      "Session ID",
    );
    const normalizedRecordingUrl = normalizeNullableAssetUrl(
      recordingUrl,
      ["videos"],
      "Recording URL must be an external URL or use the /uploads/videos/ folder",
    );

    if (
      normalizedRecordingUrl !== undefined &&
      status !== LiveSessionStatus.COMPLETED
    ) {
      throw new ValidationError(
        "Recording URL can only be attached when a live session is completed",
      );
    }

    const existingSession = await prisma.liveSession.findUnique({
      where: { id: normalizedSessionId },
      include: {
        lesson: {
          select: { courseId: true },
        },
      },
    });

    if (!existingSession) {
      throw new NotFoundError("Live session not found");
    }

    await requireOwnedCourse(userId, existingSession.lesson.courseId);

    if (
      status === LiveSessionStatus.COMPLETED &&
      existingSession.status === LiveSessionStatus.COMPLETED &&
      normalizedRecordingUrl !== undefined
    ) {
      return prisma.liveSession.update({
        where: { id: normalizedSessionId },
        data: { recordingUrl: normalizedRecordingUrl },
      });
    }

    const now = new Date();
    let expectedCurrentStatus: LiveSessionStatus;
    let extraUpdate: Prisma.LiveSessionUpdateManyMutationInput = {};

    if (status === LiveSessionStatus.ONGOING) {
      expectedCurrentStatus = LiveSessionStatus.SCHEDULED;
      extraUpdate = { startedAt: now };
    } else if (status === LiveSessionStatus.COMPLETED) {
      expectedCurrentStatus = LiveSessionStatus.ONGOING;
      extraUpdate = {
        endedAt: now,
        ...(normalizedRecordingUrl !== undefined
          ? { recordingUrl: normalizedRecordingUrl }
          : {}),
      };
    } else if (status === LiveSessionStatus.CANCELLED) {
      expectedCurrentStatus = LiveSessionStatus.SCHEDULED;
    } else {
      throw new ValidationError("Unsupported live session status transition");
    }

    if (existingSession.status !== expectedCurrentStatus) {
      throw new ValidationError(
        `Cannot transition live session from ${existingSession.status} to ${status}`,
      );
    }

    const updated = await prisma.liveSession.updateMany({
      where: {
        id: normalizedSessionId,
        status: expectedCurrentStatus,
      },
      data: {
        status,
        ...extraUpdate,
      },
    });

    if (updated.count !== 1) {
      throw new ValidationError(
        "Live session status changed concurrently. Please refresh.",
      );
    }

    const updatedSession = await prisma.liveSession.findUniqueOrThrow({
      where: { id: normalizedSessionId },
    });

    broadcastLiveSessionStatusChange(updatedSession, userId.trim());

    return updatedSession;
  }

  async createPackage(
    userId: string,
    courseId: string,
    data: {
      name: string;
      description?: string;
      price: number;
      discount?: number;
      duration?: number;
      maxStudents?: number;
      features?: Prisma.InputJsonValue;
    },
  ) {
    const ownedCourse = await requireOwnedCourse(userId, courseId);
    const normalizedData = normalizePackageCreateData(data);

    return prisma.lessonPackage.create({
      data: {
        courseId: ownedCourse.id,
        ...normalizedData,
      },
    });
  }

  async updatePackage(
    userId: string,
    packageId: string,
    data: {
      name?: string;
      description?: string | null;
      price?: number;
      discount?: number | null;
      duration?: number | null;
      maxStudents?: number | null;
      features?: Prisma.InputJsonValue;
      isActive?: boolean;
    },
  ) {
    const lessonPackage = await requirePackageWithCourse(packageId);
    await requireOwnedCourse(userId, lessonPackage.courseId);

    const updateData = normalizePackageUpdateData(lessonPackage, data);

    return prisma.lessonPackage.update({
      where: { id: lessonPackage.id },
      data: updateData,
    });
  }

  async deletePackage(userId: string, packageId: string) {
    const lessonPackage = await requirePackageWithCourse(packageId);
    await requireOwnedCourse(userId, lessonPackage.courseId);
    await ensurePackageCanBeSafelyDeleted(lessonPackage.id);

    await prisma.lessonPackage.delete({
      where: { id: lessonPackage.id },
    });

    return { message: "Package deleted successfully" };
  }

  async uploadMaterial(
    userId: string,
    courseId: string,
    data: {
      title: string;
      description?: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
      isDownloadable?: boolean;
    },
  ) {
    const ownedCourse = await requireOwnedCourse(userId, courseId);
    const normalizedData = normalizeMaterialCreateData(data);

    return prisma.material.create({
      data: {
        courseId: ownedCourse.id,
        ...normalizedData,
      },
    });
  }

  async updateMaterial(
    userId: string,
    materialId: string,
    data: {
      title?: string;
      description?: string | null;
      fileUrl?: string;
      fileType?: string;
      fileSize?: number;
      isDownloadable?: boolean;
    },
  ) {
    const material = await requireMaterialWithCourse(materialId);
    await requireOwnedCourse(userId, material.courseId);
    const updateData = normalizeMaterialUpdateData(data);

    return prisma.material.update({
      where: { id: material.id },
      data: updateData,
    });
  }

  async deleteMaterial(userId: string, materialId: string) {
    const material = await requireMaterialWithCourse(materialId);
    await requireOwnedCourse(userId, material.courseId);

    await prisma.material.delete({
      where: { id: material.id },
    });

    return { message: "Material deleted successfully" };
  }

  async getMaterialDownloadAsset(userId: string, materialId: string) {
    const normalizedUserId = ensureRequiredCourseIdentifier(userId, "User ID");
    const normalizedMaterialId = ensureRequiredCourseIdentifier(
      materialId,
      "Material ID",
    );

    const material = await prisma.material.findUnique({
      where: { id: normalizedMaterialId },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        isDownloadable: true,
        course: {
          select: {
            id: true,
            teacherProfileId: true,
          },
        },
      },
    });

    if (!material) {
      throw new NotFoundError("Material not found");
    }

    const requester = await prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: {
        role: true,
        teacherProfile: {
          select: { id: true },
        },
      },
    });

    if (!requester) {
      throw new NotFoundError("User not found");
    }

    const isCourseOwnerOrAdmin =
      requester.role === "ADMIN" ||
      requester.teacherProfile?.id === material.course.teacherProfileId;

    if (!isCourseOwnerOrAdmin) {
      if (!material.isDownloadable) {
        throw new AuthorizationError(
          "This material is not available for download",
        );
      }

      const enrollment = await prisma.enrollment.findFirst({
        where: buildCurrentEnrollmentWhere(
          {
            userId: normalizedUserId,
            package: { courseId: material.course.id },
          },
          new Date(),
        ),
        select: { id: true },
      });

      if (!enrollment) {
        throw new AuthorizationError(
          "You must be enrolled in this course to download this material",
        );
      }
    }

    return buildProtectedAssetDescriptor(material.fileUrl, {
      allowedFolders: ["documents"],
      fallbackFileName: material.title,
    });
  }

  async getTeacherCourses(userId: string) {
    const teacherProfile = await requireTeacherProfileByUserId(userId);

    const courses = await prisma.course.findMany({
      where: { teacherProfileId: teacherProfile.id },
      include: teacherCourseInclude,
      orderBy: { createdAt: "desc" },
    });

    return attachEnrollmentCountsToTeacherCourses(courses);
  }

  async getCategories() {
    const courses = await prisma.course.findMany({
      where: buildPublishedCourseWhere(),
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    return courses.map((course) => course.category);
  }

  async sendCourseNotification(
    teacherUserId: string,
    courseId: string,
    data: {
      title: string;
      message: string;
      type?: string;
    },
  ) {
    const normalizedTitle = normalizeRequiredText(
      data.title,
      "Notification title",
      { maxLength: COURSE_FIELD_LIMITS.NOTIFICATION_TITLE_MAX },
    );
    const normalizedMessage = normalizeRequiredText(
      data.message,
      "Notification message",
      {
        maxLength: COURSE_FIELD_LIMITS.NOTIFICATION_MESSAGE_MAX,
        preserveLineBreaks: true,
      },
    );
    const notificationType =
      normalizeOptionalText(data.type, "Notification type", {
        maxLength: 80,
      }) || "COURSE_ANNOUNCEMENT";

    const course = await prisma.course.findUnique({
      where: { id: ensureRequiredCourseIdentifier(courseId, "Course ID") },
      select: {
        id: true,
        teacherProfile: {
          select: { userId: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    if (course.teacherProfile.userId !== teacherUserId) {
      throw new AuthorizationError(
        "You can only notify students of your own course",
      );
    }

    const enrollments = await prisma.enrollment.findMany({
      where: buildCurrentEnrollmentWhere({
        package: { courseId: course.id },
      }),
      select: { userId: true },
    });

    const userIds = Array.from(
      new Set(enrollments.map((enrollment) => enrollment.userId)),
    );

    if (userIds.length > 0) {
      await notificationService.createBulkNotifications(
        userIds,
        normalizedTitle,
        normalizedMessage,
        notificationType,
      );
    }

    return { recipients: userIds.length };
  }
}

export default new CourseService();

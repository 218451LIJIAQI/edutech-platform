import { LessonType, CourseType, Prisma } from "@prisma/client";
import prisma from "../config/database";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "../utils/errors";
import { buildProtectedAssetDescriptor } from "../utils/protected-asset";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";
import { ensureUrlOrUploadPathForFolders } from "../utils/url-or-path";
import { buildPaginationMeta, normalizePagination } from "./shared/pagination";
import { buildCurrentEnrollmentWhere } from "./shared/enrollment-access";
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
  attachEnrollmentCountsToTeacherCourses,
  calculateNextLessonOrderIndex,
  courseDetailInclude,
  courseQuizAttemptInclude,
  ensureRequiredCourseIdentifier,
  listCourseLessonIdsInOrder,
  mapCourseDetailResponse,
  mapCourseQuizAttempt,
  moveLessonIdToOrderIndex,
  resequenceCourseLessons,
  requireLessonWithCourse,
  requireMaterialWithCourse,
  requireOwnedCourse,
  requirePackageWithCourse,
  requireTeacherProfileByUserId,
  teacherCourseInclude,
} from "./course/course-service-helpers";
import { calculateActualTeacherStudentCount } from "./teacher/teacher-service-helpers";

const LESSON_ORDER_RETRY_ATTEMPTS = 3;

const MIN_COURSE_TITLE_LENGTH = 3;
const MAX_COURSE_TITLE_LENGTH = 150;
const MIN_COURSE_DESCRIPTION_LENGTH = 10;
const MAX_COURSE_DESCRIPTION_LENGTH = 5000;
const MIN_CATEGORY_LENGTH = 2;
const MAX_CATEGORY_LENGTH = 80;

const MIN_LESSON_TITLE_LENGTH = 3;
const MAX_LESSON_TITLE_LENGTH = 150;
const MAX_LESSON_DESCRIPTION_LENGTH = 3000;

const MIN_PACKAGE_NAME_LENGTH = 3;
const MAX_PACKAGE_NAME_LENGTH = 120;
const MAX_PACKAGE_DESCRIPTION_LENGTH = 2000;

const MIN_MATERIAL_TITLE_LENGTH = 3;
const MAX_MATERIAL_TITLE_LENGTH = 150;
const MAX_MATERIAL_DESCRIPTION_LENGTH = 2000;
const MAX_FILE_TYPE_LENGTH = 80;

const MAX_PRICE = 99999999.99;
const MAX_DURATION_MINUTES = 60 * 24 * 365;
const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024 * 5; // 5 GB

const isUniqueConstraintError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

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

  if (numericValue > MAX_PRICE) {
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
  if (normalized === undefined || normalized === "") {
    return undefined;
  }

  return ensureUrlOrUploadPathForFolders(normalized, folders, errorMessage);
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
    minLength: MIN_COURSE_TITLE_LENGTH,
    maxLength: MAX_COURSE_TITLE_LENGTH,
  }),
  description: normalizeRequiredText(data.description, "Course description", {
    minLength: MIN_COURSE_DESCRIPTION_LENGTH,
    maxLength: MAX_COURSE_DESCRIPTION_LENGTH,
    preserveLineBreaks: true,
  }),
  category: normalizeRequiredText(data.category, "Course category", {
    minLength: MIN_CATEGORY_LENGTH,
    maxLength: MAX_CATEGORY_LENGTH,
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
  thumbnail?: string;
  previewVideoUrl?: string;
  isPublished?: boolean;
}): Prisma.CourseUpdateInput => {
  const updateData: Prisma.CourseUpdateInput = {};

  if (data.title !== undefined) {
    updateData.title = normalizeRequiredText(data.title, "Course title", {
      minLength: MIN_COURSE_TITLE_LENGTH,
      maxLength: MAX_COURSE_TITLE_LENGTH,
    });
  }

  if (data.description !== undefined) {
    updateData.description = normalizeRequiredText(
      data.description,
      "Course description",
      {
        minLength: MIN_COURSE_DESCRIPTION_LENGTH,
        maxLength: MAX_COURSE_DESCRIPTION_LENGTH,
        preserveLineBreaks: true,
      },
    );
  }

  if (data.category !== undefined) {
    updateData.category = normalizeRequiredText(
      data.category,
      "Course category",
      {
        minLength: MIN_CATEGORY_LENGTH,
        maxLength: MAX_CATEGORY_LENGTH,
      },
    );
  }

  if (data.courseType !== undefined) {
    updateData.courseType = data.courseType;
  }

  if (data.thumbnail !== undefined) {
    updateData.thumbnail = normalizeOptionalAssetUrl(
      data.thumbnail,
      ["thumbnails"],
      "Course thumbnail must be an external URL or use the /uploads/thumbnails/ folder",
    );
  }

  if (data.previewVideoUrl !== undefined) {
    updateData.previewVideoUrl = normalizeOptionalAssetUrl(
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
    minLength: MIN_LESSON_TITLE_LENGTH,
    maxLength: MAX_LESSON_TITLE_LENGTH,
  }),
  description: normalizeOptionalText(data.description, "Lesson description", {
    maxLength: MAX_LESSON_DESCRIPTION_LENGTH,
    preserveLineBreaks: true,
  }),
  type: data.type,
  duration: normalizePositiveInteger(data.duration, "Lesson duration", {
    max: MAX_DURATION_MINUTES,
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
      minLength: MIN_PACKAGE_NAME_LENGTH,
      maxLength: MAX_PACKAGE_NAME_LENGTH,
    }),
    description: normalizeOptionalText(
      data.description,
      "Package description",
      {
        maxLength: MAX_PACKAGE_DESCRIPTION_LENGTH,
        preserveLineBreaks: true,
      },
    ),
    price,
    discount,
    finalPrice: calculateFinalPrice(price, discount),
    duration: normalizePositiveInteger(data.duration, "Package duration", {
      max: MAX_DURATION_MINUTES,
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
    description?: string;
    price?: number;
    discount?: number;
    duration?: number;
    maxStudents?: number;
    features?: Prisma.InputJsonValue;
    isActive?: boolean;
  },
): Prisma.LessonPackageUpdateInput => {
  const updateData: Prisma.LessonPackageUpdateInput = {};

  if (data.name !== undefined) {
    updateData.name = normalizeRequiredText(data.name, "Package name", {
      minLength: MIN_PACKAGE_NAME_LENGTH,
      maxLength: MAX_PACKAGE_NAME_LENGTH,
    });
  }

  if (data.description !== undefined) {
    updateData.description = normalizeOptionalText(
      data.description,
      "Package description",
      {
        maxLength: MAX_PACKAGE_DESCRIPTION_LENGTH,
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
        ? normalizeMoney(data.discount, "Package discount")
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
    updateData.duration = normalizePositiveInteger(
      data.duration,
      "Package duration",
      {
        max: MAX_DURATION_MINUTES,
      },
    );
  }

  if (data.maxStudents !== undefined) {
    updateData.maxStudents = normalizePositiveInteger(
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
    minLength: MIN_MATERIAL_TITLE_LENGTH,
    maxLength: MAX_MATERIAL_TITLE_LENGTH,
  }),
  description: normalizeOptionalText(data.description, "Material description", {
    maxLength: MAX_MATERIAL_DESCRIPTION_LENGTH,
    preserveLineBreaks: true,
  }),
  fileUrl: ensureUrlOrUploadPathForFolders(
    data.fileUrl,
    ["documents"],
    "Material file URL must be an external URL or use the /uploads/documents/ folder",
  ),
  fileType: normalizeRequiredText(data.fileType, "Material file type", {
    minLength: 1,
    maxLength: MAX_FILE_TYPE_LENGTH,
  }),
  fileSize: normalizeNonNegativeInteger(data.fileSize, "Material file size", {
    required: true,
    max: MAX_FILE_SIZE_BYTES,
  }) as number,
  isDownloadable: data.isDownloadable,
});

const normalizeMaterialUpdateData = (data: {
  title?: string;
  description?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  isDownloadable?: boolean;
}): Prisma.MaterialUpdateInput => {
  const updateData: Prisma.MaterialUpdateInput = {};

  if (data.title !== undefined) {
    updateData.title = normalizeRequiredText(data.title, "Material title", {
      minLength: MIN_MATERIAL_TITLE_LENGTH,
      maxLength: MAX_MATERIAL_TITLE_LENGTH,
    });
  }

  if (data.description !== undefined) {
    updateData.description = normalizeOptionalText(
      data.description,
      "Material description",
      {
        maxLength: MAX_MATERIAL_DESCRIPTION_LENGTH,
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
        maxLength: MAX_FILE_TYPE_LENGTH,
      },
    );
  }

  if (data.fileSize !== undefined) {
    updateData.fileSize = normalizeNonNegativeInteger(
      data.fileSize,
      "Material file size",
      {
        required: true,
        max: MAX_FILE_SIZE_BYTES,
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

const ensureCourseCanBeSafelyDeleted = async (courseId: string) => {
  const [enrollmentCount, paymentCount, orderItemCount] = await Promise.all([
    prisma.enrollment.count({
      where: {
        package: {
          courseId,
        },
      },
    }),
    prisma.payment.count({
      where: {
        package: {
          courseId,
        },
      },
    }),
    prisma.orderItem.count({
      where: {
        package: {
          courseId,
        },
      },
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
 * Handles course, lesson, quiz, package, material, and protected download management.
 */
class CourseService {
  /**
   * Get all published courses with filters.
   */
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

      return {
        courses: paginatedCourses,
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

    return {
      courses: rawCourses,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  /**
   * Get course by ID.
   */
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
            select: {
              id: true,
            },
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
            package: {
              courseId: course.id,
            },
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

    if (!course.isPublished && !isCourseOwnerOrAdmin && !isEnrolled) {
      throw new NotFoundError("Course not found");
    }

    const canViewQuizAnswers = isCourseOwnerOrAdmin;
    const canManageMaterials = isCourseOwnerOrAdmin;
    const actualTeacherStudentCount = await calculateActualTeacherStudentCount(
      course.teacherProfileId,
    );
    const mappedCourse = mapCourseDetailResponse(course, {
      isEnrolled,
      canViewQuizAnswers,
      canManageMaterials,
    });

    return {
      ...mappedCourse,
      teacherProfile: {
        ...mappedCourse.teacherProfile,
        totalStudents: actualTeacherStudentCount,
      },
    };
  }

  /**
   * Create a new course. Teacher only.
   */
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

    const course = await prisma.course.create({
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

    return course;
  }

  /**
   * Update course. Teacher only.
   */
  async updateCourse(
    userId: string,
    courseId: string,
    data: {
      title?: string;
      description?: string;
      category?: string;
      courseType?: CourseType;
      thumbnail?: string;
      previewVideoUrl?: string;
      isPublished?: boolean;
    },
  ) {
    const ownedCourse = await requireOwnedCourse(userId, courseId);
    const updateData = normalizeCourseUpdateData(data);

    const updated = await prisma.course.update({
      where: { id: ownedCourse.id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Delete course. Teacher only.
   */
  async deleteCourse(userId: string, courseId: string) {
    const ownedCourse = await requireOwnedCourse(userId, courseId);
    await ensureCourseCanBeSafelyDeleted(ownedCourse.id);

    await prisma.course.delete({
      where: { id: ownedCourse.id },
    });

    return { message: "Course deleted successfully" };
  }

  /**
   * Create lesson in a course.
   */
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

    const lesson = await withLessonOrderRetry(() =>
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

        await resequenceCourseLessons(tx, ownedCourse.id, [
          ...orderedLessonIds,
          createdLesson.id,
        ]);

        const refreshedLesson = await tx.lesson.findUnique({
          where: { id: createdLesson.id },
        });

        if (!refreshedLesson) {
          throw new NotFoundError("Lesson not found after creation");
        }

        return refreshedLesson;
      }),
    );

    return lesson;
  }

  /**
   * Update lesson.
   */
  async updateLesson(
    userId: string,
    lessonId: string,
    data: {
      title?: string;
      description?: string;
      type?: LessonType;
      duration?: number;
      videoUrl?: string;
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
              minLength: MIN_LESSON_TITLE_LENGTH,
              maxLength: MAX_LESSON_TITLE_LENGTH,
            }),
      description: normalizeOptionalText(
        data.description,
        "Lesson description",
        {
          maxLength: MAX_LESSON_DESCRIPTION_LENGTH,
          preserveLineBreaks: true,
        },
      ),
      type: data.type,
      duration:
        data.duration === undefined
          ? undefined
          : normalizePositiveInteger(data.duration, "Lesson duration", {
              max: MAX_DURATION_MINUTES,
            }),
      videoUrl:
        data.videoUrl === undefined
          ? undefined
          : normalizeOptionalAssetUrl(
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

    const updated = await withLessonOrderRetry(() =>
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

    return updated;
  }

  /**
   * Delete lesson.
   */
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
      }),
    );

    return { message: "Lesson deleted successfully" };
  }

  /**
   * Grade a lesson quiz for an enrolled student.
   */
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
          package: {
            courseId: lesson.course.id,
          },
        },
        new Date(),
      ),
      select: {
        id: true,
      },
    });

    if (!enrollment && (!lesson.isFree || !lesson.course.isPublished)) {
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

  /**
   * Get quiz attempts for a teacher-owned course.
   */
  async getCourseQuizAttempts(userId: string, courseId: string) {
    const ownedCourse = await requireOwnedCourse(userId, courseId);

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        lesson: {
          courseId: ownedCourse.id,
        },
      },
      include: courseQuizAttemptInclude,
      orderBy: [{ submittedAt: "desc" }],
    });

    return attempts.map(mapCourseQuizAttempt);
  }

  /**
   * Get quiz attempts for the authenticated student within a course.
   */
  async getMyCourseQuizAttempts(userId: string, courseId: string) {
    const normalizedUserId = ensureRequiredCourseIdentifier(userId, "User ID");
    const normalizedCourseId = ensureRequiredCourseIdentifier(
      courseId,
      "Course ID",
    );

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        studentId: normalizedUserId,
        lesson: {
          courseId: normalizedCourseId,
        },
      },
      include: courseQuizAttemptInclude,
      orderBy: [{ submittedAt: "desc" }],
    });

    return attempts.map(mapCourseQuizAttempt);
  }

  /**
   * Create lesson package.
   */
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

    const lessonPackage = await prisma.lessonPackage.create({
      data: {
        courseId: ownedCourse.id,
        ...normalizedData,
      },
    });

    return lessonPackage;
  }

  /**
   * Update lesson package.
   */
  async updatePackage(
    userId: string,
    packageId: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      discount?: number;
      duration?: number;
      maxStudents?: number;
      features?: Prisma.InputJsonValue;
      isActive?: boolean;
    },
  ) {
    const lessonPackage = await requirePackageWithCourse(packageId);
    await requireOwnedCourse(userId, lessonPackage.courseId);

    const updateData = normalizePackageUpdateData(lessonPackage, data);

    const updated = await prisma.lessonPackage.update({
      where: { id: lessonPackage.id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Delete lesson package.
   */
  async deletePackage(userId: string, packageId: string) {
    const lessonPackage = await requirePackageWithCourse(packageId);
    await requireOwnedCourse(userId, lessonPackage.courseId);
    await ensurePackageCanBeSafelyDeleted(lessonPackage.id);

    await prisma.lessonPackage.delete({
      where: { id: lessonPackage.id },
    });

    return { message: "Package deleted successfully" };
  }

  /**
   * Upload material to course.
   */
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

    const material = await prisma.material.create({
      data: {
        courseId: ownedCourse.id,
        ...normalizedData,
      },
    });

    return material;
  }

  /**
   * Update material.
   */
  async updateMaterial(
    userId: string,
    materialId: string,
    data: {
      title?: string;
      description?: string;
      fileUrl?: string;
      fileType?: string;
      fileSize?: number;
      isDownloadable?: boolean;
    },
  ) {
    const material = await requireMaterialWithCourse(materialId);
    await requireOwnedCourse(userId, material.courseId);
    const updateData = normalizeMaterialUpdateData(data);

    const updated = await prisma.material.update({
      where: { id: material.id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Delete material.
   */
  async deleteMaterial(userId: string, materialId: string) {
    const material = await requireMaterialWithCourse(materialId);
    await requireOwnedCourse(userId, material.courseId);

    await prisma.material.delete({
      where: { id: material.id },
    });

    return { message: "Material deleted successfully" };
  }

  /**
   * Get a protected material download target.
   */
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

    if (!material.isDownloadable) {
      throw new AuthorizationError(
        "This material is not available for download",
      );
    }

    const requester = await prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: {
        role: true,
        teacherProfile: {
          select: {
            id: true,
          },
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
      const enrollment = await prisma.enrollment.findFirst({
        where: buildCurrentEnrollmentWhere(
          {
            userId: normalizedUserId,
            package: {
              courseId: material.course.id,
            },
          },
          new Date(),
        ),
        select: {
          id: true,
        },
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

  /**
   * Get teacher's own courses.
   */
  async getTeacherCourses(userId: string) {
    const teacherProfile = await requireTeacherProfileByUserId(userId);

    const courses = await prisma.course.findMany({
      where: {
        teacherProfileId: teacherProfile.id,
      },
      include: teacherCourseInclude,
      orderBy: { createdAt: "desc" },
    });

    return attachEnrollmentCountsToTeacherCourses(courses);
  }

  /**
   * Get course categories.
   */
  async getCategories() {
    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    return courses.map((course) => course.category);
  }
}

export default new CourseService();

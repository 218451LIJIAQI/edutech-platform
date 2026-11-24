import prisma from "../config/database";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "../utils/errors";
import { buildCurrentEnrollmentWhere } from "./shared/enrollment-access";
import { normalizeLessonQuiz } from "./course/course-helpers";
import { sanitizeStudentEnrollmentCourse } from "./course/course-service-helpers";

const MAX_PROGRESS = 100;
const MAX_COMPLETED_LESSONS = 10000;

const normalizeRequiredId = (value: string, fieldName: string): string => {
  const normalized = value?.trim();

  if (!normalized) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return normalized;
};

const normalizeNonNegativeInteger = (
  value: number,
  fieldName: string,
  max = MAX_COMPLETED_LESSONS,
): number => {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new ValidationError(`${fieldName} must be a valid integer`);
  }

  if (value < 0) {
    throw new ValidationError(`${fieldName} must not be negative`);
  }

  if (value > max) {
    throw new ValidationError(`${fieldName} is too large`);
  }

  return value;
};

const normalizeOptionalProgress = (value?: number): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value)) {
    throw new ValidationError("Progress must be a valid number");
  }

  if (value < 0 || value > MAX_PROGRESS) {
    throw new ValidationError("Progress must be between 0 and 100");
  }

  return Math.round(value);
};

export const calculateProgressFromLessons = (
  completedLessons: number,
  totalLessons: number,
): number => {
  if (totalLessons <= 0) {
    return 0;
  }

  return Math.min(
    MAX_PROGRESS,
    Math.max(0, Math.round((completedLessons / totalLessons) * MAX_PROGRESS)),
  );
};

export const parseStoredCompletedLessonIds = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") {
      continue;
    }
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    ids.push(trimmed);
  }
  return ids;
};

export const resolveEnrollmentCompletedLessonIds = (params: {
  storedCompletedLessonIds: unknown;
  completedLessonsCount: number;
  orderedCourseLessonIds: string[];
}): string[] => {
  const {
    storedCompletedLessonIds,
    completedLessonsCount,
    orderedCourseLessonIds,
  } = params;
  const validSet = new Set(orderedCourseLessonIds);
  const parsedIds = parseStoredCompletedLessonIds(
    storedCompletedLessonIds,
  ).filter((id) => validSet.has(id));

  if (parsedIds.length > 0) {
    const parsedSet = new Set(parsedIds);
    return orderedCourseLessonIds.filter((id) => parsedSet.has(id));
  }

  if (completedLessonsCount > 0) {
    return orderedCourseLessonIds.slice(
      0,
      Math.min(completedLessonsCount, orderedCourseLessonIds.length),
    );
  }

  return [];
};

const normalizeCompletedLessonIds = (lessonIds: string[]): string[] => {
  const normalizedLessonIds = [
    ...new Set(lessonIds.map((lessonId) => lessonId.trim()).filter(Boolean)),
  ];

  if (normalizedLessonIds.length > MAX_COMPLETED_LESSONS) {
    throw new ValidationError("Completed lessons list is too large");
  }

  return normalizedLessonIds;
};

export const assertQuizGateForLessonCompletion = (params: {
  courseLessons: Array<{ id: string; quiz: unknown }>;
  passedQuizLessonIds: ReadonlySet<string>;
  requestedCompletedLessonIds?: string[];
  requestedCompletedLessonCount?: number;
}): number => {
  const {
    courseLessons,
    passedQuizLessonIds,
    requestedCompletedLessonIds,
    requestedCompletedLessonCount,
  } = params;

  const lessonById = new Map(courseLessons.map((lesson) => [lesson.id, lesson]));
  const quizLessonIds = new Set(
    courseLessons
      .filter((lesson) => normalizeLessonQuiz(lesson.quiz) !== null)
      .map((lesson) => lesson.id),
  );

  if (requestedCompletedLessonIds !== undefined) {
    for (const lessonId of requestedCompletedLessonIds) {
      if (!lessonById.has(lessonId)) {
        throw new ValidationError(
          "completedLessons contains lessons that do not belong to this course",
        );
      }
      if (quizLessonIds.has(lessonId) && !passedQuizLessonIds.has(lessonId)) {
        throw new ValidationError(
          "You must pass the lesson quiz before marking this lesson as complete",
        );
      }
    }

    return Math.min(requestedCompletedLessonIds.length, courseLessons.length);
  }

  const maxAllowedByQuizzes =
    courseLessons.length -
    quizLessonIds.size +
    Array.from(quizLessonIds).filter((id) => passedQuizLessonIds.has(id)).length;

  const requestedCount = Math.min(
    requestedCompletedLessonCount ?? 0,
    courseLessons.length,
  );

  if (requestedCount > maxAllowedByQuizzes) {
    throw new ValidationError(
      "You must pass all required lesson quizzes before completing those lessons",
    );
  }

  return requestedCount;
};

const requireTeacherOwnedCourse = async (userId: string, courseId: string) => {
  const normalizedUserId = normalizeRequiredId(userId, "User ID");
  const normalizedCourseId = normalizeRequiredId(courseId, "Course ID");

  const course = await prisma.course.findUnique({
    where: { id: normalizedCourseId },
    select: {
      id: true,
      title: true,
      teacherProfile: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  if (course.teacherProfile.userId !== normalizedUserId) {
    throw new AuthorizationError(
      "You can only access students from your own course",
    );
  }

  return course;
};

/**
 * Enrollment Service
 * Handles student enrollments, access checking, course progress, and teacher course statistics.
 */
class EnrollmentService {
  /**
   * Get current active enrollments for a user, stripping quiz answer keys.
   */
  async getUserEnrollments(userId: string) {
    const normalizedUserId = normalizeRequiredId(userId, "User ID");

    const enrollments = await prisma.enrollment.findMany({
      where: buildCurrentEnrollmentWhere(
        { userId: normalizedUserId },
        new Date(),
      ),
      include: {
        package: {
          include: {
            course: {
              include: {
                teacherProfile: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        avatar: true,
                      },
                    },
                  },
                },
                lessons: {
                  orderBy: { orderIndex: "asc" },
                },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return enrollments.map((enrollment) => {
      const orderedCourseLessonIds = enrollment.package.course.lessons.map(
        (lesson) => lesson.id,
      );
      const completedLessonIds = resolveEnrollmentCompletedLessonIds({
        storedCompletedLessonIds: enrollment.completedLessonIds,
        completedLessonsCount: enrollment.completedLessons,
        orderedCourseLessonIds,
      });

      return {
        ...enrollment,
        completedLessonIds,
        completedLessons: completedLessonIds.length,
        progress: calculateProgressFromLessons(
          completedLessonIds.length,
          orderedCourseLessonIds.length,
        ),
        package: {
          ...enrollment.package,
          course: sanitizeStudentEnrollmentCourse(enrollment.package.course),
        },
      };
    });
  }

  /**
   * Get one active enrollment by ID, scoped to the requesting user, with sanitized quizzes and material access URLs.
   */
  async getEnrollmentById(enrollmentId: string, userId: string) {
    const normalizedEnrollmentId = normalizeRequiredId(
      enrollmentId,
      "Enrollment ID",
    );
    const normalizedUserId = normalizeRequiredId(userId, "User ID");

    const enrollment = await prisma.enrollment.findFirst({
      where: buildCurrentEnrollmentWhere(
        { id: normalizedEnrollmentId, userId: normalizedUserId },
        new Date(),
      ),
      include: {
        package: {
          include: {
            course: {
              include: {
                teacherProfile: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        avatar: true,
                      },
                    },
                  },
                },
                lessons: {
                  orderBy: { orderIndex: "asc" },
                },
                materials: {
                  where: {
                    isDownloadable: true,
                  },
                  orderBy: {
                    uploadedAt: "desc",
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundError("Enrollment not found");
    }

    const orderedCourseLessonIds = enrollment.package.course.lessons.map(
      (lesson) => lesson.id,
    );
    const completedLessonIds = resolveEnrollmentCompletedLessonIds({
      storedCompletedLessonIds: enrollment.completedLessonIds,
      completedLessonsCount: enrollment.completedLessons,
      orderedCourseLessonIds,
    });

    return {
      ...enrollment,
      completedLessonIds,
      completedLessons: completedLessonIds.length,
      progress: calculateProgressFromLessons(
        completedLessonIds.length,
        orderedCourseLessonIds.length,
      ),
      package: {
        ...enrollment.package,
        course: sanitizeStudentEnrollmentCourse(enrollment.package.course),
      },
    };
  }

  /**
   * Update enrollment progress for the enrolled student.
   * Enforces server-side quiz pass verification and calculates progress from verified completed lessons.
   */
  async updateProgress(
    enrollmentId: string,
    userId: string,
    completedLessons: number | string[],
    progress?: number,
  ) {
    const normalizedEnrollmentId = normalizeRequiredId(
      enrollmentId,
      "Enrollment ID",
    );
    const normalizedUserId = normalizeRequiredId(userId, "User ID");
    const requestedCompletedLessonCount = Array.isArray(completedLessons)
      ? undefined
      : normalizeNonNegativeInteger(completedLessons, "Completed lessons");
    const requestedCompletedLessonIds = Array.isArray(completedLessons)
      ? normalizeCompletedLessonIds(completedLessons)
      : undefined;

    normalizeOptionalProgress(progress);

    const enrollment = await prisma.enrollment.findFirst({
      where: buildCurrentEnrollmentWhere(
        { id: normalizedEnrollmentId, userId: normalizedUserId },
        new Date(),
      ),
      include: {
        package: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundError("Enrollment not found");
    }

    const [courseLessons, passedAttempts] = await Promise.all([
      prisma.lesson.findMany({
        where: {
          courseId: enrollment.package.courseId,
        },
        orderBy: {
          orderIndex: "asc",
        },
        select: {
          id: true,
          quiz: true,
        },
      }),
      prisma.quizAttempt.findMany({
        where: {
          studentId: normalizedUserId,
          passed: true,
          lesson: {
            courseId: enrollment.package.courseId,
          },
        },
        select: {
          lessonId: true,
        },
      }),
    ]);

    const passedQuizLessonIds = new Set(
      passedAttempts.map((attempt) => attempt.lessonId),
    );
    const boundedCompletedLessons = assertQuizGateForLessonCompletion({
      courseLessons,
      passedQuizLessonIds,
      requestedCompletedLessonIds,
      requestedCompletedLessonCount,
    });

    const verifiedCompletedLessonIds =
      requestedCompletedLessonIds !== undefined
        ? courseLessons
            .map((lesson) => lesson.id)
            .filter((id) => requestedCompletedLessonIds.includes(id))
        : courseLessons
            .filter(
              (lesson) =>
                normalizeLessonQuiz(lesson.quiz) === null ||
                passedQuizLessonIds.has(lesson.id),
            )
            .slice(0, boundedCompletedLessons)
            .map((lesson) => lesson.id);

    const calculatedProgress = calculateProgressFromLessons(
      boundedCompletedLessons,
      courseLessons.length,
    );

    const updated = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        completedLessons: boundedCompletedLessons,
        completedLessonIds: verifiedCompletedLessonIds,
        progress: calculatedProgress,
      },
    });

    return {
      ...updated,
      completedLessonIds: parseStoredCompletedLessonIds(
        updated.completedLessonIds,
      ),
    };
  }

  /**
   * Check whether a user currently has access to a course through an active enrollment.
   */
  async checkAccess(userId: string, courseId: string) {
    const normalizedUserId = normalizeRequiredId(userId, "User ID");
    const normalizedCourseId = normalizeRequiredId(courseId, "Course ID");

    const enrollment = await prisma.enrollment.findFirst({
      where: buildCurrentEnrollmentWhere(
        {
          userId: normalizedUserId,
          package: {
            courseId: normalizedCourseId,
          },
        },
        new Date(),
      ),
      select: {
        id: true,
      },
    });

    return !!enrollment;
  }

  /**
   * Get active students enrolled in a teacher-owned course.
   */
  async getCourseStudents(userId: string, courseId: string) {
    const course = await requireTeacherOwnedCourse(userId, courseId);

    const students = await prisma.enrollment.findMany({
      where: buildCurrentEnrollmentWhere(
        {
          package: {
            courseId: course.id,
          },
        },
        new Date(),
      ),
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        package: {
          select: {
            id: true,
            name: true,
            finalPrice: true,
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return students.map((enrollment) => ({
      ...enrollment,
      completedLessonIds: parseStoredCompletedLessonIds(
        enrollment.completedLessonIds,
      ),
    }));
  }

  /**
   * Get active enrollment statistics for a teacher-owned course.
   */
  async getCourseStats(userId: string, courseId: string) {
    const course = await requireTeacherOwnedCourse(userId, courseId);

    const [enrollments, lessons] = await Promise.all([
      prisma.enrollment.findMany({
        where: buildCurrentEnrollmentWhere(
          {
            package: {
              courseId: course.id,
            },
          },
          new Date(),
        ),
        select: {
          userId: true,
          progress: true,
          completedLessons: true,
          completedLessonIds: true,
          enrolledAt: true,
        },
      }),
      prisma.lesson.findMany({
        where: {
          courseId: course.id,
        },
        orderBy: { orderIndex: "asc" },
        select: { id: true },
      }),
    ]);

    return summarizeCourseEnrollmentStats(
      enrollments,
      lessons.map((lesson) => lesson.id),
    );
  }
}

export const summarizeCourseEnrollmentStats = (
  enrollments: ReadonlyArray<{
    userId: string;
    progress: number;
    completedLessons: number;
    completedLessonIds?: unknown;
    enrolledAt?: Date | string;
  }>,
  orderedCourseLessonIds: string[],
) => {
  const totalLessons = orderedCourseLessonIds.length;
  const bestByStudent = new Map<
    string,
    { progress: number; completedCount: number; enrolledTime: number }
  >();

  for (const enrollment of enrollments) {
    const resolvedCompletedCount =
      totalLessons > 0
        ? resolveEnrollmentCompletedLessonIds({
            storedCompletedLessonIds: enrollment.completedLessonIds,
            completedLessonsCount: enrollment.completedLessons,
            orderedCourseLessonIds,
          }).length
        : Math.max(0, enrollment.completedLessons);
    const resolvedProgress =
      totalLessons > 0
        ? calculateProgressFromLessons(resolvedCompletedCount, totalLessons)
        : Math.min(MAX_PROGRESS, Math.max(0, Math.round(enrollment.progress)));
    const enrolledTime = enrollment.enrolledAt
      ? new Date(enrollment.enrolledAt).getTime()
      : 0;

    const existing = bestByStudent.get(enrollment.userId);
    if (
      !existing ||
      resolvedProgress > existing.progress ||
      (resolvedProgress === existing.progress &&
        resolvedCompletedCount > existing.completedCount) ||
      (resolvedProgress === existing.progress &&
        resolvedCompletedCount === existing.completedCount &&
        enrolledTime > existing.enrolledTime)
    ) {
      bestByStudent.set(enrollment.userId, {
        progress: resolvedProgress,
        completedCount: resolvedCompletedCount,
        enrolledTime,
      });
    }
  }

  const studentStats = Array.from(bestByStudent.values());
  const totalStudents = studentStats.length;

  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      totalLessons,
      averageProgress: 0,
      completionRate: 0,
      totalCompletedLessons: 0,
    };
  }

  const totalProgress = studentStats.reduce(
    (sum, item) => sum + item.progress,
    0,
  );
  const totalCompletedLessons = studentStats.reduce(
    (sum, item) => sum + item.completedCount,
    0,
  );
  const completedStudents = studentStats.filter(
    (item) => item.progress >= MAX_PROGRESS,
  ).length;

  return {
    totalStudents,
    totalLessons,
    averageProgress: Math.round(totalProgress / totalStudents),
    completionRate: Math.round((completedStudents / totalStudents) * 100),
    totalCompletedLessons,
  };
};

export default new EnrollmentService();

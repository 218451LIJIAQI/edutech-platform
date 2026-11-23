import prisma from "../config/database";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "../utils/errors";
import {
  normalizeLessonQuiz,
  sanitizeLessonQuiz,
} from "./course/course-helpers";
import {
  liveSessionSelectFields,
  mapProtectedMaterialResponse,
  sanitizeLiveSessionForViewer,
} from "./course/course-service-helpers";
import {
  buildCurrentEnrollmentWhere,
  parseCompletedLessonIdsJson,
} from "./shared/enrollment-access";

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

const calculateProgressFromLessons = (
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

const normalizeCompletedLessonIds = (lessonIds: string[]): string[] => {
  const normalizedLessonIds = [
    ...new Set(lessonIds.map((lessonId) => lessonId.trim()).filter(Boolean)),
  ];

  if (normalizedLessonIds.length > MAX_COMPLETED_LESSONS) {
    throw new ValidationError("Completed lessons list is too large");
  }

  return normalizedLessonIds;
};

const sanitizeStudentEnrollmentLesson = <
  T extends {
    id: string;
    quiz: unknown;
    liveSessions?: Array<{
      status: "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";
      meetingUrl: string | null;
      recordingUrl: string | null;
    }>;
  },
>(
  lesson: T,
) => ({
  ...lesson,
  quiz: sanitizeLessonQuiz(normalizeLessonQuiz(lesson.quiz as never)),
  ...(lesson.liveSessions
    ? {
        liveSessions: lesson.liveSessions.map((session) =>
          sanitizeLiveSessionForViewer(session, {
            canAccessLessonContent: true,
            canManageCourse: false,
          }),
        ),
      }
    : {}),
});

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
 * Handles student enrollments, access checking, quiz-gated course progress, and teacher course statistics.
 */
class EnrollmentService {
  /**
   * Get current active enrollments for a user with quiz answers stripped.
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
                  include: {
                    liveSessions: {
                      orderBy: { scheduledAt: "asc" },
                      select: liveSessionSelectFields,
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return enrollments.map((enrollment) => ({
      ...enrollment,
      completedLessonIds: parseCompletedLessonIdsJson(
        enrollment.completedLessonIds,
      ),
      package: {
        ...enrollment.package,
        course: {
          ...enrollment.package.course,
          lessons: enrollment.package.course.lessons.map(
            sanitizeStudentEnrollmentLesson,
          ),
        },
      },
    }));
  }

  /**
   * Get one active enrollment by ID, scoped to the requesting user,
   * stripping quiz answer keys and internal upload storage paths.
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
                  include: {
                    liveSessions: {
                      orderBy: { scheduledAt: "asc" },
                      select: liveSessionSelectFields,
                    },
                  },
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

    return {
      ...enrollment,
      completedLessonIds: parseCompletedLessonIdsJson(
        enrollment.completedLessonIds,
      ),
      package: {
        ...enrollment.package,
        course: {
          ...enrollment.package.course,
          lessons: enrollment.package.course.lessons.map(
            sanitizeStudentEnrollmentLesson,
          ),
          materials: enrollment.package.course.materials.map((material) =>
            mapProtectedMaterialResponse(material, {
              canAccessPaidContent: true,
              canManageMaterials: false,
            }),
          ),
        },
      },
    };
  }

  /**
   * Update enrollment progress for the enrolled student.
   * Enforces server-side quiz passing gates and persists exact out-of-order completedLessonIds.
   */
  async updateProgress(
    enrollmentId: string,
    userId: string,
    completedLessons: number | string[],
    progress?: number,
    explicitCompletedLessonIds?: string[],
  ) {
    const normalizedEnrollmentId = normalizeRequiredId(
      enrollmentId,
      "Enrollment ID",
    );
    const normalizedUserId = normalizeRequiredId(userId, "User ID");

    const requestedIds =
      explicitCompletedLessonIds !== undefined
        ? normalizeCompletedLessonIds(explicitCompletedLessonIds)
        : Array.isArray(completedLessons)
          ? normalizeCompletedLessonIds(completedLessons)
          : undefined;

    const requestedCompletedLessonCount =
      requestedIds === undefined && typeof completedLessons === "number"
        ? normalizeNonNegativeInteger(completedLessons, "Completed lessons")
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
        select: {
          id: true,
          orderIndex: true,
          quiz: true,
        },
        orderBy: {
          orderIndex: "asc",
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
        distinct: ["lessonId"],
      }),
    ]);

    const totalLessons = courseLessons.length;
    const courseLessonOrder = new Map(
      courseLessons.map((lesson, idx) => [lesson.id, idx]),
    );
    const quizRequiredLessonIds = new Set(
      courseLessons
        .filter((lesson) => normalizeLessonQuiz(lesson.quiz) !== null)
        .map((lesson) => lesson.id),
    );
    const passedQuizLessonIds = new Set(
      passedAttempts.map((attempt) => attempt.lessonId),
    );

    let resolvedCompletedIds: string[];

    if (requestedIds !== undefined) {
      for (const lessonId of requestedIds) {
        if (!courseLessonOrder.has(lessonId)) {
          throw new ValidationError(
            "completedLessons contains lessons that do not belong to this course",
          );
        }
        if (
          quizRequiredLessonIds.has(lessonId) &&
          !passedQuizLessonIds.has(lessonId)
        ) {
          throw new ValidationError(
            "You must pass the lesson quiz before marking this lesson complete",
          );
        }
      }

      resolvedCompletedIds = [...requestedIds].sort(
        (left, right) =>
          (courseLessonOrder.get(left) ?? 0) -
          (courseLessonOrder.get(right) ?? 0),
      );
    } else {
      const targetCount = Math.min(
        requestedCompletedLessonCount ?? 0,
        totalLessons,
      );
      const completableLessonIds = courseLessons
        .filter(
          (lesson) =>
            !quizRequiredLessonIds.has(lesson.id) ||
            passedQuizLessonIds.has(lesson.id),
        )
        .map((lesson) => lesson.id);

      if (targetCount > completableLessonIds.length) {
        throw new ValidationError(
          "You must pass the required lesson quizzes before completing these lessons",
        );
      }

      const completableSet = new Set(completableLessonIds);
      const existingIds = parseCompletedLessonIdsJson(
        enrollment.completedLessonIds,
      ).filter((id) => completableSet.has(id));

      const nextSet = new Set<string>(existingIds.slice(0, targetCount));
      for (const lessonId of completableLessonIds) {
        if (nextSet.size >= targetCount) {
          break;
        }
        nextSet.add(lessonId);
      }

      resolvedCompletedIds = Array.from(nextSet).sort(
        (left, right) =>
          (courseLessonOrder.get(left) ?? 0) -
          (courseLessonOrder.get(right) ?? 0),
      );
    }

    const boundedCompletedLessons = Math.min(
      resolvedCompletedIds.length,
      totalLessons,
    );
    const calculatedProgress = calculateProgressFromLessons(
      boundedCompletedLessons,
      totalLessons,
    );

    const updated = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        completedLessonIds: resolvedCompletedIds,
        completedLessons: boundedCompletedLessons,
        progress: calculatedProgress,
      },
    });

    return {
      ...updated,
      completedLessonIds: resolvedCompletedIds,
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

    const enrollments = await prisma.enrollment.findMany({
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

    return enrollments.map((enrollment) => ({
      ...enrollment,
      completedLessonIds: parseCompletedLessonIdsJson(
        enrollment.completedLessonIds,
      ),
    }));
  }

  /**
   * Get active enrollment statistics for a teacher-owned course.
   */
  async getCourseStats(userId: string, courseId: string) {
    const course = await requireTeacherOwnedCourse(userId, courseId);

    const [enrollments, totalLessons] = await Promise.all([
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
          progress: true,
          completedLessons: true,
        },
      }),
      prisma.lesson.count({
        where: {
          courseId: course.id,
        },
      }),
    ]);

    const totalStudents = enrollments.length;

    if (totalStudents === 0) {
      return {
        totalStudents: 0,
        totalLessons,
        averageProgress: 0,
        completionRate: 0,
        totalCompletedLessons: 0,
      };
    }

    const totalProgress = enrollments.reduce(
      (sum, enrollment) => sum + enrollment.progress,
      0,
    );
    const totalCompletedLessons = enrollments.reduce(
      (sum, enrollment) => sum + enrollment.completedLessons,
      0,
    );
    const completedStudents = enrollments.filter(
      (enrollment) => enrollment.progress >= MAX_PROGRESS,
    ).length;

    return {
      totalStudents,
      totalLessons,
      averageProgress: Math.round(totalProgress / totalStudents),
      completionRate: Math.round((completedStudents / totalStudents) * 100),
      totalCompletedLessons,
    };
  }
}

export default new EnrollmentService();

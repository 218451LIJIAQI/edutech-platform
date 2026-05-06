import { Prisma } from "@prisma/client";
import config from "../../config/env";
import prisma from "../../config/database";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";
import { extractUploadPathFromUrlOrPath } from "../../utils/url-or-path";
import { buildCurrentEnrollmentWhere } from "../shared/enrollment-access";
import {
  normalizeLessonQuiz,
  normalizeQuizAttemptResults,
  sanitizeLessonQuiz,
} from "./course-helpers";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;
type LessonOrderReader = Pick<PrismaClientLike, "lesson">;

const LESSON_ORDER_RENUMBER_OFFSET = 1000000;

export const courseDetailInclude = {
  teacherProfile: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
    },
  },
  lessons: {
    orderBy: {
      orderIndex: "asc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      duration: true,
      orderIndex: true,
      isFree: true,
      videoUrl: true,
      quiz: true,
    },
  },
  packages: {
    where: {
      isActive: true,
    },
  },
  materials: {
    select: {
      id: true,
      courseId: true,
      title: true,
      description: true,
      fileUrl: true,
      fileType: true,
      fileSize: true,
      isDownloadable: true,
      uploadedAt: true,
    },
  },
} satisfies Prisma.CourseInclude;

export const courseQuizAttemptInclude = {
  lesson: {
    select: {
      id: true,
      title: true,
      orderIndex: true,
    },
  },
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} satisfies Prisma.QuizAttemptInclude;

export const teacherCourseInclude = {
  teacherProfile: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
    },
  },
  packages: {
    select: {
      id: true,
      name: true,
      finalPrice: true,
      discount: true,
      isActive: true,
    },
  },
  lessons: {
    select: {
      id: true,
      title: true,
      type: true,
      duration: true,
      orderIndex: true,
    },
    orderBy: {
      orderIndex: "asc",
    },
  },
  materials: {
    select: {
      id: true,
      title: true,
    },
  },
  _count: {
    select: {
      lessons: true,
      materials: true,
    },
  },
} satisfies Prisma.CourseInclude;

type CourseDetailRecord = Prisma.CourseGetPayload<{
  include: typeof courseDetailInclude;
}>;

type CourseQuizAttemptRecord = Prisma.QuizAttemptGetPayload<{
  include: typeof courseQuizAttemptInclude;
}>;

type TeacherCourseRecord = Prisma.CourseGetPayload<{
  include: typeof teacherCourseInclude;
}>;

export const ensureRequiredCourseIdentifier = (
  value: string,
  label: string,
) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${label} is required`);
  }

  return value.trim();
};

export const requireTeacherProfileByUserId = async (
  userId: string,
  client: PrismaClientLike = prisma,
) => {
  const normalizedUserId = ensureRequiredCourseIdentifier(userId, "User ID");

  const teacherProfile = await client.teacherProfile.findUnique({
    where: {
      userId: normalizedUserId,
    },
  });

  if (!teacherProfile) {
    throw new NotFoundError("Teacher profile not found");
  }

  return teacherProfile;
};

export const requireOwnedCourse = async (
  userId: string,
  courseId: string,
  client: PrismaClientLike = prisma,
) => {
  const normalizedUserId = ensureRequiredCourseIdentifier(userId, "User ID");
  const normalizedCourseId = ensureRequiredCourseIdentifier(
    courseId,
    "Course ID",
  );

  const course = await client.course.findUnique({
    where: {
      id: normalizedCourseId,
    },
    include: {
      teacherProfile: true,
    },
  });

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  if (course.teacherProfile.userId !== normalizedUserId) {
    throw new AuthorizationError("You can only modify your own courses");
  }

  return course;
};

export const requireLessonWithCourse = async (
  lessonId: string,
  client: PrismaClientLike = prisma,
) => {
  const normalizedLessonId = ensureRequiredCourseIdentifier(
    lessonId,
    "Lesson ID",
  );

  const lesson = await client.lesson.findUnique({
    where: {
      id: normalizedLessonId,
    },
    include: {
      course: true,
    },
  });

  if (!lesson) {
    throw new NotFoundError("Lesson not found");
  }

  return lesson;
};

export const requirePackageWithCourse = async (
  packageId: string,
  client: PrismaClientLike = prisma,
) => {
  const normalizedPackageId = ensureRequiredCourseIdentifier(
    packageId,
    "Package ID",
  );

  const lessonPackage = await client.lessonPackage.findUnique({
    where: {
      id: normalizedPackageId,
    },
    include: {
      course: true,
    },
  });

  if (!lessonPackage) {
    throw new NotFoundError("Package not found");
  }

  return lessonPackage;
};

export const requireMaterialWithCourse = async (
  materialId: string,
  client: PrismaClientLike = prisma,
) => {
  const normalizedMaterialId = ensureRequiredCourseIdentifier(
    materialId,
    "Material ID",
  );

  const material = await client.material.findUnique({
    where: {
      id: normalizedMaterialId,
    },
    include: {
      course: true,
    },
  });

  if (!material) {
    throw new NotFoundError("Material not found");
  }

  return material;
};

export const calculateNextLessonOrderIndex = async (
  courseId: string,
  client: LessonOrderReader = prisma,
) => {
  const normalizedCourseId = ensureRequiredCourseIdentifier(
    courseId,
    "Course ID",
  );

  const lastLesson = await client.lesson.findFirst({
    where: {
      courseId: normalizedCourseId,
    },
    orderBy: {
      orderIndex: "desc",
    },
    select: {
      orderIndex: true,
    },
  });

  return lastLesson ? lastLesson.orderIndex + 1 : 1;
};

export const listCourseLessonIdsInOrder = async (
  courseId: string,
  client: LessonOrderReader = prisma,
) => {
  const normalizedCourseId = ensureRequiredCourseIdentifier(
    courseId,
    "Course ID",
  );

  const lessons = await client.lesson.findMany({
    where: {
      courseId: normalizedCourseId,
    },
    select: {
      id: true,
    },
    orderBy: [
      {
        orderIndex: "asc",
      },
      {
        id: "asc",
      },
    ],
  });

  return lessons.map((lesson) => lesson.id);
};

export const clampLessonOrderIndex = (
  requestedOrderIndex: number,
  lessonCount: number,
) => {
  const normalizedOrderIndex = Number.isFinite(requestedOrderIndex)
    ? Math.floor(requestedOrderIndex)
    : lessonCount;

  const upperBound = Math.max(lessonCount, 1);

  return Math.min(Math.max(normalizedOrderIndex, 1), upperBound);
};

export const moveLessonIdToOrderIndex = (
  orderedLessonIds: string[],
  lessonId: string,
  requestedOrderIndex: number,
) => {
  const normalizedLessonId = ensureRequiredCourseIdentifier(
    lessonId,
    "Lesson ID",
  );

  const reorderedLessonIds = orderedLessonIds.filter(
    (id) => id !== normalizedLessonId,
  );

  const insertionIndex =
    clampLessonOrderIndex(requestedOrderIndex, reorderedLessonIds.length + 1) -
    1;

  reorderedLessonIds.splice(insertionIndex, 0, normalizedLessonId);

  return reorderedLessonIds;
};

export const resequenceCourseLessons = async (
  tx: Prisma.TransactionClient,
  courseId: string,
  orderedLessonIds: string[],
  targetLessonId?: string,
  targetLessonData?: Prisma.LessonUpdateInput,
) => {
  const normalizedCourseId = ensureRequiredCourseIdentifier(
    courseId,
    "Course ID",
  );

  if (orderedLessonIds.length === 0) {
    return;
  }

  const uniqueLessonIds = Array.from(new Set(orderedLessonIds));

  if (uniqueLessonIds.length !== orderedLessonIds.length) {
    throw new ValidationError("Lesson order contains duplicated lesson IDs");
  }

  const lessonsInCourse = await tx.lesson.findMany({
    where: {
      courseId: normalizedCourseId,
    },
    select: {
      id: true,
    },
  });

  const lessonIdsInCourse = new Set(lessonsInCourse.map((lesson) => lesson.id));

  if (lessonIdsInCourse.size !== orderedLessonIds.length) {
    throw new ValidationError(
      "Lesson order must include all lessons in this course",
    );
  }

  const hasOnlyCourseLessons = orderedLessonIds.every((lessonId) =>
    lessonIdsInCourse.has(lessonId),
  );

  if (!hasOnlyCourseLessons) {
    throw new ValidationError(
      "Lesson order contains invalid lessons for this course",
    );
  }

  await tx.$executeRaw`
    UPDATE "lessons"
    SET "order_index" = "order_index" + ${LESSON_ORDER_RENUMBER_OFFSET}
    WHERE "course_id" = ${normalizedCourseId}
  `;

  for (const [index, lessonId] of orderedLessonIds.entries()) {
    const isTargetLesson = lessonId === targetLessonId;

    await tx.lesson.update({
      where: {
        id: lessonId,
      },
      data: isTargetLesson
        ? {
            ...(targetLessonData ?? {}),
            orderIndex: index + 1,
          }
        : {
            orderIndex: index + 1,
          },
    });
  }
};

export const mapCourseDetailResponse = (
  course: CourseDetailRecord,
  options: {
    isEnrolled: boolean;
    canViewQuizAnswers: boolean;
    canManageMaterials: boolean;
  },
) => {
  const canAccessPaidContent = options.isEnrolled || options.canManageMaterials;

  return {
    ...course,
    lessons: course.lessons.map((lesson) => {
      const canAccessLessonContent = lesson.isFree || canAccessPaidContent;

      return {
        ...lesson,
        videoUrl: canAccessLessonContent ? lesson.videoUrl : undefined,
        quiz: options.canViewQuizAnswers
          ? normalizeLessonQuiz(lesson.quiz)
          : canAccessLessonContent
            ? sanitizeLessonQuiz(normalizeLessonQuiz(lesson.quiz))
            : undefined,
      };
    }),
    materials: course.materials.map((material) => {
      const internalUploadPath = extractUploadPathFromUrlOrPath(
        material.fileUrl,
      );

      const canAccessMaterial = material.isDownloadable && canAccessPaidContent;

      return {
        ...material,
        fileUrl: options.canManageMaterials ? material.fileUrl : undefined,
        accessUrl: canAccessMaterial
          ? internalUploadPath
            ? `/api/${config.API_VERSION}/courses/materials/${material.id}/download`
            : material.fileUrl
          : undefined,
      };
    }),
    isEnrolled: options.isEnrolled,
  };
};

export const mapCourseQuizAttempt = (attempt: CourseQuizAttemptRecord) => ({
  id: attempt.id,
  lessonId: attempt.lessonId,
  lessonTitle: attempt.lesson.title,
  lessonOrderIndex: attempt.lesson.orderIndex,
  student: attempt.student,
  scorePercentage: attempt.scorePercentage,
  correctAnswers: attempt.correctAnswers,
  totalQuestions: attempt.totalQuestions,
  passed: attempt.passed,
  submittedAt: attempt.submittedAt,
  results: normalizeQuizAttemptResults(attempt.results),
});

export const attachEnrollmentCountsToTeacherCourses = async (
  courses: TeacherCourseRecord[],
  client: PrismaClientLike = prisma,
) => {
  if (!courses.length) {
    return courses;
  }

  const courseIds = Array.from(new Set(courses.map((course) => course.id)));

  const enrollments = await client.enrollment.findMany({
    where: buildCurrentEnrollmentWhere(
      {
        package: {
          courseId: {
            in: courseIds,
          },
        },
      },
      new Date(),
    ),
    select: {
      userId: true,
      package: {
        select: {
          courseId: true,
        },
      },
    },
  });

  const enrolledStudentIdsByCourseId = new Map<string, Set<string>>();

  for (const enrollment of enrollments) {
    const courseId = enrollment.package?.courseId;

    if (!courseId) {
      continue;
    }

    if (!enrolledStudentIdsByCourseId.has(courseId)) {
      enrolledStudentIdsByCourseId.set(courseId, new Set<string>());
    }

    enrolledStudentIdsByCourseId.get(courseId)!.add(enrollment.userId);
  }

  return courses.map((course) => ({
    ...course,
    _count: {
      ...course._count,
      enrollments: enrolledStudentIdsByCourseId.get(course.id)?.size ?? 0,
    },
  }));
};

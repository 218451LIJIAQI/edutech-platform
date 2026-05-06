import { CourseType, LessonType, Prisma } from "@prisma/client";
import { BadRequestError } from "../../utils/errors";
import { sanitizeUserPlainText } from "../../utils/sanitize-user-content";

export interface LessonQuizQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface LessonQuiz {
  questions: LessonQuizQuestion[];
}

export interface SanitizedLessonQuizQuestion {
  question: string;
  options: string[];
  explanation?: string;
}

export interface SanitizedLessonQuiz {
  questions: SanitizedLessonQuizQuestion[];
}

export interface QuizResultItem {
  question: string;
  options: string[];
  selectedOptionIndex: number;
  correctOptionIndex: number;
  isCorrect: boolean;
  explanation?: string;
}

type MoneyValue = Prisma.Decimal | number;

const decimalToNumber = (value: MoneyValue | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  return typeof value === "number" ? value : value.toNumber();
};

const roundMoney = (value: number): number => {
  return Number(value.toFixed(2));
};

const normalizeText = (value: string): string => sanitizeUserPlainText(value);

export const courseListInclude = {
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
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      finalPrice: true,
      discount: true,
    },
  },
  _count: {
    select: {
      lessons: true,
      materials: true,
    },
  },
} satisfies Prisma.CourseInclude;

export const buildPublishedCourseWhere = (
  filters: {
    category?: string;
    teacherId?: string;
    search?: string;
    courseType?: CourseType;
    minRating?: number;
    minPrice?: number;
    maxPrice?: number;
  } = {},
): Prisma.CourseWhereInput => {
  const whereClauses: Prisma.CourseWhereInput[] = [
    {
      isPublished: true,
    },
  ];

  const category = filters.category?.trim();
  const teacherId = filters.teacherId?.trim();
  const search = filters.search?.trim();

  if (filters.minPrice !== undefined && filters.minPrice < 0) {
    throw new BadRequestError("Minimum price cannot be negative");
  }

  if (filters.maxPrice !== undefined && filters.maxPrice < 0) {
    throw new BadRequestError("Maximum price cannot be negative");
  }

  if (
    filters.minPrice !== undefined &&
    filters.maxPrice !== undefined &&
    filters.minPrice > filters.maxPrice
  ) {
    throw new BadRequestError(
      "Minimum price cannot be greater than maximum price",
    );
  }

  if (
    filters.minRating !== undefined &&
    (filters.minRating < 0 || filters.minRating > 5)
  ) {
    throw new BadRequestError("Minimum rating must be between 0 and 5");
  }

  if (category) {
    whereClauses.push({
      category: {
        equals: category,
        mode: "insensitive",
      },
    });
  }

  if (teacherId) {
    whereClauses.push({
      OR: [
        {
          teacherProfileId: teacherId,
        },
        {
          teacherProfile: {
            is: {
              userId: teacherId,
            },
          },
        },
      ],
    });
  }

  if (filters.courseType) {
    whereClauses.push({
      courseType: filters.courseType,
    });
  }

  if (search) {
    whereClauses.push({
      OR: [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          category: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (filters.minRating !== undefined) {
    whereClauses.push({
      teacherProfile: {
        is: {
          averageRating: {
            gte: filters.minRating,
          },
        },
      },
    });
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    whereClauses.push({
      packages: {
        some: {
          isActive: true,
          ...(filters.minPrice !== undefined
            ? {
                finalPrice: {
                  gte: filters.minPrice,
                },
              }
            : {}),
          ...(filters.maxPrice !== undefined
            ? {
                finalPrice: {
                  lte: filters.maxPrice,
                },
              }
            : {}),
        },
      },
    });
  }

  return whereClauses.length === 1 ? whereClauses[0] : { AND: whereClauses };
};

export const buildCourseListOrderBy = (
  sortBy: "NEWEST" | "RATING" | "POPULARITY" | "PRICE_ASC" | "PRICE_DESC",
  sortOrder: "asc" | "desc",
): Prisma.CourseOrderByWithRelationInput | undefined => {
  if (sortBy === "NEWEST") {
    return {
      createdAt: sortOrder,
    };
  }

  if (sortBy === "RATING") {
    return {
      teacherProfile: {
        averageRating: "desc",
      },
    };
  }

  if (sortBy === "POPULARITY") {
    return {
      teacherProfile: {
        totalStudents: "desc",
      },
    };
  }

  return undefined;
};

export const paginateCoursesByPrice = <
  T extends {
    packages: Array<{
      finalPrice: MoneyValue;
    }>;
  },
>(
  courses: T[],
  pagination: {
    skip: number;
    limit: number;
  },
  sortBy: "PRICE_ASC" | "PRICE_DESC",
) => {
  return courses
    .map((course) => ({
      ...course,
      minPackagePrice: course.packages.length
        ? Math.min(
            ...course.packages.map((pkg) => decimalToNumber(pkg.finalPrice)),
          )
        : null,
    }))
    .sort((left, right) => {
      if (left.minPackagePrice === null) {
        return 1;
      }

      if (right.minPackagePrice === null) {
        return -1;
      }

      return sortBy === "PRICE_ASC"
        ? left.minPackagePrice - right.minPackagePrice
        : right.minPackagePrice - left.minPackagePrice;
    })
    .slice(pagination.skip, pagination.skip + pagination.limit)
    .map(({ minPackagePrice: _ignored, ...course }) => course);
};

export const normalizeLessonQuiz = (
  quiz: Prisma.JsonValue | null | undefined,
): LessonQuiz | null => {
  if (!quiz || typeof quiz !== "object" || Array.isArray(quiz)) {
    return null;
  }

  const candidate = quiz as {
    questions?: unknown;
  };

  if (!Array.isArray(candidate.questions)) {
    return null;
  }

  const questions = candidate.questions
    .map((entry): LessonQuizQuestion | null => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const question = entry as {
        question?: unknown;
        options?: unknown;
        correctOptionIndex?: unknown;
        explanation?: unknown;
      };

      if (
        typeof question.question !== "string" ||
        !Array.isArray(question.options) ||
        typeof question.correctOptionIndex !== "number" ||
        !Number.isInteger(question.correctOptionIndex)
      ) {
        return null;
      }

      const normalizedQuestion = normalizeText(question.question);
      const options = question.options.map((option) =>
        typeof option === "string" ? normalizeText(option) : null,
      );
      const explanation =
        typeof question.explanation === "string"
          ? normalizeText(question.explanation)
          : undefined;

      if (
        !normalizedQuestion ||
        options.length < 2 ||
        options.some((option) => !option) ||
        question.correctOptionIndex < 0 ||
        question.correctOptionIndex >= options.length
      ) {
        return null;
      }

      return {
        question: normalizedQuestion,
        options: options as string[],
        correctOptionIndex: question.correctOptionIndex,
        explanation: explanation || undefined,
      };
    })
    .filter((entry): entry is LessonQuizQuestion => Boolean(entry));

  return questions.length ? { questions } : null;
};

export const sanitizeLessonQuiz = (
  quiz: LessonQuiz | null,
): SanitizedLessonQuiz | null => {
  if (!quiz) {
    return null;
  }

  return {
    questions: quiz.questions.map((question) => ({
      question: question.question,
      options: question.options,
    })),
  };
};

const validateLessonQuiz = (quiz: LessonQuiz): LessonQuiz => {
  const normalized = normalizeLessonQuiz({
    questions: quiz.questions.map((question) => ({
      question: question.question,
      options: question.options,
      correctOptionIndex: question.correctOptionIndex,
      ...(question.explanation
        ? {
            explanation: question.explanation,
          }
        : {}),
    })),
  } as Prisma.JsonValue);

  if (!normalized) {
    throw new BadRequestError("Invalid quiz format");
  }

  return normalized;
};

export const toLessonQuizJson = (
  quiz: LessonQuiz | null | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined => {
  if (quiz === undefined) {
    return undefined;
  }

  if (quiz === null) {
    return Prisma.JsonNull;
  }

  const normalizedQuiz = validateLessonQuiz(quiz);

  return {
    questions: normalizedQuiz.questions.map((question) => ({
      question: question.question,
      options: question.options,
      correctOptionIndex: question.correctOptionIndex,
      ...(question.explanation
        ? {
            explanation: question.explanation,
          }
        : {}),
    })),
  } satisfies Prisma.InputJsonValue;
};

export const normalizeQuizAttemptResults = (
  results: Prisma.JsonValue,
): QuizResultItem[] => {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((entry): QuizResultItem | null => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const item = entry as {
        question?: unknown;
        options?: unknown;
        selectedOptionIndex?: unknown;
        correctOptionIndex?: unknown;
        isCorrect?: unknown;
        explanation?: unknown;
      };

      if (
        typeof item.question !== "string" ||
        !Array.isArray(item.options) ||
        typeof item.selectedOptionIndex !== "number" ||
        typeof item.correctOptionIndex !== "number" ||
        !Number.isInteger(item.selectedOptionIndex) ||
        !Number.isInteger(item.correctOptionIndex) ||
        typeof item.isCorrect !== "boolean"
      ) {
        return null;
      }

      const normalizedQuestion = normalizeText(item.question);
      const options = item.options.map((option) =>
        typeof option === "string" ? normalizeText(option) : null,
      );
      const explanation =
        typeof item.explanation === "string"
          ? normalizeText(item.explanation)
          : undefined;

      if (
        !normalizedQuestion ||
        options.length < 2 ||
        options.some((option) => !option) ||
        item.selectedOptionIndex < 0 ||
        item.selectedOptionIndex >= options.length ||
        item.correctOptionIndex < 0 ||
        item.correctOptionIndex >= options.length
      ) {
        return null;
      }

      return {
        question: normalizedQuestion,
        options: options as string[],
        selectedOptionIndex: item.selectedOptionIndex,
        correctOptionIndex: item.correctOptionIndex,
        isCorrect: item.isCorrect,
        explanation: explanation || undefined,
      };
    })
    .filter((entry): entry is QuizResultItem => Boolean(entry));
};

export const buildLessonUpdateData = (data: {
  title?: string;
  description?: string | null;
  type?: LessonType;
  duration?: number | null;
  videoUrl?: string | null;
  quiz?: LessonQuiz | null;
  isFree?: boolean;
  orderIndex?: number;
}) => {
  const updateData: Prisma.LessonUpdateInput = {};

  if (data.title !== undefined) {
    const title = normalizeText(data.title);

    if (!title) {
      throw new BadRequestError("Lesson title is required");
    }

    updateData.title = title;
  }

  if (data.description !== undefined) {
    updateData.description = data.description
      ? normalizeText(data.description) || null
      : null;
  }

  if (data.type !== undefined) {
    updateData.type = data.type;
  }

  if (data.duration !== undefined) {
    if (
      data.duration !== null &&
      (!Number.isInteger(data.duration) || data.duration <= 0)
    ) {
      throw new BadRequestError("Lesson duration must be a positive integer");
    }

    updateData.duration = data.duration;
  }

  if (data.videoUrl !== undefined) {
    updateData.videoUrl = data.videoUrl?.trim() || null;
  }

  if (data.quiz !== undefined) {
    updateData.quiz = toLessonQuizJson(data.quiz);
  }

  if (data.isFree !== undefined) {
    updateData.isFree = data.isFree;
  }

  if (data.orderIndex !== undefined) {
    if (!Number.isInteger(data.orderIndex) || data.orderIndex <= 0) {
      throw new BadRequestError(
        "Lesson order index must be a positive integer",
      );
    }

    updateData.orderIndex = data.orderIndex;
  }

  return updateData;
};

export const calculateFinalPrice = (price: number, discount = 0) => {
  if (!Number.isFinite(price) || price < 0) {
    throw new BadRequestError("Price must be a valid non-negative number");
  }

  if (!Number.isFinite(discount) || discount < 0) {
    throw new BadRequestError("Discount must be a valid non-negative number");
  }

  if (discount > price) {
    throw new BadRequestError("Discount cannot be greater than price");
  }

  return roundMoney(price - discount);
};

export const gradeLessonQuiz = (quiz: LessonQuiz, answers: number[]) => {
  const normalizedQuiz = validateLessonQuiz(quiz);

  if (!Array.isArray(answers)) {
    throw new BadRequestError("Quiz answers must be provided");
  }

  if (answers.length !== normalizedQuiz.questions.length) {
    throw new BadRequestError("Please answer every question before submitting");
  }

  const results = normalizedQuiz.questions.map((question, index) => {
    const selectedOptionIndex = answers[index];

    if (
      typeof selectedOptionIndex !== "number" ||
      !Number.isInteger(selectedOptionIndex) ||
      selectedOptionIndex < 0 ||
      selectedOptionIndex >= question.options.length
    ) {
      throw new BadRequestError(`Answer ${index + 1} is invalid`);
    }

    const isCorrect = selectedOptionIndex === question.correctOptionIndex;

    return {
      question: question.question,
      options: question.options,
      selectedOptionIndex,
      correctOptionIndex: question.correctOptionIndex,
      isCorrect,
      explanation: question.explanation,
    };
  });

  const correctAnswers = results.filter((result) => result.isCorrect).length;
  const totalQuestions = results.length;
  const scorePercentage =
    totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;
  const passPercentage = 70;

  return {
    results,
    correctAnswers,
    totalQuestions,
    scorePercentage,
    passPercentage,
    passed: scorePercentage >= passPercentage,
  };
};

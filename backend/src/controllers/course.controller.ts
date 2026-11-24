import { Request, Response } from "express";
import { CourseType, LessonType, LiveSessionStatus } from "@prisma/client";
import courseService, {
  COURSE_FIELD_LIMITS,
} from "../services/course.service";
import { BadRequestError } from "../utils/errors";
import asyncHandler from "../utils/async-handler";
import { sendProtectedAsset } from "../utils/protected-asset";
import {
  parseNullableNumber,
  parseNullableString,
  parseNumber,
  parseOptionalBoolean,
  parseOptionalEnum,
  parseOptionalString,
  parseQueryPositiveInt,
  parseRequiredEnum,
  parseRequiredNumber,
  parseRequiredParam,
  parseRequiredString,
  parseStringArray,
  requireAuthUserId,
  sendCreated,
  sendSuccess,
} from "../utils/http";

interface LessonQuizQuestionInput {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

interface LessonQuizInput {
  questions: LessonQuizQuestionInput[];
}

type SortBy = "NEWEST" | "RATING" | "POPULARITY" | "PRICE_ASC" | "PRICE_DESC";
type SortOrder = "asc" | "desc";

const ALLOWED_SORT_BY: readonly SortBy[] = [
  "NEWEST",
  "RATING",
  "POPULARITY",
  "PRICE_ASC",
  "PRICE_DESC",
] as const;
const SORT_ORDERS: readonly SortOrder[] = ["asc", "desc"] as const;
const MUTABLE_LIVE_SESSION_STATUSES = [
  LiveSessionStatus.ONGOING,
  LiveSessionStatus.COMPLETED,
  LiveSessionStatus.CANCELLED,
] as const;

const MAX_PAGE_LIMIT = 100;
const MAX_FEATURES = 30;
const MAX_URL_OR_PATH_LENGTH = 2048;

const parseQuiz = (value: unknown): LessonQuizInput | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestError("quiz must be an object with a questions array");
  }

  const quiz = value as { questions?: unknown };
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    throw new BadRequestError(
      "quiz.questions must contain at least one question",
    );
  }

  const questions = quiz.questions.map((question, index) => {
    if (!question || typeof question !== "object" || Array.isArray(question)) {
      throw new BadRequestError(`quiz.questions[${index}] must be an object`);
    }

    const item = question as {
      question?: unknown;
      options?: unknown;
      correctOptionIndex?: unknown;
      explanation?: unknown;
    };

    const questionText = parseRequiredString(
      item.question,
      `quiz.questions[${index}].question`,
    );

    if (!Array.isArray(item.options) || item.options.length < 2) {
      throw new BadRequestError(
        `quiz.questions[${index}].options must contain at least two options`,
      );
    }

    const options = item.options.map((option, optionIndex) =>
      parseRequiredString(
        option,
        `quiz.questions[${index}].options[${optionIndex}]`,
      ),
    );

    const correctOptionIndex = parseRequiredNumber(
      item.correctOptionIndex,
      `quiz.questions[${index}].correctOptionIndex`,
      { min: 0, max: options.length - 1, integer: true },
    );

    return {
      question: questionText,
      options,
      correctOptionIndex,
      explanation: parseOptionalString(
        item.explanation,
        `quiz.questions[${index}].explanation`,
      ),
    };
  });

  return { questions };
};

const parseQuizAnswers = (value: unknown): number[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestError("answers must be a non-empty array");
  }

  return value.map((answer, index) =>
    parseRequiredNumber(answer, `answers[${index}]`, {
      min: 0,
      integer: true,
    }),
  );
};

const validateDiscount = (price?: number, discount?: number | null): void => {
  if (
    discount !== undefined &&
    discount !== null &&
    price !== undefined &&
    discount > price
  ) {
    throw new BadRequestError("discount cannot be greater than price");
  }
};

class CourseController {
  getAllCourses = asyncHandler(async (req: Request, res: Response) => {
    const minPrice = parseNumber(req.query.minPrice, "minPrice", { min: 0 });
    const maxPrice = parseNumber(req.query.maxPrice, "maxPrice", { min: 0 });
    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      throw new BadRequestError("minPrice cannot be greater than maxPrice");
    }

    const result = await courseService.getAllCourses({
      category: parseOptionalString(req.query.category),
      teacherId: parseOptionalString(req.query.teacherId),
      search: parseOptionalString(req.query.search),
      courseType: parseOptionalEnum(
        req.query.courseType,
        CourseType,
        "courseType",
      ),
      minRating: parseNumber(req.query.minRating, "minRating", {
        min: 0,
        max: 5,
      }),
      minPrice,
      maxPrice,
      sortBy: parseOptionalEnum(req.query.sortBy, ALLOWED_SORT_BY, "sortBy"),
      sortOrder: parseOptionalEnum(
        req.query.sortOrder,
        SORT_ORDERS,
        "sortOrder",
      ),
      page: parseQueryPositiveInt(req.query.page, "page", {
        max: MAX_PAGE_LIMIT,
      }),
      limit: parseQueryPositiveInt(req.query.limit, "limit", {
        max: MAX_PAGE_LIMIT,
      }),
    });

    sendSuccess(res, result);
  });

  getCourseById = asyncHandler(async (req: Request, res: Response) => {
    const course = await courseService.getCourseById(
      parseRequiredParam(req.params.id, "Course ID"),
      req.user?.id,
    );
    sendSuccess(res, course);
  });

  createCourse = asyncHandler(async (req: Request, res: Response) => {
    const course = await courseService.createCourse(requireAuthUserId(req), {
      title: parseRequiredString(req.body?.title, "title", {
        maxLength: COURSE_FIELD_LIMITS.COURSE_TITLE_MAX,
      }),
      description: parseRequiredString(req.body?.description, "description", {
        maxLength: COURSE_FIELD_LIMITS.COURSE_DESCRIPTION_MAX,
      }),
      category: parseRequiredString(req.body?.category, "category", {
        maxLength: COURSE_FIELD_LIMITS.COURSE_CATEGORY_MAX,
      }),
      courseType: parseOptionalEnum(
        req.body?.courseType,
        CourseType,
        "courseType",
      ),
      thumbnail: parseOptionalString(
        req.body?.thumbnail,
        "thumbnail",
        MAX_URL_OR_PATH_LENGTH,
      ),
      previewVideoUrl: parseOptionalString(
        req.body?.previewVideoUrl,
        "previewVideoUrl",
        MAX_URL_OR_PATH_LENGTH,
      ),
    });

    sendCreated(res, course, "Course created successfully");
  });

  updateCourse = asyncHandler(async (req: Request, res: Response) => {
    const course = await courseService.updateCourse(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Course ID"),
      {
        title: parseOptionalString(req.body?.title, "title", {
          maxLength: COURSE_FIELD_LIMITS.COURSE_TITLE_MAX,
          rejectBlank: true,
          rejectNull: true,
        }),
        description: parseOptionalString(req.body?.description, "description", {
          maxLength: COURSE_FIELD_LIMITS.COURSE_DESCRIPTION_MAX,
          rejectBlank: true,
          rejectNull: true,
        }),
        category: parseOptionalString(req.body?.category, "category", {
          maxLength: COURSE_FIELD_LIMITS.COURSE_CATEGORY_MAX,
          rejectBlank: true,
          rejectNull: true,
        }),
        courseType: parseOptionalEnum(
          req.body?.courseType,
          CourseType,
          "courseType",
          { rejectNull: true, rejectBlank: true },
        ),
        thumbnail: parseNullableString(
          req.body?.thumbnail,
          "thumbnail",
          MAX_URL_OR_PATH_LENGTH,
        ),
        previewVideoUrl: parseNullableString(
          req.body?.previewVideoUrl,
          "previewVideoUrl",
          MAX_URL_OR_PATH_LENGTH,
        ),
        isPublished: parseOptionalBoolean(
          req.body?.isPublished,
          "isPublished",
          { rejectNull: true, rejectBlank: true },
        ),
      },
    );

    sendSuccess(res, course, "Course updated successfully");
  });

  deleteCourse = asyncHandler(async (req: Request, res: Response) => {
    const result = await courseService.deleteCourse(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Course ID"),
    );
    sendSuccess(res, undefined, result.message || "Course deleted successfully");
  });

  createLesson = asyncHandler(async (req: Request, res: Response) => {
    const lesson = await courseService.createLesson(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Course ID"),
      {
        title: parseRequiredString(req.body?.title, "title", {
          maxLength: COURSE_FIELD_LIMITS.LESSON_TITLE_MAX,
        }),
        description: parseOptionalString(
          req.body?.description,
          "description",
          COURSE_FIELD_LIMITS.LESSON_DESCRIPTION_MAX,
        ),
        type: parseRequiredEnum(req.body?.type, LessonType, "type"),
        duration: parseNumber(req.body?.duration, "duration", {
          min: 1,
          integer: true,
        }),
        videoUrl: parseOptionalString(
          req.body?.videoUrl,
          "videoUrl",
          MAX_URL_OR_PATH_LENGTH,
        ),
        quiz: parseQuiz(req.body?.quiz),
        isFree: parseOptionalBoolean(req.body?.isFree, "isFree", {
          rejectNull: true,
          rejectBlank: true,
        }),
      },
    );

    sendCreated(res, lesson, "Lesson created successfully");
  });

  updateLesson = asyncHandler(async (req: Request, res: Response) => {
    const lesson = await courseService.updateLesson(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Lesson ID"),
      {
        title: parseOptionalString(req.body?.title, "title", {
          maxLength: COURSE_FIELD_LIMITS.LESSON_TITLE_MAX,
          rejectBlank: true,
          rejectNull: true,
        }),
        description: parseNullableString(
          req.body?.description,
          "description",
          COURSE_FIELD_LIMITS.LESSON_DESCRIPTION_MAX,
        ),
        type: parseOptionalEnum(req.body?.type, LessonType, "type", {
          rejectNull: true,
          rejectBlank: true,
        }),
        duration: parseNullableNumber(req.body?.duration, "duration", {
          min: 1,
          integer: true,
        }),
        videoUrl: parseNullableString(
          req.body?.videoUrl,
          "videoUrl",
          MAX_URL_OR_PATH_LENGTH,
        ),
        quiz: parseQuiz(req.body?.quiz),
        isFree: parseOptionalBoolean(req.body?.isFree, "isFree", {
          rejectNull: true,
          rejectBlank: true,
        }),
        orderIndex: parseNumber(req.body?.orderIndex, "orderIndex", {
          min: 1,
          integer: true,
          rejectNull: true,
        }),
      },
    );

    sendSuccess(res, lesson, "Lesson updated successfully");
  });

  deleteLesson = asyncHandler(async (req: Request, res: Response) => {
    const result = await courseService.deleteLesson(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Lesson ID"),
    );
    sendSuccess(res, undefined, result.message || "Lesson deleted successfully");
  });

  submitLessonQuiz = asyncHandler(async (req: Request, res: Response) => {
    const result = await courseService.submitLessonQuiz(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Lesson ID"),
      parseQuizAnswers(req.body?.answers),
    );
    sendSuccess(res, result);
  });

  getCourseQuizAttempts = asyncHandler(async (req: Request, res: Response) => {
    const attempts = await courseService.getCourseQuizAttempts(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Course ID"),
    );
    sendSuccess(res, attempts);
  });

  getMyCourseQuizAttempts = asyncHandler(async (req: Request, res: Response) => {
    const attempts = await courseService.getMyCourseQuizAttempts(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Course ID"),
    );
    sendSuccess(res, attempts);
  });

  getCourseLiveSessions = asyncHandler(async (req: Request, res: Response) => {
    const sessions = await courseService.getCourseLiveSessions(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Course ID"),
    );
    sendSuccess(res, sessions);
  });

  createLiveSession = asyncHandler(async (req: Request, res: Response) => {
    const session = await courseService.createLiveSession(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Lesson ID"),
      {
        title: parseRequiredString(req.body?.title, "title", {
          maxLength: COURSE_FIELD_LIMITS.LIVE_SESSION_TITLE_MAX,
        }),
        description: parseOptionalString(
          req.body?.description,
          "description",
          COURSE_FIELD_LIMITS.LIVE_SESSION_DESCRIPTION_MAX,
        ),
        scheduledAt: parseRequiredString(req.body?.scheduledAt, "scheduledAt"),
        duration: parseNumber(req.body?.duration, "duration", {
          min: 1,
          integer: true,
        }),
        meetingUrl: parseOptionalString(
          req.body?.meetingUrl,
          "meetingUrl",
          MAX_URL_OR_PATH_LENGTH,
        ),
        maxParticipants: parseNumber(
          req.body?.maxParticipants,
          "maxParticipants",
          { min: 1, integer: true },
        ),
      },
    );
    sendCreated(res, session, "Live session scheduled successfully");
  });

  updateLiveSessionStatus = asyncHandler(
    async (req: Request, res: Response) => {
      const session = await courseService.updateLiveSessionStatus(
        requireAuthUserId(req),
        parseRequiredParam(req.params.id, "Session ID"),
        parseRequiredEnum(
          req.body?.status,
          MUTABLE_LIVE_SESSION_STATUSES,
          "status",
        ),
        parseNullableString(
          req.body?.recordingUrl,
          "recordingUrl",
          MAX_URL_OR_PATH_LENGTH,
        ),
      );
      sendSuccess(res, session, "Live session status updated successfully");
    },
  );

  createPackage = asyncHandler(async (req: Request, res: Response) => {
    const price = parseRequiredNumber(req.body?.price, "price", { min: 0 });
    const discount = parseNumber(req.body?.discount, "discount", { min: 0 });
    validateDiscount(price, discount);

    const lessonPackage = await courseService.createPackage(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Course ID"),
      {
        name: parseRequiredString(req.body?.name, "name", {
          maxLength: COURSE_FIELD_LIMITS.PACKAGE_NAME_MAX,
        }),
        description: parseOptionalString(
          req.body?.description,
          "description",
          COURSE_FIELD_LIMITS.PACKAGE_DESCRIPTION_MAX,
        ),
        price,
        discount,
        duration: parseNumber(req.body?.duration, "duration", {
          min: 1,
          integer: true,
        }),
        maxStudents: parseNumber(req.body?.maxStudents, "maxStudents", {
          min: 1,
          integer: true,
        }),
        features: parseStringArray(req.body?.features, "features", {
          maxItems: MAX_FEATURES,
        }),
      },
    );

    sendCreated(res, lessonPackage, "Package created successfully");
  });

  updatePackage = asyncHandler(async (req: Request, res: Response) => {
    const price = parseNumber(req.body?.price, "price", {
      min: 0,
      rejectNull: true,
    });
    const discount = parseNullableNumber(req.body?.discount, "discount", {
      min: 0,
    });
    validateDiscount(price, discount);

    const lessonPackage = await courseService.updatePackage(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Package ID"),
      {
        name: parseOptionalString(req.body?.name, "name", {
          maxLength: COURSE_FIELD_LIMITS.PACKAGE_NAME_MAX,
          rejectBlank: true,
          rejectNull: true,
        }),
        description: parseNullableString(
          req.body?.description,
          "description",
          COURSE_FIELD_LIMITS.PACKAGE_DESCRIPTION_MAX,
        ),
        price,
        discount,
        duration: parseNullableNumber(req.body?.duration, "duration", {
          min: 1,
          integer: true,
        }),
        maxStudents: parseNullableNumber(req.body?.maxStudents, "maxStudents", {
          min: 1,
          integer: true,
        }),
        features:
          req.body?.features === null
            ? []
            : parseStringArray(req.body?.features, "features", {
                maxItems: MAX_FEATURES,
              }),
        isActive: parseOptionalBoolean(req.body?.isActive, "isActive", {
          rejectNull: true,
          rejectBlank: true,
        }),
      },
    );

    sendSuccess(res, lessonPackage, "Package updated successfully");
  });

  deletePackage = asyncHandler(async (req: Request, res: Response) => {
    const result = await courseService.deletePackage(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Package ID"),
    );
    sendSuccess(
      res,
      undefined,
      result.message || "Package deleted successfully",
    );
  });

  uploadMaterial = asyncHandler(async (req: Request, res: Response) => {
    const material = await courseService.uploadMaterial(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Course ID"),
      {
        title: parseRequiredString(req.body?.title, "title", {
          maxLength: COURSE_FIELD_LIMITS.MATERIAL_TITLE_MAX,
        }),
        description: parseOptionalString(
          req.body?.description,
          "description",
          COURSE_FIELD_LIMITS.MATERIAL_DESCRIPTION_MAX,
        ),
        fileUrl: parseRequiredString(req.body?.fileUrl, "fileUrl", {
          maxLength: MAX_URL_OR_PATH_LENGTH,
        }),
        fileType: parseRequiredString(req.body?.fileType, "fileType", {
          maxLength: COURSE_FIELD_LIMITS.MATERIAL_FILE_TYPE_MAX,
        }),
        fileSize: parseRequiredNumber(req.body?.fileSize, "fileSize", {
          min: 0,
          integer: true,
        }),
        isDownloadable: parseOptionalBoolean(
          req.body?.isDownloadable,
          "isDownloadable",
          { rejectNull: true, rejectBlank: true },
        ),
      },
    );

    sendCreated(res, material, "Material uploaded successfully");
  });

  updateMaterial = asyncHandler(async (req: Request, res: Response) => {
    const material = await courseService.updateMaterial(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Material ID"),
      {
        title: parseOptionalString(req.body?.title, "title", {
          maxLength: COURSE_FIELD_LIMITS.MATERIAL_TITLE_MAX,
          rejectBlank: true,
          rejectNull: true,
        }),
        description: parseNullableString(
          req.body?.description,
          "description",
          COURSE_FIELD_LIMITS.MATERIAL_DESCRIPTION_MAX,
        ),
        fileUrl: parseOptionalString(req.body?.fileUrl, "fileUrl", {
          maxLength: MAX_URL_OR_PATH_LENGTH,
          rejectBlank: true,
          rejectNull: true,
        }),
        fileType: parseOptionalString(req.body?.fileType, "fileType", {
          maxLength: COURSE_FIELD_LIMITS.MATERIAL_FILE_TYPE_MAX,
          rejectBlank: true,
          rejectNull: true,
        }),
        fileSize: parseNumber(req.body?.fileSize, "fileSize", {
          min: 0,
          integer: true,
          rejectNull: true,
        }),
        isDownloadable: parseOptionalBoolean(
          req.body?.isDownloadable,
          "isDownloadable",
          { rejectNull: true, rejectBlank: true },
        ),
      },
    );

    sendSuccess(res, material, "Material updated successfully");
  });

  deleteMaterial = asyncHandler(async (req: Request, res: Response) => {
    const result = await courseService.deleteMaterial(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Material ID"),
    );
    sendSuccess(
      res,
      undefined,
      result.message || "Material deleted successfully",
    );
  });

  downloadMaterial = asyncHandler(async (req: Request, res: Response) => {
    const asset = await courseService.getMaterialDownloadAsset(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Material ID"),
    );

    sendProtectedAsset(res, asset, {
      disposition: "attachment",
      unavailableMessage: "Material file is unavailable",
    });
  });

  getMyCourses = asyncHandler(async (req: Request, res: Response) => {
    const courses = await courseService.getTeacherCourses(
      requireAuthUserId(req),
    );
    sendSuccess(res, courses);
  });

  getCategories = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await courseService.getCategories();
    sendSuccess(res, categories);
  });

  sendCourseNotification = asyncHandler(async (req: Request, res: Response) => {
    const result = await courseService.sendCourseNotification(
      requireAuthUserId(req),
      parseRequiredParam(req.params.id, "Course ID"),
      {
        title: parseRequiredString(req.body?.title, "title", {
          maxLength: COURSE_FIELD_LIMITS.NOTIFICATION_TITLE_MAX,
        }),
        message: parseRequiredString(req.body?.message, "message", {
          maxLength: COURSE_FIELD_LIMITS.NOTIFICATION_MESSAGE_MAX,
        }),
        type: parseOptionalString(req.body?.type, "type", 80),
      },
    );

    sendCreated(res, result, "Notification sent successfully");
  });
}

export default new CourseController();

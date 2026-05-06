import { Prisma, Review, UserRole } from "@prisma/client";
import prisma from "../config/database";
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from "../utils/errors";
import { isEnrollmentCurrentlyActive } from "./shared/enrollment-access";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";

const reviewWithRelationsInclude = {
  reviewer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
    },
  },
  enrollment: {
    include: {
      package: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ReviewInclude;

const reviewWithEnrollmentInclude = {
  enrollment: {
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
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ReviewInclude;

const reviewWithTeacherProfileInclude = {
  enrollment: {
    include: {
      package: {
        include: {
          course: {
            include: {
              teacherProfile: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ReviewInclude;

type ReviewWithRelations = Prisma.ReviewGetPayload<{
  include: typeof reviewWithRelationsInclude;
}>;

type ReviewWithEnrollment = Prisma.ReviewGetPayload<{
  include: typeof reviewWithEnrollmentInclude;
}>;

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

const MAX_COMMENT_LENGTH = 2000;

const normalizeRequiredText = (
  value: string | undefined,
  fieldName: string,
): string => {
  const normalizedValue =
    value === undefined ? undefined : sanitizeUserPlainText(value);

  if (!normalizedValue) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return normalizedValue;
};

const normalizeOptionalComment = (
  comment?: string,
): string | null | undefined => {
  if (comment === undefined) {
    return undefined;
  }

  const normalizedComment = sanitizeUserPlainText(comment);

  if (!normalizedComment) {
    return null;
  }

  if (normalizedComment.length > MAX_COMMENT_LENGTH) {
    throw new ValidationError(
      `Comment must not exceed ${MAX_COMMENT_LENGTH} characters`,
    );
  }

  return normalizedComment;
};

const normalizeRating = (rating: number): number => {
  if (!Number.isFinite(rating) || !Number.isInteger(rating)) {
    throw new ValidationError("Rating must be a whole number between 1 and 5");
  }

  if (rating < 1 || rating > 5) {
    throw new ValidationError("Rating must be a whole number between 1 and 5");
  }

  return rating;
};

const normalizeOptionalRating = (rating?: number): number | undefined =>
  rating === undefined ? undefined : normalizeRating(rating);

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "P2002";

const buildTeacherReviewWhere = (
  teacherProfileId: string,
): Prisma.ReviewWhereInput => ({
  isPublished: true,
  enrollment: {
    package: {
      course: {
        teacherProfileId,
      },
    },
  },
});

/**
 * Review Service
 * Handles course and teacher reviews.
 */
class ReviewService {
  /**
   * Create a review for a completed active enrollment.
   */
  async createReview(
    userId: string,
    enrollmentId: string,
    rating: number,
    comment?: string,
  ): Promise<Review> {
    const normalizedUserId = normalizeRequiredText(userId, "User ID");
    const normalizedEnrollmentId = normalizeRequiredText(
      enrollmentId,
      "Enrollment ID",
    );
    const normalizedRating = normalizeRating(rating);
    const normalizedComment = normalizeOptionalComment(comment);

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        id: normalizedEnrollmentId,
      },
      include: {
        package: {
          include: {
            course: {
              include: {
                teacherProfile: true,
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundError("Enrollment not found");
    }

    if (enrollment.userId !== normalizedUserId) {
      throw new AuthorizationError("You can only review your own enrollments");
    }

    if (!isEnrollmentCurrentlyActive(enrollment)) {
      throw new ValidationError(
        "Expired or inactive enrollments cannot be reviewed",
      );
    }

    if (enrollment.progress < 100) {
      throw new ValidationError(
        "Course must be completed before it can be reviewed",
      );
    }

    const teacherProfile = enrollment.package?.course?.teacherProfile;
    if (!teacherProfile) {
      throw new ValidationError("Course teacher profile is missing");
    }

    if (teacherProfile.userId === normalizedUserId) {
      throw new ValidationError("You cannot review your own course");
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const existingReview = await tx.review.findFirst({
          where: {
            reviewerId: normalizedUserId,
            enrollment: {
              package: {
                courseId: enrollment.package.course.id,
              },
            },
          },
          select: {
            id: true,
          },
        });

        if (existingReview) {
          throw new ValidationError("You have already reviewed this course");
        }

        const review = await tx.review.create({
          data: {
            enrollmentId: normalizedEnrollmentId,
            reviewerId: normalizedUserId,
            teacherId: teacherProfile.userId,
            rating: normalizedRating,
            comment: normalizedComment ?? null,
            isPublished: true,
          },
        });

        await this.updateTeacherRating(teacherProfile.id, tx);

        return review;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ValidationError("You have already reviewed this enrollment");
      }

      throw error;
    }
  }

  /**
   * Update a review owned by the current user.
   */
  async updateReview(
    userId: string,
    reviewId: string,
    rating?: number,
    comment?: string,
  ): Promise<Review> {
    const normalizedUserId = normalizeRequiredText(userId, "User ID");
    const normalizedReviewId = normalizeRequiredText(reviewId, "Review ID");
    const normalizedRating = normalizeOptionalRating(rating);
    const normalizedComment = normalizeOptionalComment(comment);

    if (normalizedRating === undefined && normalizedComment === undefined) {
      throw new ValidationError(
        "At least one review field must be provided for update",
      );
    }

    const review = await prisma.review.findUnique({
      where: {
        id: normalizedReviewId,
      },
      include: reviewWithTeacherProfileInclude,
    });

    if (!review) {
      throw new NotFoundError("Review not found");
    }

    if (review.reviewerId !== normalizedUserId) {
      throw new AuthorizationError("You can only update your own reviews");
    }

    const updateData: Prisma.ReviewUpdateInput = {
      ...(normalizedRating !== undefined ? { rating: normalizedRating } : {}),
      ...(normalizedComment !== undefined
        ? { comment: normalizedComment }
        : {}),
    };

    return prisma.$transaction(async (tx) => {
      const updated = await tx.review.update({
        where: {
          id: normalizedReviewId,
        },
        data: updateData,
      });

      if (normalizedRating !== undefined) {
        await this.updateTeacherRating(
          review.enrollment.package.course.teacherProfile.id,
          tx,
        );
      }

      return updated;
    });
  }

  /**
   * Delete a review owned by the current user.
   */
  async deleteReview(
    userId: string,
    reviewId: string,
  ): Promise<{ message: string }> {
    const normalizedUserId = normalizeRequiredText(userId, "User ID");
    const normalizedReviewId = normalizeRequiredText(reviewId, "Review ID");

    const review = await prisma.review.findUnique({
      where: {
        id: normalizedReviewId,
      },
      include: reviewWithTeacherProfileInclude,
    });

    if (!review) {
      throw new NotFoundError("Review not found");
    }

    if (review.reviewerId !== normalizedUserId) {
      throw new AuthorizationError("You can only delete your own reviews");
    }

    await prisma.$transaction(async (tx) => {
      await tx.review.delete({
        where: {
          id: normalizedReviewId,
        },
      });

      await this.updateTeacherRating(
        review.enrollment.package.course.teacherProfile.id,
        tx,
      );
    });

    return {
      message: "Review deleted successfully",
    };
  }

  /**
   * Get published reviews for a teacher.
   */
  async getTeacherReviews(
    teacherId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    reviews: ReviewWithRelations[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const normalizedTeacherId = normalizeRequiredText(teacherId, "Teacher ID");
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.floor(limit), 1), 100)
      : 10;
    const skip = (safePage - 1) * safeLimit;

    const teacher = await prisma.user.findUnique({
      where: {
        id: normalizedTeacherId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!teacher) {
      throw new NotFoundError("Teacher not found");
    }

    if (teacher.role !== UserRole.TEACHER) {
      throw new ValidationError("Selected user is not a teacher");
    }

    const where: Prisma.ReviewWhereInput = {
      teacherId: normalizedTeacherId,
      isPublished: true,
    };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: safeLimit,
        include: reviewWithRelationsInclude,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.review.count({
        where,
      }),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Get published reviews for a specific course.
   */
  async getCourseReviews(
    courseId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    reviews: ReviewWithRelations[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const normalizedCourseId = normalizeRequiredText(courseId, "Course ID");
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.floor(limit), 1), 100)
      : 10;
    const skip = (safePage - 1) * safeLimit;

    const course = await prisma.course.findUnique({
      where: {
        id: normalizedCourseId,
      },
      select: {
        id: true,
      },
    });

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    const where: Prisma.ReviewWhereInput = {
      isPublished: true,
      enrollment: {
        package: {
          courseId: normalizedCourseId,
        },
      },
    };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: safeLimit,
        include: reviewWithRelationsInclude,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.review.count({
        where,
      }),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Get reviews submitted by a user.
   */
  async getUserReviews(userId: string): Promise<ReviewWithEnrollment[]> {
    const normalizedUserId = normalizeRequiredText(userId, "User ID");

    return prisma.review.findMany({
      where: {
        reviewerId: normalizedUserId,
      },
      include: reviewWithEnrollmentInclude,
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Update a teacher profile's average rating using published reviews only.
   */
  private async updateTeacherRating(
    teacherProfileId: string,
    client: PrismaClientLike = prisma,
  ): Promise<void> {
    const ratingAggregate = await client.review.aggregate({
      where: buildTeacherReviewWhere(teacherProfileId),
      _avg: {
        rating: true,
      },
    });

    const averageRating = ratingAggregate._avg.rating
      ? Math.round(ratingAggregate._avg.rating * 100) / 100
      : 0;

    await client.teacherProfile.update({
      where: {
        id: teacherProfileId,
      },
      data: {
        averageRating,
      },
    });
  }
}

export default new ReviewService();

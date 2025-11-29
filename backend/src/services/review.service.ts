import prisma from '../config/database';
import type { Review, Enrollment, LessonPackage, Course, TeacherProfile } from '@prisma/client';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from '../utils/errors';

// Type definitions for reviews with relations
type ReviewWithRelations = Review & {
  reviewer: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  enrollment: Enrollment & {
    package: LessonPackage & {
      course: {
        title: string;
      };
    };
  };
};

type ReviewWithEnrollment = Review & {
  enrollment: Enrollment & {
    package: LessonPackage & {
      course: Course & {
        teacherProfile: TeacherProfile & {
          user: {
            firstName: string;
            lastName: string;
            avatar: string | null;
          };
        };
      };
    };
  };
};

/**
 * Review Service
 * Handles course and teacher reviews
 */
class ReviewService {
  /**
   * Create a review for an enrollment
   */
  async createReview(
    userId: string,
    enrollmentId: string,
    rating: number,
    comment?: string
  ): Promise<Review> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    if (!enrollmentId || !enrollmentId.trim()) {
      throw new ValidationError('Enrollment ID is required');
    }
    // Verify enrollment exists and belongs to user
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId.trim() },
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
      throw new NotFoundError('Enrollment not found');
    }

    if (enrollment.userId !== userId.trim()) {
      throw new AuthorizationError('You can only review your own enrollments');
    }

    if (!enrollment.package?.course?.teacherProfile) {
      throw new ValidationError('Course teacher profile is missing');
    }

    // Validate rating (1-5)
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new ValidationError('Rating must be a number between 1 and 5');
    }

    // Check if review already exists (one review per enrollment)
    const existingReview = await prisma.review.findUnique({
      where: { enrollmentId },
    });

    if (existingReview) {
      throw new ValidationError('You have already reviewed this course');
    }

    // Create review (default publish)
    const review = await prisma.review.create({
      data: {
        enrollmentId: enrollmentId.trim(),
        reviewerId: userId.trim(),
        teacherId: enrollment.package.course.teacherProfile.userId,
        rating,
        comment,
        isPublished: true,
      },
    });

    // Update teacher's average rating
    await this.updateTeacherRating(enrollment.package.course.teacherProfile.id);

    return review;
  }

  /**
   * Update a review
   */
  async updateReview(
    userId: string,
    reviewId: string,
    rating?: number,
    comment?: string
  ): Promise<Review> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    if (!reviewId || !reviewId.trim()) {
      throw new ValidationError('Review ID is required');
    }
    const review = await prisma.review.findUnique({
      where: { id: reviewId.trim() },
      include: {
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
      },
    });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (review.reviewerId !== userId.trim()) {
      throw new AuthorizationError('You can only update your own reviews');
    }

    if (rating !== undefined) {
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        throw new ValidationError('Rating must be a number between 1 and 5');
      }
    }

    const updateData: { rating?: number; comment?: string | null } = {};
    if (rating !== undefined) {
      updateData.rating = rating;
    }
    if (comment !== undefined) {
      updateData.comment = comment || null;
    }

    const updated = await prisma.review.update({
      where: { id: reviewId.trim() },
      data: updateData,
    });

    // Update teacher's average rating
    await this.updateTeacherRating(
      review.enrollment.package.course.teacherProfile.id
    );

    return updated;
  }

  /**
   * Delete a review
   */
  async deleteReview(userId: string, reviewId: string): Promise<{ message: string }> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    if (!reviewId || !reviewId.trim()) {
      throw new ValidationError('Review ID is required');
    }
    const review = await prisma.review.findUnique({
      where: { id: reviewId.trim() },
      include: {
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
      },
    });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (review.reviewerId !== userId.trim()) {
      throw new AuthorizationError('You can only delete your own reviews');
    }

    await prisma.review.delete({
      where: { id: reviewId.trim() },
    });

    // Update teacher's average rating
    await this.updateTeacherRating(
      review.enrollment.package.course.teacherProfile.id
    );

    return { message: 'Review deleted successfully' };
  }

  /**
   * Get reviews for a teacher
   */
  async getTeacherReviews(
    teacherId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    reviews: ReviewWithRelations[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    if (!teacherId || !teacherId.trim()) {
      throw new ValidationError('Teacher ID is required');
    }
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.floor(limit), 1), 100)
      : 10;

    const skip = (safePage - 1) * safeLimit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          teacherId: teacherId.trim(),
          isPublished: true,
        },
        skip,
        take: safeLimit,
        include: {
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
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({
        where: {
          teacherId: teacherId.trim(),
          isPublished: true,
        },
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
   * Get user's reviews
   */
  async getUserReviews(userId: string): Promise<ReviewWithEnrollment[]> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const reviews = await prisma.review.findMany({
      where: { reviewerId: userId.trim() },
      include: {
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews;
  }

  /**
   * Update teacher's average rating
   */
  private async updateTeacherRating(teacherProfileId: string): Promise<void> {
    const reviews = await prisma.review.findMany({
      where: {
        enrollment: {
          package: {
            course: {
              teacherProfileId,
            },
          },
        },
        isPublished: true,
      },
      select: {
        rating: true,
      },
    });

    const averageRating =
      reviews.length > 0
        ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length) * 100) / 100
        : 0;

    await prisma.teacherProfile.update({
      where: { id: teacherProfileId },
      data: { averageRating },
    });
  }
}

export default new ReviewService();

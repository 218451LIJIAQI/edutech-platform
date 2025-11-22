import prisma from '../config/database';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from '../utils/errors';

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
  ) {
    // Verify enrollment exists and belongs to user
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
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

    if (enrollment.userId !== userId) {
      throw new AuthorizationError('You can only review your own enrollments');
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: { enrollmentId },
    });

    if (existingReview) {
      throw new ValidationError('You have already reviewed this course');
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        enrollmentId,
        reviewerId: userId,
        teacherId: enrollment.package.course.teacherProfile.userId,
        rating,
        comment,
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
  ) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
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

    if (review.reviewerId !== userId) {
      throw new AuthorizationError('You can only update your own reviews');
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: rating !== undefined ? rating : review.rating,
        comment: comment !== undefined ? comment : review.comment,
      },
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
  async deleteReview(userId: string, reviewId: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
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

    if (review.reviewerId !== userId) {
      throw new AuthorizationError('You can only delete your own reviews');
    }

    await prisma.review.delete({
      where: { id: reviewId },
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
  ) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          teacherId,
          isPublished: true,
        },
        skip,
        take: limit,
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
          teacherId,
          isPublished: true,
        },
      }),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user's reviews
   */
  async getUserReviews(userId: string) {
    const reviews = await prisma.review.findMany({
      where: { reviewerId: userId },
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
  private async updateTeacherRating(teacherProfileId: string) {
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
    });

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;

    await prisma.teacherProfile.update({
      where: { id: teacherProfileId },
      data: { averageRating },
    });
  }
}

export default new ReviewService();


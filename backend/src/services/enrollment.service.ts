import prisma from '../config/database';
import { NotFoundError, AuthorizationError } from '../utils/errors';

/**
 * Enrollment Service
 * Handles student enrollments and course progress
 */
class EnrollmentService {
  /**
   * Get user's enrollments
   */
  async getUserEnrollments(userId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId, isActive: true },
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
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments;
  }

  /**
   * Get enrollment by ID (scoped to the requesting user)
   */
  async getEnrollmentById(enrollmentId: string, userId: string) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, userId },
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
                  orderBy: { orderIndex: 'asc' },
                },
                materials: true,
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      // Use NotFound to avoid leaking whether an enrollment exists for another user
      throw new NotFoundError('Enrollment not found');
    }

    return enrollment;
  }

  /**
   * Update enrollment progress
   */
  async updateProgress(
    enrollmentId: string,
    userId: string,
    completedLessons: number,
    progress: number
  ) {
    // Scope lookup by id and userId to prevent accessing others' records
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, userId },
      include: { package: { select: { courseId: true } } },
    });

    if (!enrollment) {
      throw new NotFoundError('Enrollment not found');
    }

    // Determine total lessons for the course to bound completedLessons
    const totalLessons = await prisma.lesson.count({
      where: { courseId: enrollment.package.courseId },
    });

    const safeCompleted = Number.isFinite(completedLessons) ? Math.floor(completedLessons) : 0;
    const boundedCompleted = Math.max(0, Math.min(safeCompleted, totalLessons));

    const safeProgress = Number.isFinite(progress) ? progress : 0;
    const boundedProgress = Math.min(Math.max(safeProgress, 0), 100); // Ensure progress is between 0-100

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        completedLessons: boundedCompleted,
        progress: boundedProgress,
      },
    });

    return updated;
  }

  /**
   * Check if user has access to course
   */
  async checkAccess(userId: string, courseId: string) {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        package: {
          courseId,
        },
        isActive: true,
      },
    });

    return !!enrollment;
  }

  /**
   * Get course students (Teacher only)
   */
  async getCourseStudents(userId: string, courseId: string) {
    // Verify teacher owns the course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { teacherProfile: true },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (!course.teacherProfile || course.teacherProfile.userId !== userId) {
      throw new AuthorizationError('You can only view your own course students');
    }

    // Get enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: {
        package: {
          courseId,
        },
        isActive: true,
      },
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
            name: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments;
  }

  /**
   * Get enrollment statistics for a course (Teacher only)
   */
  async getCourseStats(userId: string, courseId: string) {
    // Verify teacher owns the course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { teacherProfile: true },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (!course.teacherProfile || course.teacherProfile.userId !== userId) {
      throw new AuthorizationError('You can only view your own course statistics');
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        package: {
          courseId,
        },
        isActive: true,
      },
    });

    const totalStudents = enrollments.length;
    const averageProgress =
      enrollments.reduce((sum, e) => sum + e.progress, 0) / totalStudents || 0;
    const completionRate =
      enrollments.filter((e) => e.progress === 100).length / totalStudents || 0;

    return {
      totalStudents,
      averageProgress: Math.round(averageProgress),
      completionRate: Math.round(completionRate * 100),
    };
  }
}

export default new EnrollmentService();

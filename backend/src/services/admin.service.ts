import { UserRole, VerificationStatus, ReportStatus, PaymentStatus } from '@prisma/client';
import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';

/**
 * Admin Service
 * Handles administrative functions
 */
class AdminService {
  /**
   * Get platform statistics
   */
  async getPlatformStats() {
    const [
      totalUsers,
      totalTeachers,
      totalStudents,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      totalRevenue,
      pendingVerifications,
      openReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRole.TEACHER } }),
      prisma.user.count({ where: { role: UserRole.STUDENT } }),
      prisma.course.count(),
      prisma.course.count({ where: { isPublished: true } }),
      prisma.enrollment.count(),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      }),
      prisma.teacherVerification.count({ where: { status: VerificationStatus.PENDING } }),
      prisma.report.count({ where: { status: ReportStatus.OPEN } }),
    ]);

    // Get revenue data for last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyRevenue = await prisma.payment.groupBy({
      by: ['createdAt'],
      where: {
        status: PaymentStatus.COMPLETED,
        createdAt: { gte: twelveMonthsAgo },
      },
      _sum: {
        amount: true,
        platformCommission: true,
      },
    });

    // Get growth metrics
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [newUsersThisMonth, newCoursesThisMonth, enrollmentsThisMonth] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: lastMonth } } }),
      prisma.course.count({ where: { createdAt: { gte: lastMonth } } }),
      prisma.enrollment.count({ where: { enrolledAt: { gte: lastMonth } } }),
    ]);

    return {
      overview: {
        totalUsers,
        totalTeachers,
        totalStudents,
        totalCourses,
        publishedCourses,
        totalEnrollments,
        totalRevenue: totalRevenue._sum.amount || 0,
        pendingVerifications,
        openReports,
      },
      growth: {
        newUsersThisMonth,
        newCoursesThisMonth,
        enrollmentsThisMonth,
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        monthly: monthlyRevenue,
      },
    };
  }

  /**
   * Get all users with filters
   */
  async getAllUsers(filters: {
    role?: UserRole;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { role, isActive, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatar: true,
          isActive: true,
          createdAt: true,
          teacherProfile: {
            select: {
              isVerified: true,
              totalStudents: true,
              averageRating: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID with detailed information
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teacherProfile: {
          include: {
            courses: {
              include: {
                _count: {
                  select: { lessons: true, packages: true },
                },
              },
            },
            certifications: true,
            verifications: true,
          },
        },
        enrollments: {
          include: {
            package: {
              include: {
                course: {
                  select: {
                    title: true,
                    thumbnail: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          where: { status: PaymentStatus.COMPLETED },
        },
        reviewsGiven: true,
        reviewsReceived: true,
        reportsSubmitted: true,
        reportsAgainst: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Update user status (activate/deactivate)
   */
  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new ValidationError('Cannot modify admin user status');
    }

    return await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
  }

  /**
   * Delete user (soft delete by deactivating)
   */
  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new ValidationError('Cannot delete admin user');
    }

    // Check if teacher has active students
    if (user.role === UserRole.TEACHER) {
      const activeEnrollments = await prisma.enrollment.count({
        where: {
          package: {
            course: {
              teacherProfile: {
                userId: userId,
              },
            },
          },
          isActive: true,
        },
      });

      if (activeEnrollments > 0) {
        throw new ValidationError('Cannot delete teacher with active students');
      }
    }

    // Soft delete by deactivating
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  /**
   * Get all courses with filters
   */
  async getAllCourses(filters: {
    isPublished?: boolean;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const { isPublished, category, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (isPublished !== undefined) where.isPublished = isPublished;
    if (category) where.category = category;

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        include: {
          teacherProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              lessons: true,
              packages: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.count({ where }),
    ]);

    return {
      courses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update course status
   */
  async updateCourseStatus(courseId: string, isPublished: boolean) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    return await prisma.course.update({
      where: { id: courseId },
      data: { isPublished },
    });
  }

  /**
   * Delete course
   */
  async deleteCourse(courseId: string) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Check for active enrollments
    const activeEnrollments = await prisma.enrollment.count({
      where: {
        package: { courseId },
        isActive: true,
      },
    });

    if (activeEnrollments > 0) {
      throw new ValidationError('Cannot delete course with active enrollments');
    }

    await prisma.course.delete({ where: { id: courseId } });
  }

  /**
   * Get all verifications
   */
  async getAllVerifications(filters: {
    status?: VerificationStatus;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const [verifications, total] = await Promise.all([
      prisma.teacherVerification.findMany({
        where,
        skip,
        take: limit,
        include: {
          teacherProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.teacherVerification.count({ where }),
    ]);

    return {
      verifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Review verification
   */
  async reviewVerification(
    verificationId: string,
    adminId: string,
    status: VerificationStatus,
    reviewNotes?: string
  ) {
    const verification = await prisma.teacherVerification.findUnique({
      where: { id: verificationId },
      include: { teacherProfile: true },
    });

    if (!verification) {
      throw new NotFoundError('Verification not found');
    }

    const updated = await prisma.teacherVerification.update({
      where: { id: verificationId },
      data: {
        status,
        reviewedBy: adminId,
        reviewNotes,
        reviewedAt: new Date(),
      },
    });

    // Update teacher verified status
    if (status === VerificationStatus.APPROVED) {
      await prisma.teacherProfile.update({
        where: { id: verification.teacherProfileId },
        data: { isVerified: true },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: verification.teacherProfile.userId,
          title: 'Verification Approved',
          message: 'Congratulations! Your teacher verification has been approved.',
          type: 'verification',
        },
      });
    } else if (status === VerificationStatus.REJECTED) {
      await prisma.notification.create({
        data: {
          userId: verification.teacherProfile.userId,
          title: 'Verification Rejected',
          message: `Your verification request has been rejected. Reason: ${reviewNotes || 'Not specified'}`,
          type: 'verification',
        },
      });
    }

    return updated;
  }

  /**
   * Get all reports
   */
  async getAllReports(filters: {
    status?: ReportStatus;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, type, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        include: {
          reporter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reported: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.report.count({ where }),
    ]);

    return {
      reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update report status
   */
  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    resolution?: string
  ) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        resolution,
        resolvedAt: status === ReportStatus.RESOLVED ? new Date() : null,
      },
    });

    // Notify reporter
    await prisma.notification.create({
      data: {
        userId: report.reporterId,
        title: 'Report Updated',
        message: `Your report has been ${status.toLowerCase()}. ${resolution || ''}`,
        type: 'report',
      },
    });

    return updated;
  }

  /**
   * Get financial statistics
   */
  async getFinancials(startDate?: Date, endDate?: Date) {
    const where: any = { status: PaymentStatus.COMPLETED };

    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = startDate;
      if (endDate) where.paidAt.lte = endDate;
    }

    const [payments, totals] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
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
        orderBy: { paidAt: 'desc' },
        take: 100,
      }),
      prisma.payment.aggregate({
        where,
        _sum: {
          amount: true,
          platformCommission: true,
          teacherEarning: true,
        },
        _count: true,
      }),
    ]);

    return {
      totals: {
        totalRevenue: totals._sum.amount || 0,
        platformEarnings: totals._sum.platformCommission || 0,
        teacherEarnings: totals._sum.teacherEarning || 0,
        transactionCount: totals._count,
      },
      recentPayments: payments,
    };
  }

  /**
   * Get recent platform activities
   * Note: Do NOT split the limit across categories; fetch up to `limit` from each
   * and combine, then slice to preserve true recency order across all types.
   */
  async getRecentActivities(limit: number = 20) {
    const take = Math.max(1, Math.min(limit, 50));

    const [recentUsers, recentCourses, recentEnrollments, recentReports, recentPayments] = await Promise.all([
      prisma.user.findMany({
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.course.findMany({
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          teacherProfile: {
            select: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.enrollment.findMany({
        take,
        orderBy: { enrolledAt: 'desc' },
        select: {
          id: true,
          enrolledAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          package: {
            select: {
              course: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      }),
      prisma.report.findMany({
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          reporter: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.payment.findMany({
        where: { status: PaymentStatus.COMPLETED },
        take,
        orderBy: { paidAt: 'desc' },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          user: { select: { firstName: true, lastName: true } },
          package: { select: { course: { select: { title: true } } } },
        },
      }),
    ]);

    // Combine and sort all activities
    const activities = [
      ...recentUsers.map((u) => ({
        type: 'user_registered',
        data: u,
        timestamp: u.createdAt,
      })),
      ...recentCourses.map((c) => ({
        type: 'course_created',
        data: c,
        timestamp: c.createdAt,
      })),
      ...recentEnrollments.map((e) => ({
        type: 'enrollment_created',
        data: e,
        timestamp: e.enrolledAt,
      })),
      ...recentReports.map((r) => ({
        type: 'report_submitted',
        data: r,
        timestamp: r.createdAt,
      })),
      ...recentPayments.map((p) => ({
        type: 'payment_completed',
        data: p,
        timestamp: p.paidAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime())
      .slice(0, limit);

    return activities;
  }
}

export default new AdminService();


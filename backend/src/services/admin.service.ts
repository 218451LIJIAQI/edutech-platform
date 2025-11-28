import { UserRole, VerificationStatus, ReportStatus, PaymentStatus } from '@prisma/client';
import prisma from '../config/database';
import config from '../config/env';
import { NotFoundError, ValidationError } from '../utils/errors';

/**
 * Admin Service
 * Handles administrative functions
 */
class AdminService {
  /** Recalculate and persist teacher's totalStudents based on distinct enrolled students */
  private async recalculateTeacherStudentCount(teacherUserId: string) {
    const teacherProfile = await prisma.teacherProfile.findUnique({ where: { userId: teacherUserId } });
    if (!teacherProfile) return;

    const enrollments = await prisma.enrollment.findMany({
      where: {
        package: {
          course: { teacherProfileId: teacherProfile.id },
        },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    await prisma.teacherProfile.update({
      where: { id: teacherProfile.id },
      data: { totalStudents: enrollments.length },
    });
  }
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
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: UserRole.TEACHER, isActive: true } }),
      prisma.user.count({ where: { role: UserRole.STUDENT, isActive: true } }),
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

    // Build revenue data for last 12 months (YYYY-MM) using paidAt
    const now = new Date();
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(label);
    }

    const paymentsLast12 = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) },
      },
      select: { amount: true, paidAt: true },
    });

    const monthlyMap = new Map<string, number>();
    months.forEach((m) => monthlyMap.set(m, 0));
    for (const p of paymentsLast12) {
      if (!p.paidAt) continue;
      const label = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(label, (monthlyMap.get(label) || 0) + p.amount);
    }

    const monthly = months.map((m) => ({ month: m, revenue: monthlyMap.get(m) || 0 }));

    // Growth metrics (last 30 days)
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [newUsersThisMonth, newCoursesThisMonth, enrollmentsThisMonth] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: last30Days } } }),
      prisma.course.count({ where: { createdAt: { gte: last30Days } } }),
      prisma.enrollment.count({ where: { enrolledAt: { gte: last30Days } } }),
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
        monthly,
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
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isLocked?: boolean;
    createdAfter?: Date;
    createdBefore?: Date;
  }) {
    const { 
      role, 
      isActive, 
      search, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isLocked,
      createdAfter,
      createdBefore,
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    if (isLocked !== undefined) where.isLocked = isLocked;
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) where.createdAt.gte = createdAfter;
      if (createdBefore) where.createdAt.lte = createdBefore;
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

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
          phone: true,
          address: true,
          department: true,
          role: true,
          avatar: true,
          isActive: true,
          isLocked: true,
          lastLoginAt: true,
          loginCount: true,
          createdAt: true,
          updatedAt: true,
          teacherProfile: {
            select: {
              isVerified: true,
              totalStudents: true,
              averageRating: true,
              totalEarnings: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
        orderBy,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: users,
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
   * Delete user (HARD DELETE from database)
   */
  async deleteUser(userId: string, options?: { force?: boolean }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new ValidationError('Cannot delete admin user');
    }

    // If deleting a student, capture impacted teachers before deletion
    let impactedTeacherUserIds: Set<string> = new Set();
    if (user.role === UserRole.STUDENT) {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        select: {
          package: { select: { course: { select: { teacherProfile: { select: { userId: true } } } } } },
        },
      });
      enrollments.forEach((e) => {
        const tId = e.package?.course?.teacherProfile?.userId;
        if (tId) impactedTeacherUserIds.add(tId);
      });
    }

    // Prevent deleting teacher with active students
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

      if (activeEnrollments > 0 && !options?.force) {
        throw new ValidationError('Cannot delete teacher with active students');
      }
      // if force=true, proceed; cascading FK will remove courses/enrollments
    }

    // Hard delete
    await prisma.user.delete({ where: { id: userId } });

    // Recalculate teacher totalStudents for impacted teachers after student deletion
    if (impactedTeacherUserIds.size > 0) {
      for (const tUserId of impactedTeacherUserIds) {
        await this.recalculateTeacherStudentCount(tUserId);
      }
    }
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
      // Create notification for rejection and keep record for admin auditing
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
   * Create a new user
   */
  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
    address?: string;
    department?: string;
    createdBy: string;
  }) {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ValidationError('Email already in use');
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        phone: data.phone,
        address: data.address,
        department: data.department,
        createdBy: data.createdBy,
      },
    });

    // Log the action
    await prisma.userAuditLog.create({
      data: {
        adminId: data.createdBy,
        userId: user.id,
        action: 'CREATE',
        newValues: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
    });

    return user;
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, data: any, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const oldValues = {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      address: user.address,
      department: user.department,
      email: user.email,
    };

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedBy: adminId,
      },
    });

    // Log the action
    await prisma.userAuditLog.create({
      data: {
        adminId,
        userId,
        action: 'UPDATE',
        oldValues,
        newValues: {
          firstName: updated.firstName,
          lastName: updated.lastName,
          phone: updated.phone,
          address: updated.address,
          department: updated.department,
          email: updated.email,
        },
      },
    });

    return updated;
  }

  /**
   * Reset user password
   */
  async resetUserPassword(userId: string, newPassword: string, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        password: newPassword,
        updatedBy: adminId,
      },
    });

    // Log the action
    await prisma.userAuditLog.create({
      data: {
        adminId,
        userId,
        action: 'RESET_PASSWORD',
        newValues: { password: '***' },
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: 'Password Reset',
        message: 'Your password has been reset by an administrator.',
        type: 'security',
      },
    });

    return updated;
  }

  /**
   * Lock/Unlock user account
   */
  async lockUserAccount(userId: string, lock: boolean, adminId: string, reason?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isLocked: lock,
        lockedUntil: lock ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
        updatedBy: adminId,
      },
    });

    // Log the action
    await prisma.userAuditLog.create({
      data: {
        adminId,
        userId,
        action: lock ? 'LOCK' : 'UNLOCK',
        reason,
        newValues: { isLocked: lock },
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: lock ? 'Account Locked' : 'Account Unlocked',
        message: lock
          ? `Your account has been locked. Reason: ${reason || 'Not specified'}`
          : 'Your account has been unlocked.',
        type: 'security',
      },
    });

    return updated;
  }

  /**
   * Batch delete users (HARD DELETE)
   */
  async batchDeleteUsers(userIds: string[]) {
    // Prevent deleting admin users
    const adminUsers = await prisma.user.findMany({
      where: { id: { in: userIds }, role: UserRole.ADMIN },
    });

    if (adminUsers.length > 0) {
      throw new ValidationError('Cannot delete admin users');
    }

    // Check for teachers with active students
    const teachers = await prisma.user.findMany({
      where: { id: { in: userIds }, role: UserRole.TEACHER },
      select: { id: true, firstName: true, lastName: true },
    });

    for (const teacher of teachers) {
      const activeEnrollments = await prisma.enrollment.count({
        where: {
          isActive: true,
          package: {
            course: {
              teacherProfile: {
                userId: teacher.id,
              },
            },
          },
        },
      });

      if (activeEnrollments > 0) {
        throw new ValidationError(
          `Cannot delete teacher ${teacher.firstName} ${teacher.lastName} with active students`
        );
      }
    }

    // Capture impacted teachers from students being deleted (to refresh their totalStudents)
    const studentsToDelete = await prisma.user.findMany({
      where: { id: { in: userIds }, role: UserRole.STUDENT },
      select: { id: true },
    });
    const studentIds = studentsToDelete.map((s) => s.id);
    const impactedTeacherUserIds = new Set<string>();
    if (studentIds.length > 0) {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: { in: studentIds } },
        select: {
          package: { select: { course: { select: { teacherProfile: { select: { userId: true } } } } } },
        },
      });
      for (const e of enrollments) {
        const tId = e.package?.course?.teacherProfile?.userId;
        if (tId) impactedTeacherUserIds.add(tId);
      }
    }

    // Hard delete
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    // Recalculate totalStudents for impacted teachers
    if (impactedTeacherUserIds.size > 0) {
      for (const tUserId of impactedTeacherUserIds) {
        await this.recalculateTeacherStudentCount(tUserId);
      }
    }

    // Optional: Do not write audit logs referencing deleted users to avoid FK/cascade
  }

  /**
   * Batch update user status
   */
  async batchUpdateUserStatus(userIds: string[], isActive: boolean, adminId: string) {
    // Prevent deactivating all admin users
    if (!isActive) {
      const adminCount = await prisma.user.count({
        where: { role: UserRole.ADMIN, isActive: true },
      });

      const adminInBatch = await prisma.user.count({
        where: { id: { in: userIds }, role: UserRole.ADMIN },
      });

      if (adminCount === adminInBatch) {
        throw new ValidationError('Cannot deactivate all admin users');
      }
    }

    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isActive, updatedBy: adminId },
    });

    // Log the action
    for (const userId of userIds) {
      await prisma.userAuditLog.create({
        data: {
          adminId,
          userId,
          action: isActive ? 'ACTIVATE' : 'DEACTIVATE',
        },
      });
    }
  }

  /**
   * Get user audit logs
   */
  async getUserAuditLogs(filters: {
    userId?: string;
    adminId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, adminId, action, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (adminId) where.adminId = adminId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.userAuditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          admin: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          user: {
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
      prisma.userAuditLog.count({ where }),
    ]);

    return {
      items: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get recent platform activities
   * Note: Do NOT split the limit across categories; fetch up to `limit` from each
   * and combine, then slice to preserve true recency order across all types.
   */
  async getRecentActivities(params?: { limit?: number; page?: number }) {
    const limit = Math.max(1, Math.min(params?.limit ?? 20, 50));
    const page = Math.max(1, params?.page ?? 1);

    // Fetch a sufficiently large pool to support pagination across categories
    const poolPerCategory = Math.min(200, Math.max(limit * page + 20, limit));

    const [recentUsers, recentCourses, recentEnrollments, recentReports, recentPayments] = await Promise.all([
      prisma.user.findMany({
        take: poolPerCategory,
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
        take: poolPerCategory,
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
        take: poolPerCategory,
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
        take: poolPerCategory,
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
        take: poolPerCategory,
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

    // Combine, normalize to a consistent shape, and sort by recency
    const raw = [
      ...recentUsers.map((u) => ({
        id: u.id,
        type: 'user_registered' as const,
        createdAt: u.createdAt,
        description: `${u.firstName || ''} ${u.lastName || ''} registered as ${u.role}`.trim(),
        user: { firstName: u.firstName || '', lastName: u.lastName || '' },
      })),
      ...recentCourses.map((c) => ({
        id: c.id,
        type: 'course_created' as const,
        createdAt: c.createdAt,
        description: `New course created: ${c.title}`,
        user: {
          firstName: c.teacherProfile?.user?.firstName || '',
          lastName: c.teacherProfile?.user?.lastName || '',
        },
      })),
      ...recentEnrollments.map((e) => ({
        id: e.id,
        type: 'enrollment_created' as const,
        createdAt: e.enrolledAt,
        description: `${e.user?.firstName || ''} ${e.user?.lastName || ''} enrolled in ${e.package?.course?.title || 'a course'}`.trim(),
        user: { firstName: e.user?.firstName || '', lastName: e.user?.lastName || '' },
      })),
      ...recentReports.map((r) => ({
        id: r.id,
        type: 'report_submitted' as const,
        createdAt: r.createdAt,
        description: `Report submitted: ${r.type} (${r.status})`,
        user: { firstName: r.reporter?.firstName || '', lastName: r.reporter?.lastName || '' },
      })),
      ...recentPayments.map((p) => ({
        id: p.id,
        type: 'payment_completed' as const,
        createdAt: p.paidAt || new Date(),
        description: `Payment completed: ${p.amount.toFixed(2)} for ${p.package?.course?.title || 'a course'}`,
        user: { firstName: p.user?.firstName || '', lastName: p.user?.lastName || '' },
      })),
    ];

    const ordered = raw.sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());
    const start = (page - 1) * limit;
    const items = ordered.slice(start, start + limit);

    const total = ordered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasMore = start + items.length < total;

    return { items, pagination: { total, page, limit, totalPages, hasMore } };
  }
  /**
   * List teacher commissions with pagination and search
   */
  async getTeacherCommissions(filters: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const where: any = {
      role: UserRole.TEACHER,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          teacherProfile: {
            select: {
              id: true,
              commissionRate: true,
              totalStudents: true,
              averageRating: true,
              totalEarnings: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a teacher's commission rate (percent). Pass null to reset to platform default.
   */
  async updateTeacherCommission(userId: string, adminId: string, commissionRate: number | null) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== UserRole.TEACHER) {
      throw new NotFoundError('Teacher not found');
    }

    if (commissionRate !== null) {
      if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
        throw new ValidationError('Commission rate must be between 0 and 100');
      }
    }

    const profile = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundError('Teacher profile not found');

    const updated = await prisma.teacherProfile.update({
      where: { id: profile.id },
      data: { commissionRate: commissionRate === null ? null : commissionRate },
    });

    // Audit log
    await prisma.userAuditLog.create({
      data: {
        adminId,
        userId,
        action: 'UPDATE_COMMISSION',
        newValues: { commissionRate },
      },
    });

    return updated;
  }

  /**
   * Get settlements aggregated by teacher within date range
   */
  async getSettlements(params?: { startDate?: Date; endDate?: Date; page?: number; limit?: number }) {
    const startDate = params?.startDate;
    const endDate = params?.endDate;
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.max(1, Math.min(params?.limit ?? 20, 100));

    const where: any = { status: PaymentStatus.COMPLETED };
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = startDate;
      if (endDate) where.paidAt.lte = endDate;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true } },
        package: { include: { course: { include: { teacherProfile: { include: { user: true } } } } } },
        order: {
          include: {
            items: {
              include: { package: { include: { course: { include: { teacherProfile: { include: { user: true } } } } } } },
            },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    type Row = {
      teacherUserId: string;
      teacherName: string;
      teacherEmail?: string;
      totalGross: number;
      platformCommission: number;
      teacherEarning: number;
      transactions: number;
    };

    const map = new Map<string, Row>();

    for (const p of payments) {
      if (p.packageId && p.package && p.package.course?.teacherProfile) {
        const tp = p.package.course.teacherProfile;
        const key = tp.userId;
        if (!map.has(key)) {
          map.set(key, {
            teacherUserId: key,
            teacherName: `${tp.user.firstName || ''} ${tp.user.lastName || ''}`.trim(),
            teacherEmail: tp.user.email || undefined,
            totalGross: 0,
            platformCommission: 0,
            teacherEarning: 0,
            transactions: 0,
          });
        }
        const row = map.get(key)!;
        row.totalGross += p.amount;
        row.platformCommission += p.platformCommission;
        row.teacherEarning += p.teacherEarning;
        row.transactions += 1;
      }

      if (p.orderId && p.order) {
        for (const item of p.order.items) {
          const course = item.package.course;
          if (!course?.teacherProfile) continue;
          const tp = course.teacherProfile;
          const key = tp.userId;
          if (!map.has(key)) {
            map.set(key, {
              teacherUserId: key,
              teacherName: `${tp.user.firstName || ''} ${tp.user.lastName || ''}`.trim(),
              teacherEmail: tp.user.email || undefined,
              totalGross: 0,
              platformCommission: 0,
              teacherEarning: 0,
              transactions: 0,
            });
          }
          const row = map.get(key)!;
          // Recompute per-item split using teacher commission rate if available; fallback to platform
          const rate = tp.commissionRate ?? config.PLATFORM_COMMISSION_RATE;
          const platformCommission = (item.finalPrice * rate) / 100;
          const teacherEarning = item.finalPrice - platformCommission;
          row.totalGross += item.finalPrice;
          row.platformCommission += platformCommission;
          row.teacherEarning += teacherEarning;
          row.transactions += 1;
        }
      }
    }

    const rows = Array.from(map.values()).sort((a, b) => b.teacherEarning - a.teacherEarning);
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = rows.slice(start, start + limit);

    return { items, pagination: { total, page, limit, totalPages } };
  }

  /**
   * Get invoices (payments list) in date range with pagination
   */
  async getInvoices(params?: { startDate?: Date; endDate?: Date; page?: number; limit?: number; search?: string }) {
    const startDate = params?.startDate;
    const endDate = params?.endDate;
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.max(1, Math.min(params?.limit ?? 20, 100));
    const search = params?.search;

    const where: any = { status: PaymentStatus.COMPLETED };
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = startDate;
      if (endDate) where.paidAt.lte = endDate;
    }

    // For search we support user name contains
    const userRelationFilter = search
      ? {
          is: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        }
      : undefined;

    if (userRelationFilter) {
      (where as any).user = userRelationFilter as any;
    }

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          package: { include: { course: { select: { title: true } } } },
          order: {
            include: {
              items: {
                include: { package: { include: { course: { select: { title: true } } } } },
              },
            },
          },
        },
        orderBy: { paidAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      items: payments,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get revenue analytics data for charts
   */
  async getRevenueAnalytics(params?: { startDate?: Date; endDate?: Date; groupBy?: 'day' | 'week' | 'month' }) {
    const { startDate, endDate, groupBy = 'day' } = params || {};

    const where: any = { status: PaymentStatus.COMPLETED };
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = startDate;
      if (endDate) where.paidAt.lte = endDate;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        package: { include: { course: { include: { teacherProfile: { include: { user: true } } } } } },
        order: {
          include: {
            items: {
              include: { package: { include: { course: { include: { teacherProfile: { include: { user: true } } } } } } },
            },
          },
        },
      },
    });

    // 1. Revenue Trend
    const trendMap = new Map<string, { date: string; totalRevenue: number; platformEarnings: number; teacherEarnings: number }>();

    const getGroupKey = (date: Date): string => {
      const d = new Date(date);
      if (groupBy === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (groupBy === 'week') {
        const firstDay = new Date(d.setDate(d.getDate() - d.getDay()));
        return `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    for (const p of payments) {
      if (!p.paidAt) continue;
      const key = getGroupKey(p.paidAt);
      if (!trendMap.has(key)) {
        trendMap.set(key, { date: key, totalRevenue: 0, platformEarnings: 0, teacherEarnings: 0 });
      }
      const entry = trendMap.get(key)!;
      entry.totalRevenue += p.amount;
      entry.platformEarnings += p.platformCommission;
      entry.teacherEarnings += p.teacherEarning;
    }
    const revenueTrend = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 2. Top Teachers & Courses & Breakdown
    const teacherMap = new Map<string, { id: string; name: string; earnings: number }>();
    const courseMap = new Map<string, { id: string; title: string; revenue: number }>();
    const breakdownMap = new Map<string, { type: string; revenue: number }>();

    const processItem = (item: { finalPrice: number }, course: any) => {
      if (!course || !course.teacherProfile) return;

      const teacher = course.teacherProfile.user;
      const teacherKey = teacher.id;
      const courseKey = course.id;
      const courseType = course.courseType;

      const rate = course.teacherProfile.commissionRate ?? config.PLATFORM_COMMISSION_RATE;
      const teacherEarning = item.finalPrice * (1 - rate / 100);

      // Top Teachers
      if (!teacherMap.has(teacherKey)) teacherMap.set(teacherKey, { id: teacherKey, name: `${teacher.firstName} ${teacher.lastName}`, earnings: 0 });
      teacherMap.get(teacherKey)!.earnings += teacherEarning;

      // Top Courses
      if (!courseMap.has(courseKey)) courseMap.set(courseKey, { id: courseKey, title: course.title, revenue: 0 });
      courseMap.get(courseKey)!.revenue += item.finalPrice;

      // Breakdown
      if (!breakdownMap.has(courseType)) breakdownMap.set(courseType, { type: courseType, revenue: 0 });
      breakdownMap.get(courseType)!.revenue += item.finalPrice;
    };

    for (const p of payments) {
      if (p.package && p.package.course) {
        processItem({ finalPrice: p.amount }, p.package.course);
      } else if (p.order && p.order.items) {
        for (const item of p.order.items) {
          if (item.package && item.package.course) {
            processItem(item, item.package.course);
          }
        }
      }
    }

    const topTeachers = Array.from(teacherMap.values()).sort((a, b) => b.earnings - a.earnings).slice(0, 5);
    const topCourses = Array.from(courseMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const revenueBreakdown = Array.from(breakdownMap.values());

    return { revenueTrend, topTeachers, topCourses, revenueBreakdown };
  }
}

export default new AdminService();


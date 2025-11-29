import { ReportStatus, ReportType, Prisma, Report } from '@prisma/client';
import prisma from '../config/database';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from '../utils/errors';

// Type definitions for reports with relations
type ReportWithUsers = Report & {
  reporter: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reported: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

type ReportWithReporter = Report & {
  reporter: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

type ReportWithReportedBasic = Report & {
  reported: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

/**
 * Report Service
 * Handles complaints and reports against teachers, courses, and community content
 */
class ReportService {
  /**
   * Submit a report
   * Supports reporting teachers, courses, and community content
   */
  async submitReport(
    reporterId: string,
    reportedId: string,
    type: ReportType,
    description: string,
    contentType?: string,
    contentId?: string
  ): Promise<ReportWithUsers> {
    // Validate inputs
    if (!reporterId || !reporterId.trim()) {
      throw new ValidationError('Reporter ID is required');
    }
    if (!reportedId || !reportedId.trim()) {
      throw new ValidationError('Reported ID is required');
    }
    if (!description || !description.trim()) {
      throw new ValidationError('Report description is required');
    }

    if (reporterId.trim() === reportedId.trim()) {
      throw new ValidationError('You cannot report yourself');
    }

    // Verify reported user exists
    const reportedUser = await prisma.user.findUnique({
      where: { id: reportedId.trim() },
    });

    if (!reportedUser) {
      throw new NotFoundError('Reported user not found');
    }

    // Verify reporter is a student
    const reporter = await prisma.user.findUnique({
      where: { id: reporterId.trim() },
    });

    if (!reporter || reporter.role !== 'STUDENT') {
      throw new ValidationError('Only students can submit reports');
    }

    // Validate content if contentType is provided
    if (contentType && contentId) {
      const trimmedContentType = contentType.trim();
      const trimmedContentId = contentId.trim();
      
      if (!trimmedContentId) {
        throw new ValidationError('Content ID is required when content type is provided');
      }
      
      if (trimmedContentType === 'course') {
        const course = await prisma.course.findUnique({ where: { id: trimmedContentId } });
        if (!course) throw new NotFoundError('Course not found');
      } else if (trimmedContentType === 'community_post') {
        const post = await prisma.communityPost.findUnique({ where: { id: trimmedContentId } });
        if (!post) throw new NotFoundError('Community post not found');
      } else if (trimmedContentType === 'community_comment') {
        const comment = await prisma.communityComment.findUnique({ where: { id: trimmedContentId } });
        if (!comment) throw new NotFoundError('Community comment not found');
      } else if (trimmedContentType) {
        throw new ValidationError(`Invalid content type: ${trimmedContentType}`);
      }
    }

    // Create report (persist content reference if provided)
    const report = await prisma.report.create({
      data: {
        reporterId: reporterId.trim(),
        reportedId: reportedId.trim(),
        type,
        description: description.trim(),
        // Note: schema has no contentType/contentId fields; only validate but do not persist
      },
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
    });

    return report;
  }

  /**
   * Get user's submitted reports
   */
  async getUserReports(userId: string): Promise<ReportWithReportedBasic[]> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const reports = await prisma.report.findMany({
      where: { reporterId: userId.trim() },
      include: {
        reported: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports;
  }

  /**
   * Get report by ID
   */
  async getReportById(reportId: string, userId: string, isAdmin: boolean = false): Promise<ReportWithUsers> {
    if (!reportId || !reportId.trim()) {
      throw new ValidationError('Report ID is required');
    }
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const report = await prisma.report.findUnique({
      where: { id: reportId.trim() },
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
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    // Only reporter or admin can view report
    if (!isAdmin && report.reporterId !== userId.trim()) {
      throw new AuthorizationError('You can only view your own reports');
    }

    return report;
  }

  /**
   * Get all reports (Admin only)
   */
  async getAllReports(
    status?: ReportStatus,
    type?: ReportType,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    reports: ReportWithUsers[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.floor(limit), 1), 100)
      : 20;

    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.ReportWhereInput = {};

    if (status) where.status = status;
    if (type) where.type = type;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: safeLimit,
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
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Update report status (Admin only)
   */
  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    resolution?: string
  ): Promise<Report> {
    if (!reportId || !reportId.trim()) {
      throw new ValidationError('Report ID is required');
    }
    const report = await prisma.report.findUnique({
      where: { id: reportId.trim() },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    const updated = await prisma.report.update({
      where: { id: reportId.trim() },
      data: {
        status,
        resolution: resolution?.trim() || null,
        resolvedAt: status === ReportStatus.RESOLVED ? new Date() : null,
      },
    });

    // If resolved, check if teacher should be warned or suspended
    if (status === ReportStatus.RESOLVED) {
      await this.checkTeacherStatus(report.reportedId);
    }

    return updated;
  }

  /**
   * Get reports against a specific teacher (Admin only)
   */
  async getTeacherReports(teacherId: string): Promise<{
    reports: ReportWithReporter[];
    stats: {
      total: number;
      open: number;
      underReview: number;
      resolved: number;
      dismissed: number;
    };
  }> {
    if (!teacherId || !teacherId.trim()) {
      throw new ValidationError('Teacher ID is required');
    }
    const reports = await prisma.report.findMany({
      where: { reportedId: teacherId.trim() },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: reports.length,
      open: reports.filter((r) => r.status === ReportStatus.OPEN).length,
      underReview: reports.filter((r) => r.status === ReportStatus.UNDER_REVIEW).length,
      resolved: reports.filter((r) => r.status === ReportStatus.RESOLVED).length,
      dismissed: reports.filter((r) => r.status === ReportStatus.DISMISSED).length,
    };

    return { reports, stats };
  }

  /**
   * Check teacher status based on resolved reports
   */
  private async checkTeacherStatus(teacherId: string): Promise<void> {
    if (!teacherId || !teacherId.trim()) {
      return;
    }
    const resolvedReportsCount = await prisma.report.count({
      where: {
        reportedId: teacherId.trim(),
        status: ReportStatus.RESOLVED,
      },
    });

    // If teacher has 5 or more resolved reports, deactivate account
    if (resolvedReportsCount >= 5) {
      await prisma.user.update({
        where: { id: teacherId.trim() },
        data: { isActive: false },
      });

      // Create notification for teacher
      await prisma.notification.create({
        data: {
          userId: teacherId.trim(),
          title: 'Account Suspended',
          message:
            'Your account has been suspended due to multiple complaints. Please contact support.',
          type: 'account',
        },
      });
    }
  }
}

export default new ReportService();

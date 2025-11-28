import { ReportStatus, ReportType } from '@prisma/client';
import prisma from '../config/database';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from '../utils/errors';

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
  ) {
    // Verify reported user exists
    const reportedUser = await prisma.user.findUnique({
      where: { id: reportedId },
    });

    if (!reportedUser) {
      throw new NotFoundError('Reported user not found');
    }

    // Verify reporter is a student
    const reporter = await prisma.user.findUnique({
      where: { id: reporterId },
    });

    if (!reporter || reporter.role !== 'STUDENT') {
      throw new ValidationError('Only students can submit reports');
    }

    // Validate content if contentType is provided
    if (contentType && contentId) {
      if (contentType === 'course') {
        const course = await prisma.course.findUnique({ where: { id: contentId } });
        if (!course) throw new NotFoundError('Course not found');
      } else if (contentType === 'community_post') {
        const post = await prisma.communityPost.findUnique({ where: { id: contentId } });
        if (!post) throw new NotFoundError('Community post not found');
      } else if (contentType === 'community_comment') {
        const comment = await prisma.communityComment.findUnique({ where: { id: contentId } });
        if (!comment) throw new NotFoundError('Community comment not found');
      }
    }

    // Create report (persist content reference if provided)
    const report = await prisma.report.create({
      data: {
        reporterId,
        reportedId,
        type,
        description,
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
  async getUserReports(userId: string) {
    const reports = await prisma.report.findMany({
      where: { reporterId: userId },
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
  async getReportById(reportId: string, userId: string, isAdmin: boolean = false) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
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
    if (!isAdmin && report.reporterId !== userId) {
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
  ) {
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
   * Update report status (Admin only)
   */
  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    resolution?: string
  ) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

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

    // If resolved, check if teacher should be warned or suspended
    if (status === ReportStatus.RESOLVED) {
      await this.checkTeacherStatus(report.reportedId);
    }

    return updated;
  }

  /**
   * Get reports against a specific teacher (Admin only)
   */
  async getTeacherReports(teacherId: string) {
    const reports = await prisma.report.findMany({
      where: { reportedId: teacherId },
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
  private async checkTeacherStatus(teacherId: string) {
    const resolvedReportsCount = await prisma.report.count({
      where: {
        reportedId: teacherId,
        status: ReportStatus.RESOLVED,
      },
    });

    // If teacher has 5 or more resolved reports, deactivate account
    if (resolvedReportsCount >= 5) {
      await prisma.user.update({
        where: { id: teacherId },
        data: { isActive: false },
      });

      // Create notification for teacher
      await prisma.notification.create({
        data: {
          userId: teacherId,
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

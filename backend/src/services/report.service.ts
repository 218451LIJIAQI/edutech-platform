import { ReportStatus, ReportType } from '@prisma/client';
import prisma from '../config/database';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from '../utils/errors';

/**
 * Report Service
 * Handles complaints and reports against teachers
 */
class ReportService {
  /**
   * Submit a report
   */
  async submitReport(
    reporterId: string,
    reportedId: string,
    type: ReportType,
    description: string
  ) {
    // Verify reported user is a teacher
    const reportedUser = await prisma.user.findUnique({
      where: { id: reportedId },
    });

    if (!reportedUser) {
      throw new NotFoundError('Reported user not found');
    }

    if (reportedUser.role !== 'TEACHER') {
      throw new ValidationError('You can only report teachers');
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        reporterId,
        reportedId,
        type,
        description,
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

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

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
      underReview: reports.filter((r) => r.status === ReportStatus.UNDER_REVIEW)
        .length,
      resolved: reports.filter((r) => r.status === ReportStatus.RESOLVED).length,
      dismissed: reports.filter((r) => r.status === ReportStatus.DISMISSED).length,
    };

    return {
      reports,
      stats,
    };
  }

  /**
   * Check teacher status based on reports
   */
  private async checkTeacherStatus(teacherId: string) {
    const openReports = await prisma.report.count({
      where: {
        reportedId: teacherId,
        status: ReportStatus.RESOLVED,
      },
    });

    // If teacher has more than 5 resolved reports, deactivate account
    if (openReports >= 5) {
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


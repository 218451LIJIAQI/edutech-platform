import {
  Prisma,
  Report,
  ReportStatus,
  ReportType,
  UserRole,
} from "@prisma/client";
import prisma from "../config/database";
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from "../utils/errors";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";

const publicReportUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const reportUserSelect = {
  ...publicReportUserSelect,
  email: true,
} satisfies Prisma.UserSelect;

const reportWithUsersInclude = {
  reporter: {
    select: reportUserSelect,
  },
  reported: {
    select: reportUserSelect,
  },
} satisfies Prisma.ReportInclude;

const reportWithPublicUsersInclude = {
  reporter: {
    select: publicReportUserSelect,
  },
  reported: {
    select: publicReportUserSelect,
  },
} satisfies Prisma.ReportInclude;

const reportWithReporterInclude = {
  reporter: {
    select: reportUserSelect,
  },
} satisfies Prisma.ReportInclude;

const reportWithReportedBasicInclude = {
  reported: {
    select: publicReportUserSelect,
  },
} satisfies Prisma.ReportInclude;

type ReportWithUsers = Prisma.ReportGetPayload<{
  include: typeof reportWithUsersInclude;
}>;

type ReportWithReporter = Prisma.ReportGetPayload<{
  include: typeof reportWithReporterInclude;
}>;

type ReportWithPublicUsers = Prisma.ReportGetPayload<{
  include: typeof reportWithPublicUsersInclude;
}>;

type ReportWithReportedBasic = Prisma.ReportGetPayload<{
  include: typeof reportWithReportedBasicInclude;
}>;

type ReportContentType =
  | "teacher"
  | "course"
  | "community_post"
  | "community_comment";

const REPORT_TYPES = Object.values(ReportType) as ReportType[];
const REPORT_STATUSES = Object.values(ReportStatus) as ReportStatus[];
const FINAL_REPORT_STATUSES = new Set<ReportStatus>([
  ReportStatus.RESOLVED,
  ReportStatus.DISMISSED,
]);

const ALLOWED_CONTENT_TYPES = new Set<ReportContentType>([
  "teacher",
  "course",
  "community_post",
  "community_comment",
]);

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

const normalizeOptionalText = (value?: string): string | undefined => {
  const normalizedValue =
    value === undefined ? undefined : sanitizeUserPlainText(value);
  return normalizedValue || undefined;
};

const parseReportType = (type: ReportType | string): ReportType => {
  const normalizedType = String(type || "")
    .trim()
    .toUpperCase();

  if (!REPORT_TYPES.includes(normalizedType as ReportType)) {
    throw new ValidationError(
      `Invalid report type. Allowed values: ${REPORT_TYPES.join(", ")}`,
    );
  }

  return normalizedType as ReportType;
};

const parseOptionalReportType = (
  type?: ReportType | string,
): ReportType | undefined => (type ? parseReportType(type) : undefined);

const parseReportStatus = (status: ReportStatus | string): ReportStatus => {
  const normalizedStatus = String(status || "")
    .trim()
    .toUpperCase();

  if (!REPORT_STATUSES.includes(normalizedStatus as ReportStatus)) {
    throw new ValidationError(
      `Invalid report status. Allowed values: ${REPORT_STATUSES.join(", ")}`,
    );
  }

  return normalizedStatus as ReportStatus;
};

const parseOptionalReportStatus = (
  status?: ReportStatus | string,
): ReportStatus | undefined => (status ? parseReportStatus(status) : undefined);

const parseContentType = (
  contentType?: string,
): ReportContentType | undefined => {
  const normalizedContentType = contentType?.trim().toLowerCase();

  if (!normalizedContentType) {
    return undefined;
  }

  if (!ALLOWED_CONTENT_TYPES.has(normalizedContentType as ReportContentType)) {
    throw new ValidationError(
      `Invalid content type. Allowed values: ${Array.from(ALLOWED_CONTENT_TYPES).join(", ")}`,
    );
  }

  return normalizedContentType as ReportContentType;
};

const buildStoredDescription = (
  description: string,
  contentReference?: string,
): string =>
  contentReference
    ? `${description}\n\n[Reported content: ${contentReference}]`
    : description;

const normalizePagination = (
  page: number = 1,
  limit: number = 20,
): { safePage: number; safeLimit: number; skip: number } => {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.floor(limit), 1), 100)
    : 20;

  return {
    safePage,
    safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

/**
 * Report Service
 * Handles complaints and reports against teachers, courses, and community content.
 */
class ReportService {
  private async validateReportedContent(
    contentType: string | undefined,
    contentId: string | undefined,
    reportedId: string,
  ): Promise<string | undefined> {
    const normalizedContentType = parseContentType(contentType);
    const normalizedContentId = normalizeOptionalText(contentId);

    if (!normalizedContentType) {
      if (normalizedContentId) {
        throw new ValidationError(
          "Content type and content ID must be provided together",
        );
      }

      return undefined;
    }

    if (normalizedContentType !== "teacher" && !normalizedContentId) {
      throw new ValidationError(
        "Content type and content ID must be provided together",
      );
    }

    if (normalizedContentType === "teacher") {
      const teacherId = normalizedContentId ?? reportedId;

      if (teacherId !== reportedId) {
        throw new ValidationError(
          "Reported teacher content must match the reported user",
        );
      }

      const teacher = await prisma.user.findUnique({
        where: { id: reportedId },
        select: {
          id: true,
          role: true,
        },
      });

      if (!teacher) {
        throw new NotFoundError("Teacher not found");
      }

      if (teacher.role !== UserRole.TEACHER) {
        throw new ValidationError("Reported user is not a teacher");
      }

      return `teacher:${teacher.id}`;
    }

    const requiredContentId = normalizeRequiredText(contentId, "Content ID");

    if (normalizedContentType === "course") {
      const course = await prisma.course.findUnique({
        where: { id: requiredContentId },
        select: {
          id: true,
          title: true,
          teacherProfile: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!course) {
        throw new NotFoundError("Course not found");
      }

      if (course.teacherProfile.userId !== reportedId) {
        throw new ValidationError(
          "Reported user does not own the reported course",
        );
      }

      return `course:${course.id}`;
    }

    if (normalizedContentType === "community_post") {
      const post = await prisma.communityPost.findUnique({
        where: { id: requiredContentId },
        select: {
          id: true,
          authorId: true,
        },
      });

      if (!post) {
        throw new NotFoundError("Community post not found");
      }

      if (post.authorId !== reportedId) {
        throw new ValidationError(
          "Reported user does not own the reported post",
        );
      }

      return `community_post:${post.id}`;
    }

    if (normalizedContentType === "community_comment") {
      const comment = await prisma.communityComment.findUnique({
        where: { id: requiredContentId },
        select: {
          id: true,
          authorId: true,
        },
      });

      if (!comment) {
        throw new NotFoundError("Community comment not found");
      }

      if (comment.authorId !== reportedId) {
        throw new ValidationError(
          "Reported user does not own the reported comment",
        );
      }

      return `community_comment:${comment.id}`;
    }

    throw new ValidationError("Invalid content type");
  }

  /**
   * Submit a report.
   * Supports reporting teachers, courses, community posts, and community comments.
   */
  async submitReport(
    reporterId: string,
    reportedId: string,
    type: ReportType | string,
    description: string,
    contentType?: string,
    contentId?: string,
  ): Promise<ReportWithPublicUsers> {
    const normalizedReporterId = normalizeRequiredText(
      reporterId,
      "Reporter ID",
    );
    const normalizedReportedId = normalizeRequiredText(
      reportedId,
      "Reported ID",
    );
    const normalizedDescription = normalizeRequiredText(
      description,
      "Report description",
    );
    const normalizedType = parseReportType(type);

    if (normalizedDescription.length < 20) {
      throw new ValidationError(
        "Report description must be at least 20 characters long",
      );
    }

    if (normalizedDescription.length > 1000) {
      throw new ValidationError(
        "Report description must not exceed 1000 characters",
      );
    }

    if (normalizedReporterId === normalizedReportedId) {
      throw new ValidationError("You cannot report yourself");
    }

    const [reporter, reportedUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: normalizedReporterId },
        select: {
          id: true,
          role: true,
          isActive: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: normalizedReportedId },
        select: {
          id: true,
          isActive: true,
        },
      }),
    ]);

    if (!reporter) {
      throw new NotFoundError("Reporter not found");
    }

    if (!reportedUser) {
      throw new NotFoundError("Reported user not found");
    }

    if (!reporter.isActive) {
      throw new AuthorizationError("Inactive users cannot submit reports");
    }

    if (reporter.role !== UserRole.STUDENT) {
      throw new ValidationError("Only students can submit reports");
    }

    const contentReference = await this.validateReportedContent(
      contentType,
      contentId,
      normalizedReportedId,
    );

    const storedDescription = buildStoredDescription(
      normalizedDescription,
      contentReference,
    );

    const existingActiveReport = await prisma.report.findFirst({
      where: {
        reporterId: normalizedReporterId,
        reportedId: normalizedReportedId,
        type: normalizedType,
        description: storedDescription,
        status: {
          in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW],
        },
      },
      select: {
        id: true,
      },
    });

    if (existingActiveReport) {
      throw new ValidationError(
        "You already have an active report with the same details",
      );
    }

    return prisma.report.create({
      data: {
        reporterId: normalizedReporterId,
        reportedId: normalizedReportedId,
        type: normalizedType,
        description: storedDescription,
      },
      include: reportWithPublicUsersInclude,
    });
  }

  /**
   * Get reports submitted by a specific user.
   */
  async getUserReports(userId: string): Promise<ReportWithReportedBasic[]> {
    const normalizedUserId = normalizeRequiredText(userId, "User ID");

    return prisma.report.findMany({
      where: {
        reporterId: normalizedUserId,
      },
      include: reportWithReportedBasicInclude,
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Get report by ID.
   * Only the reporter or an admin can view a report.
   */
  async getReportById(
    reportId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<ReportWithUsers | ReportWithPublicUsers> {
    const normalizedReportId = normalizeRequiredText(reportId, "Report ID");
    const normalizedUserId = normalizeRequiredText(userId, "User ID");

    if (isAdmin) {
      const report = await prisma.report.findUnique({
        where: {
          id: normalizedReportId,
        },
        include: reportWithUsersInclude,
      });

      if (!report) {
        throw new NotFoundError("Report not found");
      }

      return report;
    }

    const report = await prisma.report.findUnique({
      where: {
        id: normalizedReportId,
      },
      include: reportWithPublicUsersInclude,
    });

    if (!report) {
      throw new NotFoundError("Report not found");
    }

    if (report.reporterId !== normalizedUserId) {
      throw new AuthorizationError("You can only view your own reports");
    }

    return report;
  }

  /**
   * Get all reports with optional filters.
   * This method should be called only from an admin-protected route.
   */
  async getAllReports(
    status?: ReportStatus | string,
    type?: ReportType | string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    reports: ReportWithUsers[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const parsedStatus = parseOptionalReportStatus(status);
    const parsedType = parseOptionalReportType(type);
    const { safePage, safeLimit, skip } = normalizePagination(page, limit);

    const where: Prisma.ReportWhereInput = {
      ...(parsedStatus ? { status: parsedStatus } : {}),
      ...(parsedType ? { type: parsedType } : {}),
    };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: safeLimit,
        include: reportWithUsersInclude,
        orderBy: {
          createdAt: "desc",
        },
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
   * Update report status.
   * This method should be called only from an admin-protected route.
   */
  async updateReportStatus(
    reportId: string,
    status: ReportStatus | string,
    resolution?: string,
  ): Promise<Report> {
    const normalizedReportId = normalizeRequiredText(reportId, "Report ID");
    const normalizedStatus = parseReportStatus(status);
    const normalizedResolution = normalizeOptionalText(resolution);
    const isFinalStatus = FINAL_REPORT_STATUSES.has(normalizedStatus);

    if (isFinalStatus && !normalizedResolution) {
      throw new ValidationError(
        "Resolution is required when resolving or dismissing a report",
      );
    }

    const report = await prisma.report.findUnique({
      where: {
        id: normalizedReportId,
      },
      select: {
        id: true,
        reporterId: true,
        status: true,
        reportedId: true,
        resolvedAt: true,
      },
    });

    if (!report) {
      throw new NotFoundError("Report not found");
    }

    const shouldCheckTeacherStatus =
      normalizedStatus === ReportStatus.RESOLVED &&
      report.status !== ReportStatus.RESOLVED;

    const message = normalizedResolution
      ? `Your report has been ${normalizedStatus.toLowerCase()}. Resolution: ${normalizedResolution}`
      : `Your report has been ${normalizedStatus.toLowerCase()}.`;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedReport = await tx.report.update({
        where: {
          id: normalizedReportId,
        },
        data: {
          status: normalizedStatus,
          ...(resolution !== undefined
            ? { resolution: normalizedResolution || null }
            : {}),
          resolvedAt: isFinalStatus ? (report.resolvedAt ?? new Date()) : null,
        },
      });

      await tx.notification.create({
        data: {
          userId: report.reporterId,
          title: "Report Updated",
          message,
          type: "report",
        },
      });

      return updatedReport;
    });

    if (shouldCheckTeacherStatus) {
      await this.checkTeacherStatus(report.reportedId);
    }

    return updated;
  }

  /**
   * Get reports against a specific teacher.
   * This method should be called only from an admin-protected route.
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
    const normalizedTeacherId = normalizeRequiredText(teacherId, "Teacher ID");

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

    const reports = await prisma.report.findMany({
      where: {
        reportedId: normalizedTeacherId,
      },
      include: reportWithReporterInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    const stats = reports.reduce(
      (summary, report) => {
        summary.total += 1;

        if (report.status === ReportStatus.OPEN) summary.open += 1;
        if (report.status === ReportStatus.UNDER_REVIEW)
          summary.underReview += 1;
        if (report.status === ReportStatus.RESOLVED) summary.resolved += 1;
        if (report.status === ReportStatus.DISMISSED) summary.dismissed += 1;

        return summary;
      },
      {
        total: 0,
        open: 0,
        underReview: 0,
        resolved: 0,
        dismissed: 0,
      },
    );

    return {
      reports,
      stats,
    };
  }

  /**
   * Check teacher status based on resolved reports.
   */
  private async checkTeacherStatus(teacherId: string): Promise<void> {
    const normalizedTeacherId = teacherId?.trim();

    if (!normalizedTeacherId) {
      return;
    }

    const reportedUser = await prisma.user.findUnique({
      where: {
        id: normalizedTeacherId,
      },
      select: {
        role: true,
        isActive: true,
      },
    });

    if (
      !reportedUser ||
      reportedUser.role !== UserRole.TEACHER ||
      !reportedUser.isActive
    ) {
      return;
    }

    const resolvedReportsCount = await prisma.report.count({
      where: {
        reportedId: normalizedTeacherId,
        status: ReportStatus.RESOLVED,
      },
    });

    if (resolvedReportsCount < 5) {
      return;
    }

    await prisma.$transaction(async (tx) => {
      const suspendedUser = await tx.user.updateMany({
        where: {
          id: normalizedTeacherId,
          role: UserRole.TEACHER,
          isActive: true,
        },
        data: {
          isActive: false,
          isLocked: true,
          lockedUntil: null,
          failedLoginAttempts: 0,
          tokenVersion: { increment: 1 },
        },
      });

      if (suspendedUser.count !== 1) {
        return;
      }

      await tx.notification.create({
        data: {
          userId: normalizedTeacherId,
          title: "Account Suspended",
          message:
            "Your account has been suspended due to multiple resolved complaints. Please contact support.",
          type: "account",
        },
      });
    });
  }
}

export default new ReportService();

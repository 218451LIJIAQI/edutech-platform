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
import { buildPaginationMeta, normalizePagination } from "./shared/pagination";
import {
  normalizeOptionalSanitizedText,
  normalizeRequiredSanitizedText,
} from "./shared/service-helpers";

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
  reporter: { select: reportUserSelect },
  reported: { select: reportUserSelect },
} satisfies Prisma.ReportInclude;

const reportWithPublicUsersInclude = {
  reporter: { select: publicReportUserSelect },
  reported: { select: publicReportUserSelect },
} satisfies Prisma.ReportInclude;

const reportWithReporterInclude = {
  reporter: { select: reportUserSelect },
} satisfies Prisma.ReportInclude;

const reportWithReportedBasicInclude = {
  reported: { select: publicReportUserSelect },
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
const MAX_REPORT_RESOLUTION_LENGTH = 2000;
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

const parseReportEnum = <T extends string>(
  raw: string,
  allowed: T[],
  label: string,
): T => {
  const normalized = String(raw || "")
    .trim()
    .toUpperCase();
  if (!allowed.includes(normalized as T)) {
    throw new ValidationError(
      `Invalid ${label}. Allowed values: ${allowed.join(", ")}`,
    );
  }
  return normalized as T;
};

const parseContentType = (
  contentType?: string,
): ReportContentType | undefined => {
  const normalizedContentType = contentType?.trim().toLowerCase();
  if (!normalizedContentType) return undefined;

  if (!ALLOWED_CONTENT_TYPES.has(normalizedContentType as ReportContentType)) {
    throw new ValidationError(
      `Invalid content type. Allowed values: ${Array.from(ALLOWED_CONTENT_TYPES).join(", ")}`,
    );
  }
  return normalizedContentType as ReportContentType;
};

class ReportService {
  private async validateReportedContent(
    contentType: string | undefined,
    contentId: string | undefined,
    reportedId: string,
  ): Promise<string | undefined> {
    const normalizedContentType = parseContentType(contentType);
    const normalizedContentId = normalizeOptionalSanitizedText(contentId);

    if (!normalizedContentType) {
      if (normalizedContentId) {
        throw new ValidationError(
          "Content type and content ID must be provided together",
        );
      }
      return undefined;
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
        select: { id: true, role: true },
      });

      if (!teacher) throw new NotFoundError("Teacher not found");
      if (teacher.role !== UserRole.TEACHER) {
        throw new ValidationError("Reported user is not a teacher");
      }

      return `teacher:${teacher.id}`;
    }

    const requiredContentId = normalizeRequiredSanitizedText(
      contentId,
      "Content ID",
    );

    if (normalizedContentType === "course") {
      const course = await prisma.course.findUnique({
        where: { id: requiredContentId },
        select: {
          id: true,
          teacherProfile: { select: { userId: true } },
        },
      });

      if (!course) throw new NotFoundError("Course not found");
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
        select: { id: true, authorId: true },
      });

      if (!post) throw new NotFoundError("Community post not found");
      if (post.authorId !== reportedId) {
        throw new ValidationError(
          "Reported user does not own the reported post",
        );
      }
      return `community_post:${post.id}`;
    }

    const comment = await prisma.communityComment.findUnique({
      where: { id: requiredContentId },
      select: { id: true, authorId: true },
    });

    if (!comment) throw new NotFoundError("Community comment not found");
    if (comment.authorId !== reportedId) {
      throw new ValidationError(
        "Reported user does not own the reported comment",
      );
    }
    return `community_comment:${comment.id}`;
  }

  async submitReport(
    reporterId: string,
    reportedId: string,
    type: ReportType | string,
    description: string,
    contentType?: string,
    contentId?: string,
  ): Promise<ReportWithPublicUsers> {
    const normalizedReporterId = normalizeRequiredSanitizedText(
      reporterId,
      "Reporter ID",
    );
    const normalizedReportedId = normalizeRequiredSanitizedText(
      reportedId,
      "Reported ID",
    );
    const normalizedDescription = normalizeRequiredSanitizedText(
      description,
      "Report description",
      1000,
    );
    const normalizedType = parseReportEnum(type, REPORT_TYPES, "report type");

    if (normalizedDescription.length < 20) {
      throw new ValidationError(
        "Report description must be at least 20 characters long",
      );
    }

    if (normalizedReporterId === normalizedReportedId) {
      throw new ValidationError("You cannot report yourself");
    }

    const [reporter, reportedUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: normalizedReporterId },
        select: { id: true, role: true, isActive: true },
      }),
      prisma.user.findUnique({
        where: { id: normalizedReportedId },
        select: { id: true },
      }),
    ]);

    if (!reporter) throw new NotFoundError("Reporter not found");
    if (!reportedUser) throw new NotFoundError("Reported user not found");
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

    const storedDescription = contentReference
      ? `${normalizedDescription}\n\n[Reported content: ${contentReference}]`
      : normalizedDescription;

    const existingActiveReport = await prisma.report.findFirst({
      where: {
        reporterId: normalizedReporterId,
        reportedId: normalizedReportedId,
        type: normalizedType,
        description: storedDescription,
        status: { in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW] },
      },
      select: { id: true },
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

  async getUserReports(userId: string): Promise<ReportWithReportedBasic[]> {
    return prisma.report.findMany({
      where: {
        reporterId: normalizeRequiredSanitizedText(userId, "User ID"),
      },
      include: reportWithReportedBasicInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async getReportById(
    reportId: string,
    userId: string,
    isAdmin = false,
  ): Promise<ReportWithUsers | ReportWithPublicUsers> {
    const normalizedReportId = normalizeRequiredSanitizedText(
      reportId,
      "Report ID",
    );
    const normalizedUserId = normalizeRequiredSanitizedText(userId, "User ID");

    if (isAdmin) {
      const report = await prisma.report.findUnique({
        where: { id: normalizedReportId },
        include: reportWithUsersInclude,
      });
      if (!report) throw new NotFoundError("Report not found");
      return report;
    }

    const report = await prisma.report.findUnique({
      where: { id: normalizedReportId },
      include: reportWithPublicUsersInclude,
    });

    if (!report) throw new NotFoundError("Report not found");
    if (report.reporterId !== normalizedUserId) {
      throw new AuthorizationError("You can only view your own reports");
    }

    return report;
  }

  async getAllReports(
    status?: ReportStatus | string,
    type?: ReportType | string,
    page = 1,
    limit = 20,
  ) {
    const parsedStatus = status
      ? parseReportEnum(status, REPORT_STATUSES, "report status")
      : undefined;
    const parsedType = type
      ? parseReportEnum(type, REPORT_TYPES, "report type")
      : undefined;
    const pagination = normalizePagination(page, limit, {
      defaultLimit: 20,
      maxLimit: 100,
    });

    const where: Prisma.ReportWhereInput = {
      ...(parsedStatus ? { status: parsedStatus } : {}),
      ...(parsedType ? { type: parsedType } : {}),
    };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        include: reportWithUsersInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.report.count({ where }),
    ]);

    return {
      reports,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async updateReportStatus(
    reportId: string,
    status: ReportStatus | string,
    resolution?: string,
  ): Promise<Report> {
    const normalizedReportId = normalizeRequiredSanitizedText(
      reportId,
      "Report ID",
    );
    const normalizedStatus = parseReportEnum(
      status,
      REPORT_STATUSES,
      "report status",
    );
    const normalizedResolution = normalizeOptionalSanitizedText(
      resolution,
      "Resolution",
      MAX_REPORT_RESOLUTION_LENGTH,
    );
    const isFinalStatus = FINAL_REPORT_STATUSES.has(normalizedStatus);

    if (isFinalStatus && !normalizedResolution) {
      throw new ValidationError(
        "Resolution is required when resolving or dismissing a report",
      );
    }

    const report = await prisma.report.findUnique({
      where: { id: normalizedReportId },
      select: {
        id: true,
        reporterId: true,
        status: true,
        reportedId: true,
        resolvedAt: true,
      },
    });

    if (!report) throw new NotFoundError("Report not found");

    const shouldCheckTeacherStatus =
      normalizedStatus === ReportStatus.RESOLVED &&
      report.status !== ReportStatus.RESOLVED;

    const message = normalizedResolution
      ? `Your report has been ${normalizedStatus.toLowerCase()}. Resolution: ${normalizedResolution}`
      : `Your report has been ${normalizedStatus.toLowerCase()}.`;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedReport = await tx.report.update({
        where: { id: normalizedReportId },
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
    const normalizedTeacherId = normalizeRequiredSanitizedText(
      teacherId,
      "Teacher ID",
    );

    const teacher = await prisma.user.findUnique({
      where: { id: normalizedTeacherId },
      select: { id: true, role: true },
    });

    if (!teacher) throw new NotFoundError("Teacher not found");
    if (teacher.role !== UserRole.TEACHER) {
      throw new ValidationError("Selected user is not a teacher");
    }

    const reports = await prisma.report.findMany({
      where: { reportedId: normalizedTeacherId },
      include: reportWithReporterInclude,
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      total: reports.length,
      open: 0,
      underReview: 0,
      resolved: 0,
      dismissed: 0,
    };

    for (const report of reports) {
      if (report.status === ReportStatus.OPEN) stats.open += 1;
      else if (report.status === ReportStatus.UNDER_REVIEW)
        stats.underReview += 1;
      else if (report.status === ReportStatus.RESOLVED) stats.resolved += 1;
      else if (report.status === ReportStatus.DISMISSED) stats.dismissed += 1;
    }

    return { reports, stats };
  }

  private async checkTeacherStatus(teacherId: string): Promise<void> {
    const normalizedTeacherId = teacherId?.trim();
    if (!normalizedTeacherId) return;

    const reportedUser = await prisma.user.findUnique({
      where: { id: normalizedTeacherId },
      select: { role: true, isActive: true },
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

    if (resolvedReportsCount < 5) return;

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

      if (suspendedUser.count !== 1) return;

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

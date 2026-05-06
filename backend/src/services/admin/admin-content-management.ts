import {
  ReportStatus,
  UserRole,
  VerificationStatus,
  type ReportType,
} from "@prisma/client";
import prisma from "../../config/database";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { sanitizeUserPlainText } from "../../utils/sanitize-user-content";
import {
  adminCourseListInclude,
  adminReportListInclude,
  adminVerificationListInclude,
  buildAdminCourseWhere,
  buildAdminReportWhere,
  buildAdminVerificationWhere,
  createAdminNotification,
} from "./admin-user-helpers";
import { buildPaginationMeta, normalizePagination } from "../shared/pagination";

const RESOLVED_REPORT_SUSPENSION_THRESHOLD = 5;

export const getAllAdminCourses = async (
  filters: {
    isPublished?: boolean;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
) => {
  const { isPublished, category, search, page = 1, limit = 20 } = filters;

  const pagination = normalizePagination(page, limit, {
    defaultLimit: 20,
    maxLimit: 100,
  });

  const where = buildAdminCourseWhere({ isPublished, category, search });

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      include: adminCourseListInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.count({ where }),
  ]);

  return {
    courses,
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const updateAdminCourseStatus = async (
  courseId: string,
  isPublished: boolean,
) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  return prisma.course.update({
    where: { id: courseId },
    data: { isPublished },
  });
};

export const deleteAdminCourse = async (courseId: string) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  const [enrollmentCount, paymentCount, orderItemCount] = await Promise.all([
    prisma.enrollment.count({
      where: {
        package: {
          courseId,
        },
      },
    }),
    prisma.payment.count({
      where: {
        package: {
          courseId,
        },
      },
    }),
    prisma.orderItem.count({
      where: {
        package: {
          courseId,
        },
      },
    }),
  ]);

  if (enrollmentCount > 0 || paymentCount > 0 || orderItemCount > 0) {
    throw new ValidationError(
      "Cannot delete course with existing enrollments, payments, or orders. Please unpublish the course instead.",
    );
  }

  await prisma.course.delete({
    where: { id: courseId },
  });

  return {
    message: "Course deleted successfully",
  };
};

export const getAllAdminVerifications = async (
  filters: {
    status?: VerificationStatus;
    page?: number;
    limit?: number;
  } = {},
) => {
  const { status, page = 1, limit = 20 } = filters;

  const pagination = normalizePagination(page, limit, {
    defaultLimit: 20,
    maxLimit: 100,
  });

  const where = buildAdminVerificationWhere(status);

  const [verifications, total] = await Promise.all([
    prisma.teacherVerification.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      include: adminVerificationListInclude,
      orderBy: { submittedAt: "desc" },
    }),
    prisma.teacherVerification.count({ where }),
  ]);

  return {
    verifications,
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const reviewAdminVerification = async (params: {
  verificationId: string;
  adminId: string;
  status: VerificationStatus;
  reviewNotes?: string;
}) => {
  const { verificationId, adminId, status } = params;
  const reviewNotes = params.reviewNotes?.trim() || null;

  if (
    status !== VerificationStatus.APPROVED &&
    status !== VerificationStatus.REJECTED
  ) {
    throw new ValidationError(
      "Verification review status must be either APPROVED or REJECTED",
    );
  }

  if (status === VerificationStatus.REJECTED && !reviewNotes) {
    throw new ValidationError(
      "Review notes are required when rejecting a verification",
    );
  }

  const verification = await prisma.teacherVerification.findUnique({
    where: { id: verificationId },
    include: {
      teacherProfile: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (!verification) {
    throw new NotFoundError("Verification not found");
  }

  if (verification.status !== VerificationStatus.PENDING) {
    throw new ValidationError(
      "This verification request has already been reviewed",
    );
  }

  const reviewedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const reviewResult = await tx.teacherVerification.updateMany({
      where: { id: verificationId, status: VerificationStatus.PENDING },
      data: {
        status,
        reviewedBy: adminId,
        reviewNotes,
        reviewedAt,
      },
    });

    if (reviewResult.count !== 1) {
      throw new ValidationError(
        "Verification status changed while review was being processed",
      );
    }

    await tx.teacherProfile.update({
      where: { id: verification.teacherProfile.id },
      data: {
        isVerified: status === VerificationStatus.APPROVED,
        verificationStatus: status,
        profileReviewedAt: reviewedAt,
        profileReviewNotes: reviewNotes,
      },
    });

    await createAdminNotification(
      {
        userId: verification.teacherProfile.userId,
        title:
          status === VerificationStatus.APPROVED
            ? "Verification Approved"
            : "Verification Rejected",
        message:
          status === VerificationStatus.APPROVED
            ? "Congratulations! Your teacher verification has been approved."
            : `Your verification request has been rejected. Reason: ${reviewNotes}`,
        type: "verification",
      },
      tx,
    );

    const updatedVerification = await tx.teacherVerification.findUnique({
      where: { id: verificationId },
    });

    if (!updatedVerification) {
      throw new NotFoundError("Verification not found after review");
    }

    return updatedVerification;
  });
};

export const getAllAdminReports = async (
  filters: {
    status?: ReportStatus;
    type?: ReportType;
    page?: number;
    limit?: number;
  } = {},
) => {
  const { status, type, page = 1, limit = 20 } = filters;

  const pagination = normalizePagination(page, limit, {
    defaultLimit: 20,
    maxLimit: 100,
  });

  const where = buildAdminReportWhere(status, type);

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      include: adminReportListInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.report.count({ where }),
  ]);

  return {
    reports,
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const updateAdminReportStatus = async (
  reportId: string,
  status: ReportStatus,
  resolution?: string,
) => {
  const cleanResolution =
    resolution === undefined ? null : sanitizeUserPlainText(resolution) || null;

  if (
    (status === ReportStatus.RESOLVED || status === ReportStatus.DISMISSED) &&
    !cleanResolution
  ) {
    throw new ValidationError(
      "Resolution is required when resolving or dismissing a report",
    );
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      reporterId: true,
      reportedId: true,
      status: true,
    },
  });

  if (!report) {
    throw new NotFoundError("Report not found");
  }

  const isClosedStatus =
    status === ReportStatus.RESOLVED || status === ReportStatus.DISMISSED;

  const message = cleanResolution
    ? `Your report has been ${status.toLowerCase()}. Resolution: ${cleanResolution}`
    : `Your report has been ${status.toLowerCase()}.`;
  const shouldCheckTeacherStatus =
    status === ReportStatus.RESOLVED && report.status !== ReportStatus.RESOLVED;

  return prisma.$transaction(async (tx) => {
    const updatedReport = await tx.report.update({
      where: { id: reportId },
      data: {
        status,
        resolution: cleanResolution,
        resolvedAt: isClosedStatus ? new Date() : null,
      },
    });

    await createAdminNotification(
      {
        userId: report.reporterId,
        title: "Report Updated",
        message,
        type: "report",
      },
      tx,
    );

    if (shouldCheckTeacherStatus) {
      const reportedUser = await tx.user.findUnique({
        where: { id: report.reportedId },
        select: {
          role: true,
          isActive: true,
        },
      });

      if (reportedUser?.role === UserRole.TEACHER && reportedUser.isActive) {
        const resolvedReportCount = await tx.report.count({
          where: {
            reportedId: report.reportedId,
            status: ReportStatus.RESOLVED,
          },
        });

        if (resolvedReportCount >= RESOLVED_REPORT_SUSPENSION_THRESHOLD) {
          const suspendedUser = await tx.user.updateMany({
            where: {
              id: report.reportedId,
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

          if (suspendedUser.count === 1) {
            await createAdminNotification(
              {
                userId: report.reportedId,
                title: "Account Suspended",
                message:
                  "Your account has been suspended due to multiple resolved complaints. Please contact support.",
                type: "account",
              },
              tx,
            );
          }
        }
      }
    }

    return updatedReport;
  });
};

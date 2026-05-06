import {
  PaymentStatus,
  RegistrationStatus,
  ReportStatus,
  UserRole,
  VerificationStatus,
  type Prisma,
} from "@prisma/client";
import prisma from "../../config/database";
import {
  buildRecentActivities,
  recentCourseSelect,
  recentEnrollmentSelect,
  recentPaymentSelect,
  recentReportSelect,
  recentUserSelect,
} from "./admin-metrics";
import { normalizePagination } from "../shared/pagination";

const decimalToNumber = (
  value: Prisma.Decimal | number | null | undefined,
): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  return typeof value === "number" ? value : value.toNumber();
};

const getUtcMonthKey = (date: Date): string => {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}`;
};

const getLastTwelveMonthKeys = (now: Date): string[] => {
  const months: string[] = [];

  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );

    months.push(getUtcMonthKey(date));
  }

  return months;
};

export const getAdminPlatformStats = async () => {
  const now = new Date();

  const currentMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const revenueStartDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
  );

  const [
    totalUsers,
    totalTeachers,
    totalStudents,
    totalCourses,
    publishedCourses,
    totalEnrollments,
    totalRevenue,
    pendingCertificates,
    pendingRegistrations,
    pendingProfiles,
    openReports,
    newUsersThisMonth,
    newCoursesThisMonth,
    enrollmentsThisMonth,
    paymentsLast12,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.user.count({
      where: {
        role: UserRole.TEACHER,
      },
    }),

    prisma.user.count({
      where: {
        role: UserRole.STUDENT,
      },
    }),

    prisma.course.count(),

    prisma.course.count({
      where: { isPublished: true },
    }),

    prisma.enrollment.count(),

    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: { not: null },
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.teacherVerification.count({
      where: {
        status: VerificationStatus.PENDING,
      },
    }),

    prisma.teacherProfile.count({
      where: {
        registrationStatus: RegistrationStatus.PENDING,
      },
    }),

    prisma.teacherProfile.count({
      where: {
        profileSubmissions: {
          some: {
            status: VerificationStatus.PENDING,
          },
        },
      },
    }),

    prisma.report.count({
      where: {
        status: ReportStatus.OPEN,
      },
    }),

    prisma.user.count({
      where: {
        createdAt: {
          gte: currentMonthStart,
        },
      },
    }),

    prisma.course.count({
      where: {
        createdAt: {
          gte: currentMonthStart,
        },
      },
    }),

    prisma.enrollment.count({
      where: {
        enrolledAt: {
          gte: currentMonthStart,
        },
      },
    }),

    prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: {
          not: null,
          gte: revenueStartDate,
        },
      },
      select: {
        amount: true,
        paidAt: true,
      },
      orderBy: {
        paidAt: "asc",
      },
    }),
  ]);

  const pendingVerifications =
    pendingRegistrations + pendingProfiles + pendingCertificates;

  const months = getLastTwelveMonthKeys(now);
  const monthlyMap = new Map<string, number>();

  for (const month of months) {
    monthlyMap.set(month, 0);
  }

  for (const payment of paymentsLast12) {
    if (!payment.paidAt) {
      continue;
    }

    const month = getUtcMonthKey(payment.paidAt);
    monthlyMap.set(
      month,
      (monthlyMap.get(month) || 0) + decimalToNumber(payment.amount),
    );
  }

  const monthly = months.map((month) => ({
    month,
    revenue: monthlyMap.get(month) || 0,
  }));

  const revenueTotal = decimalToNumber(totalRevenue._sum.amount);

  return {
    overview: {
      totalUsers,
      totalTeachers,
      totalStudents,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      totalRevenue: revenueTotal,
      pendingVerifications,
      openReports,
    },
    verificationBreakdown: {
      pendingRegistrations,
      pendingProfiles,
      pendingCertificates,
    },
    growth: {
      newUsersThisMonth,
      newCoursesThisMonth,
      enrollmentsThisMonth,
    },
    revenue: {
      total: revenueTotal,
      monthly,
    },
  };
};

export const getAdminRecentActivities = async (
  params: {
    limit?: number;
    page?: number;
  } = {},
) => {
  const pagination = normalizePagination(params.page ?? 1, params.limit ?? 20, {
    defaultLimit: 20,
    maxLimit: 50,
  });

  const poolPerCategory = Math.min(
    200,
    Math.max(pagination.limit * pagination.page + 20, pagination.limit),
  );

  const [
    recentUsers,
    recentCourses,
    recentEnrollments,
    recentReports,
    recentPayments,
  ] = await Promise.all([
    prisma.user.findMany({
      take: poolPerCategory,
      orderBy: {
        createdAt: "desc",
      },
      select: recentUserSelect,
    }),

    prisma.course.findMany({
      take: poolPerCategory,
      orderBy: {
        createdAt: "desc",
      },
      select: recentCourseSelect,
    }),

    prisma.enrollment.findMany({
      take: poolPerCategory,
      orderBy: {
        enrolledAt: "desc",
      },
      select: recentEnrollmentSelect,
    }),

    prisma.report.findMany({
      take: poolPerCategory,
      orderBy: {
        createdAt: "desc",
      },
      select: recentReportSelect,
    }),

    prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: {
          not: null,
        },
      },
      take: poolPerCategory,
      orderBy: {
        paidAt: "desc",
      },
      select: recentPaymentSelect,
    }),
  ]);

  return buildRecentActivities({
    recentUsers,
    recentCourses,
    recentEnrollments,
    recentReports,
    recentPayments,
    page: pagination.page,
    limit: pagination.limit,
  });
};

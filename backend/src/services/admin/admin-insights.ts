import {
  PaymentStatus,
  RegistrationStatus,
  ReportStatus,
  UserRole,
  VerificationStatus,
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
import { toNumber } from "../shared/payment-utils";

const getUtcMonthKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const getLastTwelveMonthKeys = (now: Date): string[] =>
  Array.from({ length: 12 }, (_, idx) => {
    const offset = 11 - idx;
    return getUtcMonthKey(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1)),
    );
  });

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
    prisma.user.count({ where: { role: UserRole.TEACHER } }),
    prisma.user.count({ where: { role: UserRole.STUDENT } }),
    prisma.course.count(),
    prisma.course.count({ where: { isPublished: true } }),
    prisma.enrollment.count(),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.COMPLETED, paidAt: { not: null } },
      _sum: { amount: true },
    }),
    prisma.teacherVerification.count({
      where: { status: VerificationStatus.PENDING },
    }),
    prisma.teacherProfile.count({
      where: { registrationStatus: RegistrationStatus.PENDING },
    }),
    prisma.teacherProfile.count({
      where: {
        profileSubmissions: { some: { status: VerificationStatus.PENDING } },
      },
    }),
    prisma.report.count({ where: { status: ReportStatus.OPEN } }),
    prisma.user.count({ where: { createdAt: { gte: currentMonthStart } } }),
    prisma.course.count({ where: { createdAt: { gte: currentMonthStart } } }),
    prisma.enrollment.count({
      where: { enrolledAt: { gte: currentMonthStart } },
    }),
    prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: { not: null, gte: revenueStartDate },
      },
      select: { amount: true, paidAt: true },
      orderBy: { paidAt: "asc" },
    }),
  ]);

  const months = getLastTwelveMonthKeys(now);
  const monthlyMap = new Map<string, number>(months.map((m) => [m, 0]));

  for (const payment of paymentsLast12) {
    if (!payment.paidAt) continue;
    const month = getUtcMonthKey(payment.paidAt);
    monthlyMap.set(
      month,
      (monthlyMap.get(month) || 0) + toNumber(payment.amount),
    );
  }

  const revenueTotal = toNumber(totalRevenue._sum.amount);

  return {
    overview: {
      totalUsers,
      totalTeachers,
      totalStudents,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      totalRevenue: revenueTotal,
      pendingVerifications:
        pendingRegistrations + pendingProfiles + pendingCertificates,
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
      monthly: months.map((month) => ({
        month,
        revenue: monthlyMap.get(month) || 0,
      })),
    },
  };
};

export const getAdminRecentActivities = async (
  params: { limit?: number; page?: number } = {},
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
      orderBy: { createdAt: "desc" },
      select: recentUserSelect,
    }),
    prisma.course.findMany({
      take: poolPerCategory,
      orderBy: { createdAt: "desc" },
      select: recentCourseSelect,
    }),
    prisma.enrollment.findMany({
      take: poolPerCategory,
      orderBy: { enrolledAt: "desc" },
      select: recentEnrollmentSelect,
    }),
    prisma.report.findMany({
      take: poolPerCategory,
      orderBy: { createdAt: "desc" },
      select: recentReportSelect,
    }),
    prisma.payment.findMany({
      where: { status: PaymentStatus.COMPLETED, paidAt: { not: null } },
      take: poolPerCategory,
      orderBy: { paidAt: "desc" },
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

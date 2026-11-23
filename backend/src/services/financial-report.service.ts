import {
  PaymentStatus,
  PayoutRequestStatus,
  RefundStatus,
} from "@prisma/client";
import prisma from "../config/database";
import config from "../config/env";
import { ValidationError } from "../utils/errors";
import { parseOptionalDate } from "../utils/http";
import { toNumber } from "./shared/payment-utils";
import {
  computeTeacherSettlementsSummary,
  resolvePaymentCommissionBreakdown,
  roundCurrency,
  type TeacherSettlement,
} from "./shared/settlement-calculator";

export {
  computeTeacherSettlementsSummary,
  resolvePaymentCommissionBreakdown,
  type SettlementPaymentRecord,
  type SettlementPendingPayoutRecord,
  type SettlementRefundRecord,
  type SettlementTeacherRecord,
  type TeacherSettlement,
} from "./shared/settlement-calculator";

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface FinancialSummary {
  period: string;
  totalRevenue: number;
  platformEarnings: number;
  teacherEarnings: number;
  totalRefunds: number;
  netRevenue: number;
  transactionCount: number;
  refundCount: number;
}

export interface FinancialReportSummary {
  daily: FinancialSummary;
  weekly: FinancialSummary;
  monthly: FinancialSummary;
  allTime: FinancialSummary;
}

const PAID_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.COMPLETED,
  PaymentStatus.REFUNDED,
];

const resolveDefaultCommissionRate = (): number =>
  config.PLATFORM_COMMISSION_RATE ?? 10;

const getStartOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getStartOfMonth = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const buildDateFilter = (
  filter?: DateRangeFilter,
): { gte?: Date; lte?: Date } | undefined => {
  const start = parseOptionalDate(filter?.startDate, "startDate");
  const end = parseOptionalDate(filter?.endDate, "endDate", {
    endOfDayIfDateOnly: true,
  });

  if (start && end && start > end) {
    throw new ValidationError("startDate cannot be later than endDate");
  }

  if (!start && !end) {
    return undefined;
  }

  return {
    ...(start ? { gte: start } : {}),
    ...(end ? { lte: end } : {}),
  };
};

class FinancialReportService {
  async getFinancialSummary(): Promise<FinancialReportSummary> {
    const now = new Date();
    const [daily, weekly, monthly, allTime] = await Promise.all([
      this.computeSummaryForPeriod("Today", getStartOfDay(now)),
      this.computeSummaryForPeriod("This Week", getStartOfWeek(now)),
      this.computeSummaryForPeriod("This Month", getStartOfMonth(now)),
      this.computeSummaryForPeriod("All Time"),
    ]);

    return { daily, weekly, monthly, allTime };
  }

  async getTeacherSettlements(
    filter?: DateRangeFilter & { page?: number; limit?: number },
  ): Promise<{
    settlements: TeacherSettlement[];
    totals: {
      totalEarnings: number;
      totalRefundDeductions: number;
      totalNetSettlement: number;
    };
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const dateFilter = buildDateFilter(filter);
    const defaultCommissionRate = resolveDefaultCommissionRate();

    const [teacherProfiles, paidPayments, completedRefunds, activePayouts] =
      await Promise.all([
        prisma.teacherProfile.findMany({
          where: { registrationStatus: "APPROVED" },
          select: {
            id: true,
            userId: true,
            commissionRate: true,
            totalStudents: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            _count: {
              select: { courses: true },
            },
          },
          orderBy: { totalEarnings: "desc" },
        }),
        prisma.payment.findMany({
          where: {
            status: { in: PAID_PAYMENT_STATUSES },
            paidAt: dateFilter ? { not: null, ...dateFilter } : { not: null },
          },
          select: {
            amount: true,
            teacherEarning: true,
            status: true,
            orderId: true,
            package: {
              select: {
                course: { select: { teacherProfileId: true } },
              },
            },
            order: {
              select: {
                items: {
                  select: {
                    finalPrice: true,
                    package: {
                      select: {
                        course: { select: { teacherProfileId: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        prisma.refund.findMany({
          where: {
            status: RefundStatus.COMPLETED,
            ...(dateFilter ? { completedAt: dateFilter } : {}),
          },
          select: {
            amount: true,
            order: {
              select: {
                items: {
                  select: {
                    finalPrice: true,
                    package: {
                      select: {
                        course: { select: { teacherProfileId: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        prisma.payoutRequest.findMany({
          where: {
            status: {
              in: [
                PayoutRequestStatus.PENDING,
                PayoutRequestStatus.APPROVED,
                PayoutRequestStatus.PROCESSING,
              ],
            },
          },
          select: {
            amount: true,
            wallet: { select: { userId: true } },
          },
        }),
      ]);

    return computeTeacherSettlementsSummary({
      teachers: teacherProfiles.map((profile) => ({
        id: profile.id,
        userId: profile.userId,
        commissionRate: profile.commissionRate,
        totalStudents: profile.totalStudents,
        courseCount: profile._count.courses,
        user: profile.user,
      })),
      payments: paidPayments,
      refunds: completedRefunds,
      pendingPayouts: activePayouts.map((payout) => ({
        userId: payout.wallet.userId,
        amount: payout.amount,
      })),
      defaultCommissionRate,
      page: filter?.page ?? 1,
      limit: filter?.limit ?? 20,
    });
  }

  async getExportData(filter?: DateRangeFilter): Promise<{
    payments: Array<{
      id: string;
      date: string;
      userName: string;
      courseName: string;
      amount: number;
      platformCommission: number;
      teacherEarning: number;
      status: string;
    }>;
    refunds: Array<{
      id: string;
      date: string;
      userName: string;
      amount: number;
      status: string;
      method: string;
    }>;
    summary: FinancialSummary;
  }> {
    const dateFilter = buildDateFilter(filter);
    const defaultCommissionRate = resolveDefaultCommissionRate();

    const [payments, refunds] = await Promise.all([
      prisma.payment.findMany({
        where: {
          status: { in: PAID_PAYMENT_STATUSES },
          paidAt: dateFilter ? { not: null, ...dateFilter } : { not: null },
        },
        include: {
          user: { select: { firstName: true, lastName: true } },
          package: { include: { course: { select: { title: true } } } },
          order: {
            include: {
              items: {
                include: {
                  package: { include: { course: { select: { title: true } } } },
                },
              },
            },
          },
        },
        orderBy: { paidAt: "desc" },
        take: 1000,
      }),
      prisma.refund.findMany({
        where: {
          status: RefundStatus.COMPLETED,
          ...(dateFilter ? { completedAt: dateFilter } : {}),
        },
        include: {
          order: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { completedAt: "desc" },
        take: 500,
      }),
    ]);

    const exportPayments = payments.map((p) => {
      const breakdown = resolvePaymentCommissionBreakdown(
        p,
        defaultCommissionRate,
      );
      const courseName =
        p.package?.course?.title ||
        p.order?.items
          ?.map((item) => item.package?.course?.title)
          .filter(Boolean)
          .join(", ") ||
        "-";

      return {
        id: p.id,
        date: p.paidAt?.toISOString() || "",
        userName: `${p.user?.firstName || ""} ${p.user?.lastName || ""}`.trim(),
        courseName,
        amount: breakdown.amount,
        platformCommission: breakdown.platformCommission,
        teacherEarning: breakdown.teacherEarning,
        status: p.status,
      };
    });

    const directRefundRows = payments
      .filter((p) => p.status === PaymentStatus.REFUNDED && !p.orderId)
      .map((p) => ({
        id: `direct-refund:${p.id}`,
        date: p.paidAt?.toISOString() || "",
        userName: `${p.user?.firstName || ""} ${p.user?.lastName || ""}`.trim(),
        amount: roundCurrency(toNumber(p.amount)),
        status: RefundStatus.COMPLETED,
        method: "ORIGINAL_PAYMENT",
      }));

    const exportRefunds = [
      ...refunds.map((r) => ({
        id: r.id,
        date: (r.completedAt ?? r.processedAt)?.toISOString() || "",
        userName:
          `${r.order?.user?.firstName || ""} ${r.order?.user?.lastName || ""}`.trim(),
        amount: roundCurrency(toNumber(r.amount)),
        status: r.status,
        method: r.refundMethod,
      })),
      ...directRefundRows,
    ];

    const totalRevenue = roundCurrency(
      exportPayments.reduce((sum, item) => sum + item.amount, 0),
    );
    const platformEarnings = roundCurrency(
      exportPayments.reduce((sum, item) => sum + item.platformCommission, 0),
    );
    const teacherEarnings = roundCurrency(
      exportPayments.reduce((sum, item) => sum + item.teacherEarning, 0),
    );
    const totalRefunds = roundCurrency(
      exportRefunds.reduce((sum, item) => sum + item.amount, 0),
    );

    return {
      payments: exportPayments,
      refunds: exportRefunds,
      summary: {
        period: filter?.startDate
          ? `${filter.startDate} to ${filter.endDate || "now"}`
          : "All Time",
        totalRevenue,
        platformEarnings,
        teacherEarnings,
        totalRefunds,
        netRevenue: roundCurrency(totalRevenue - totalRefunds),
        transactionCount: exportPayments.length,
        refundCount: exportRefunds.length,
      },
    };
  }

  private async computeSummaryForPeriod(
    label: string,
    since?: Date,
  ): Promise<FinancialSummary> {
    const dateFilter = since ? { gte: since } : undefined;
    const defaultCommissionRate = resolveDefaultCommissionRate();

    const [
      paymentAgg,
      paymentCount,
      refundAgg,
      refundCount,
      directRefundAgg,
      directRefundCount,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          status: { in: PAID_PAYMENT_STATUSES },
          paidAt: dateFilter ? { not: null, ...dateFilter } : { not: null },
        },
        _sum: {
          amount: true,
          platformCommission: true,
          teacherEarning: true,
        },
      }),
      prisma.payment.count({
        where: {
          status: { in: PAID_PAYMENT_STATUSES },
          paidAt: dateFilter ? { not: null, ...dateFilter } : { not: null },
        },
      }),
      prisma.refund.aggregate({
        where: {
          status: RefundStatus.COMPLETED,
          ...(dateFilter ? { completedAt: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.refund.count({
        where: {
          status: RefundStatus.COMPLETED,
          ...(dateFilter ? { completedAt: dateFilter } : {}),
        },
      }),
      prisma.payment.aggregate({
        where: {
          status: PaymentStatus.REFUNDED,
          orderId: null,
          paidAt: dateFilter ? { not: null, ...dateFilter } : { not: null },
        },
        _sum: { amount: true },
      }),
      prisma.payment.count({
        where: {
          status: PaymentStatus.REFUNDED,
          orderId: null,
          paidAt: dateFilter ? { not: null, ...dateFilter } : { not: null },
        },
      }),
    ]);

    const breakdown = resolvePaymentCommissionBreakdown(
      {
        amount: paymentAgg._sum.amount,
        platformCommission: paymentAgg._sum.platformCommission,
        teacherEarning: paymentAgg._sum.teacherEarning,
      },
      defaultCommissionRate,
    );
    const totalRefunds = roundCurrency(
      toNumber(refundAgg._sum.amount) + toNumber(directRefundAgg._sum.amount),
    );

    return {
      period: label,
      totalRevenue: breakdown.amount,
      platformEarnings: breakdown.platformCommission,
      teacherEarnings: breakdown.teacherEarning,
      totalRefunds,
      netRevenue: roundCurrency(breakdown.amount - totalRefunds),
      transactionCount: paymentCount,
      refundCount: refundCount + directRefundCount,
    };
  }
}

export default new FinancialReportService();

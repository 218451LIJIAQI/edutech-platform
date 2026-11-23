import {
  PaymentStatus,
  PayoutRequestStatus,
  Prisma,
  RefundStatus,
} from "@prisma/client";
import prisma from "../config/database";
import config from "../config/env";
import { ValidationError } from "../utils/errors";
import { parseOptionalDate } from "../utils/http";
import {
  computeTeacherSettlementsSummary,
  resolvePaymentCommissionBreakdown,
  resolveRefundCommissionBreakdown,
  roundCurrency,
  type SettlementRefundRecord,
  type TeacherSettlement,
} from "./shared/settlement-calculator";

export {
  computeTeacherSettlementsSummary,
  resolvePaymentCommissionBreakdown,
  resolveRefundCommissionBreakdown,
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

const PAID_GROSS_STATUSES: PaymentStatus[] = [
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

const buildPaidGrossPaymentWhere = (dateFilter?: {
  gte?: Date;
  lte?: Date;
}): Prisma.PaymentWhereInput => ({
  status: { in: PAID_GROSS_STATUSES },
  paidAt: dateFilter ? { ...dateFilter, not: null } : { not: null },
});

const refundBreakdownOrderInclude = {
  order: {
    select: {
      items: {
        select: {
          finalPrice: true,
          package: {
            select: {
              course: {
                select: {
                  teacherProfileId: true,
                  teacherProfile: {
                    select: { commissionRate: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.RefundSelect;

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

    const [
      teacherProfiles,
      paidGrossPayments,
      completedOrderRefunds,
      directRefundedPayments,
      activePayouts,
    ] = await Promise.all([
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
        where: buildPaidGrossPaymentWhere(dateFilter),
        select: {
          amount: true,
          teacherEarning: true,
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
          ...refundBreakdownOrderInclude,
        },
      }),
      prisma.payment.findMany({
        where: {
          status: PaymentStatus.REFUNDED,
          orderId: null,
          paidAt: { not: null },
          ...(dateFilter ? { updatedAt: dateFilter } : {}),
        },
        select: {
          amount: true,
          teacherEarning: true,
          package: {
            select: {
              course: { select: { teacherProfileId: true } },
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

    const allRefunds: SettlementRefundRecord[] = [
      ...completedOrderRefunds,
      ...directRefundedPayments,
    ];

    return computeTeacherSettlementsSummary({
      teachers: teacherProfiles.map((profile) => ({
        id: profile.id,
        userId: profile.userId,
        commissionRate: profile.commissionRate,
        totalStudents: profile.totalStudents,
        courseCount: profile._count.courses,
        user: profile.user,
      })),
      payments: paidGrossPayments,
      refunds: allRefunds,
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

    const [payments, completedOrderRefunds, directRefundedPayments] =
      await Promise.all([
        prisma.payment.findMany({
          where: buildPaidGrossPaymentWhere(dateFilter),
          include: {
            user: { select: { firstName: true, lastName: true } },
            package: { include: { course: { select: { title: true } } } },
            order: {
              include: {
                items: {
                  include: {
                    package: {
                      include: { course: { select: { title: true } } },
                    },
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
                items: {
                  include: {
                    package: {
                      include: {
                        course: {
                          select: {
                            teacherProfileId: true,
                            teacherProfile: {
                              select: { commissionRate: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { completedAt: "desc" },
          take: 500,
        }),
        prisma.payment.findMany({
          where: {
            status: PaymentStatus.REFUNDED,
            orderId: null,
            paidAt: { not: null },
            ...(dateFilter ? { updatedAt: dateFilter } : {}),
          },
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
          orderBy: { updatedAt: "desc" },
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

    const exportRefunds = [
      ...completedOrderRefunds.map((r) => ({
        id: r.id,
        date: (r.completedAt ?? r.processedAt)?.toISOString() || "",
        userName:
          `${r.order?.user?.firstName || ""} ${r.order?.user?.lastName || ""}`.trim(),
        amount: roundCurrency(Number(r.amount)),
        status: r.status,
        method: r.refundMethod,
      })),
      ...directRefundedPayments.map((p) => ({
        id: p.id,
        date: p.updatedAt.toISOString(),
        userName: `${p.user?.firstName || ""} ${p.user?.lastName || ""}`.trim(),
        amount: roundCurrency(Number(p.amount)),
        status: RefundStatus.COMPLETED,
        method: "ORIGINAL_PAYMENT",
      })),
    ];

    const totalRevenue = roundCurrency(
      exportPayments.reduce((sum, item) => sum + item.amount, 0),
    );
    const grossPlatformEarnings = roundCurrency(
      exportPayments.reduce((sum, item) => sum + item.platformCommission, 0),
    );
    const grossTeacherEarnings = roundCurrency(
      exportPayments.reduce((sum, item) => sum + item.teacherEarning, 0),
    );

    const refundBreakdowns = [
      ...completedOrderRefunds.map((r) =>
        resolveRefundCommissionBreakdown(r, defaultCommissionRate),
      ),
      ...directRefundedPayments.map((p) =>
        resolveRefundCommissionBreakdown(p, defaultCommissionRate),
      ),
    ];
    const totalRefunds = roundCurrency(
      refundBreakdowns.reduce((sum, item) => sum + item.amount, 0),
    );
    const refundedPlatformEarnings = roundCurrency(
      refundBreakdowns.reduce((sum, item) => sum + item.platformCommission, 0),
    );
    const refundedTeacherEarnings = roundCurrency(
      refundBreakdowns.reduce((sum, item) => sum + item.teacherEarning, 0),
    );

    return {
      payments: exportPayments,
      refunds: exportRefunds,
      summary: {
        period: filter?.startDate
          ? `${filter.startDate} to ${filter.endDate || "now"}`
          : "All Time",
        totalRevenue,
        platformEarnings: roundCurrency(
          grossPlatformEarnings - refundedPlatformEarnings,
        ),
        teacherEarnings: roundCurrency(
          grossTeacherEarnings - refundedTeacherEarnings,
        ),
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
    const paidWhere = buildPaidGrossPaymentWhere(dateFilter);

    const [
      paymentAgg,
      paymentCount,
      completedOrderRefunds,
      directRefundedPayments,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: paidWhere,
        _sum: {
          amount: true,
          platformCommission: true,
          teacherEarning: true,
        },
      }),
      prisma.payment.count({ where: paidWhere }),
      prisma.refund.findMany({
        where: {
          status: RefundStatus.COMPLETED,
          ...(dateFilter ? { completedAt: dateFilter } : {}),
        },
        select: {
          amount: true,
          ...refundBreakdownOrderInclude,
        },
      }),
      prisma.payment.findMany({
        where: {
          status: PaymentStatus.REFUNDED,
          orderId: null,
          paidAt: { not: null },
          ...(dateFilter ? { updatedAt: dateFilter } : {}),
        },
        select: {
          amount: true,
          platformCommission: true,
          teacherEarning: true,
        },
      }),
    ]);

    const grossBreakdown = resolvePaymentCommissionBreakdown(
      {
        amount: paymentAgg._sum.amount,
        platformCommission: paymentAgg._sum.platformCommission,
        teacherEarning: paymentAgg._sum.teacherEarning,
      },
      defaultCommissionRate,
    );

    const refundBreakdowns = [
      ...completedOrderRefunds.map((r) =>
        resolveRefundCommissionBreakdown(r, defaultCommissionRate),
      ),
      ...directRefundedPayments.map((p) =>
        resolveRefundCommissionBreakdown(p, defaultCommissionRate),
      ),
    ];

    const totalRefunds = roundCurrency(
      refundBreakdowns.reduce((sum, item) => sum + item.amount, 0),
    );
    const refundedPlatformCommission = roundCurrency(
      refundBreakdowns.reduce((sum, item) => sum + item.platformCommission, 0),
    );
    const refundedTeacherEarning = roundCurrency(
      refundBreakdowns.reduce((sum, item) => sum + item.teacherEarning, 0),
    );

    return {
      period: label,
      totalRevenue: grossBreakdown.amount,
      platformEarnings: roundCurrency(
        grossBreakdown.platformCommission - refundedPlatformCommission,
      ),
      teacherEarnings: roundCurrency(
        grossBreakdown.teacherEarning - refundedTeacherEarning,
      ),
      totalRefunds,
      netRevenue: roundCurrency(grossBreakdown.amount - totalRefunds),
      transactionCount: paymentCount,
      refundCount: completedOrderRefunds.length + directRefundedPayments.length,
    };
  }
}

export default new FinancialReportService();

import {
  PaymentStatus,
  RefundStatus,
} from "@prisma/client";
import prisma from "../config/database";
import config from "../config/env";

// ================================
// TYPES
// ================================

interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

interface FinancialSummary {
  period: string;
  totalRevenue: number;
  platformEarnings: number;
  teacherEarnings: number;
  totalRefunds: number;
  netRevenue: number;
  transactionCount: number;
  refundCount: number;
}

interface TeacherSettlement {
  teacherProfileId: string;
  teacherName: string;
  teacherEmail: string;
  totalEarnings: number;
  totalRefundDeductions: number;
  pendingPayouts: number;
  netSettlement: number;
  totalStudents: number;
  courseCount: number;
  commissionRate: number | null;
}

interface FinancialReportSummary {
  daily: FinancialSummary;
  weekly: FinancialSummary;
  monthly: FinancialSummary;
  allTime: FinancialSummary;
}

// ================================
// HELPERS
// ================================

const roundCurrency = (value: number): number =>
  Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object" && "toNumber" in value) {
    const n = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

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
  if (!filter?.startDate && !filter?.endDate) return undefined;
  const result: { gte?: Date; lte?: Date } = {};
  if (filter.startDate) result.gte = new Date(filter.startDate);
  if (filter.endDate) {
    const end = new Date(filter.endDate);
    end.setHours(23, 59, 59, 999);
    result.lte = end;
  }
  return result;
};

// ================================
// SERVICE
// ================================

class FinancialReportService {
  /**
   * Get auto-generated financial summary for daily/weekly/monthly/all-time periods.
   */
  async getFinancialSummary(): Promise<FinancialReportSummary> {
    const now = new Date();
    const startOfDay = getStartOfDay(now);
    const startOfWeek = getStartOfWeek(now);
    const startOfMonth = getStartOfMonth(now);

    const [daily, weekly, monthly, allTime] = await Promise.all([
      this.computeSummaryForPeriod("Today", startOfDay),
      this.computeSummaryForPeriod("This Week", startOfWeek),
      this.computeSummaryForPeriod("This Month", startOfMonth),
      this.computeSummaryForPeriod("All Time"),
    ]);

    return { daily, weekly, monthly, allTime };
  }

  /**
   * Get auto-computed teacher settlements.
   */
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
    const page = Math.max(1, filter?.page || 1);
    const limit = Math.min(100, Math.max(1, filter?.limit || 20));
    const skip = (page - 1) * limit;

    const dateFilter = buildDateFilter(filter);

    const teacherProfiles = await prisma.teacherProfile.findMany({
      where: {
        registrationStatus: "APPROVED",
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        courses: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { totalEarnings: "desc" },
      skip,
      take: limit,
    });

    const totalCount = await prisma.teacherProfile.count({
      where: { registrationStatus: "APPROVED" },
    });

    const platformCommissionRate = config.PLATFORM_COMMISSION_RATE || 10;

    const settlements: TeacherSettlement[] = await Promise.all(
      teacherProfiles.map(async (profile) => {
        const paymentWhere = {
          status: PaymentStatus.COMPLETED,
          ...(dateFilter ? { paidAt: dateFilter } : {}),
          package: {
            course: {
              teacherProfileId: profile.id,
            },
          },
        };

        const completedPayments = await prisma.payment.aggregate({
          where: paymentWhere,
          _sum: { amount: true },
        });

        const totalGrossEarnings = roundCurrency(
          toNumber(completedPayments._sum.amount),
        );
        const commissionRate = profile.commissionRate
          ? toNumber(profile.commissionRate)
          : platformCommissionRate;
        const totalEarnings = roundCurrency(
          totalGrossEarnings * ((100 - commissionRate) / 100),
        );

        const refundDeductions = await prisma.refund.aggregate({
          where: {
            status: RefundStatus.COMPLETED,
            ...(dateFilter ? { completedAt: dateFilter } : {}),
            order: {
              items: {
                some: {
                  package: {
                    course: {
                      teacherProfileId: profile.id,
                    },
                  },
                },
              },
            },
          },
          _sum: { amount: true },
        });

        const totalRefundDeductions = roundCurrency(
          toNumber(refundDeductions._sum.amount) *
            ((100 - commissionRate) / 100),
        );

        const pendingPayouts = await prisma.payoutRequest.aggregate({
          where: {
            wallet: { userId: profile.userId },
            status: { in: ["PENDING", "APPROVED", "PROCESSING"] },
          },
          _sum: { amount: true },
        });

        const pendingPayoutAmount = roundCurrency(
          toNumber(pendingPayouts._sum?.amount),
        );

        return {
          teacherProfileId: profile.id,
          teacherName: `${profile.user.firstName} ${profile.user.lastName}`,
          teacherEmail: profile.user.email,
          totalEarnings,
          totalRefundDeductions,
          pendingPayouts: pendingPayoutAmount,
          netSettlement: roundCurrency(
            totalEarnings - totalRefundDeductions - pendingPayoutAmount,
          ),
          totalStudents: profile.totalStudents,
          courseCount: profile.courses.length,
          commissionRate: profile.commissionRate
            ? toNumber(profile.commissionRate)
            : null,
        };
      }),
    );

    const totals = settlements.reduce(
      (acc, s) => ({
        totalEarnings: roundCurrency(acc.totalEarnings + s.totalEarnings),
        totalRefundDeductions: roundCurrency(
          acc.totalRefundDeductions + s.totalRefundDeductions,
        ),
        totalNetSettlement: roundCurrency(
          acc.totalNetSettlement + s.netSettlement,
        ),
      }),
      { totalEarnings: 0, totalRefundDeductions: 0, totalNetSettlement: 0 },
    );

    return {
      settlements,
      totals,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
    };
  }

  /**
   * Export financial data for a given date range.
   */
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

    const payments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        ...(dateFilter ? { paidAt: dateFilter } : {}),
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
    });

    const refunds = await prisma.refund.findMany({
      where: {
        status: { in: [RefundStatus.COMPLETED, RefundStatus.APPROVED] },
        ...(dateFilter ? { processedAt: dateFilter } : {}),
      },
      include: {
        order: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { processedAt: "desc" },
      take: 500,
    });

    const platformCommissionRate = config.PLATFORM_COMMISSION_RATE || 10;

    const exportPayments = payments.map((p) => {
      const amount = roundCurrency(toNumber(p.amount));
      const platformCommission = roundCurrency(
        amount * (platformCommissionRate / 100),
      );
      const teacherEarning = roundCurrency(amount - platformCommission);
      const courseName =
        p.package?.course?.title ||
        p.order?.items
          ?.map((i) => i.package?.course?.title)
          .filter(Boolean)
          .join(", ") ||
        "-";

      return {
        id: p.id,
        date: p.paidAt?.toISOString() || "",
        userName: `${p.user?.firstName || ""} ${p.user?.lastName || ""}`.trim(),
        courseName,
        amount,
        platformCommission,
        teacherEarning,
        status: p.status,
      };
    });

    const exportRefunds = refunds.map((r) => ({
      id: r.id,
      date: r.processedAt?.toISOString() || "",
      userName:
        `${r.order?.user?.firstName || ""} ${r.order?.user?.lastName || ""}`.trim(),
      amount: roundCurrency(toNumber(r.amount)),
      status: r.status,
      method: r.refundMethod,
    }));

    const totalRevenue = exportPayments.reduce((s, p) => s + p.amount, 0);
    const totalRefunds = exportRefunds.reduce((s, r) => s + r.amount, 0);

    const summary: FinancialSummary = {
      period: filter?.startDate
        ? `${filter.startDate} to ${filter.endDate || "now"}`
        : "All Time",
      totalRevenue: roundCurrency(totalRevenue),
      platformEarnings: roundCurrency(
        totalRevenue * (platformCommissionRate / 100),
      ),
      teacherEarnings: roundCurrency(
        totalRevenue * ((100 - platformCommissionRate) / 100),
      ),
      totalRefunds: roundCurrency(totalRefunds),
      netRevenue: roundCurrency(totalRevenue - totalRefunds),
      transactionCount: exportPayments.length,
      refundCount: exportRefunds.length,
    };

    return { payments: exportPayments, refunds: exportRefunds, summary };
  }

  // ================================
  // PRIVATE HELPERS
  // ================================

  private async computeSummaryForPeriod(
    label: string,
    since?: Date,
  ): Promise<FinancialSummary> {
    const dateFilter = since ? { gte: since } : undefined;

    const [paymentAgg, paymentCount, refundAgg, refundCount] =
      await Promise.all([
        prisma.payment.aggregate({
          where: {
            status: PaymentStatus.COMPLETED,
            ...(dateFilter ? { paidAt: dateFilter } : {}),
          },
          _sum: { amount: true },
        }),
        prisma.payment.count({
          where: {
            status: PaymentStatus.COMPLETED,
            ...(dateFilter ? { paidAt: dateFilter } : {}),
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
      ]);

    const totalRevenue = roundCurrency(toNumber(paymentAgg._sum.amount));
    const totalRefunds = roundCurrency(toNumber(refundAgg._sum.amount));
    const platformCommissionRate = config.PLATFORM_COMMISSION_RATE || 10;

    return {
      period: label,
      totalRevenue,
      platformEarnings: roundCurrency(
        totalRevenue * (platformCommissionRate / 100),
      ),
      teacherEarnings: roundCurrency(
        totalRevenue * ((100 - platformCommissionRate) / 100),
      ),
      totalRefunds,
      netRevenue: roundCurrency(totalRevenue - totalRefunds),
      transactionCount: paymentCount,
      refundCount,
    };
  }
}

export default new FinancialReportService();

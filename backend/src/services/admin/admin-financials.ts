import { PaymentStatus, Prisma, RefundStatus } from "@prisma/client";
import config from "../../config/env";
import prisma from "../../config/database";
import { ValidationError } from "../../utils/errors";
import {
  adminFinancialPaymentsInclude,
  buildTeacherCommissionWhere,
  createUserAuditLog,
  ensureCommissionRateInRange,
  requireTeacherProfile,
  requireTeacherUser,
  teacherCommissionListSelect,
} from "./admin-user-helpers";
import {
  buildRevenueAnalytics,
  buildSettlementRows,
  createCompletedPaymentWhere,
  createPaidOrRefundedPaymentWhere,
  createPaymentUserRelationFilter,
  settlementPaymentInclude,
} from "./admin-metrics";
import { buildPaginationMeta, normalizePagination } from "../shared/pagination";
import { toNullableNumber } from "../shared/payment-utils";
import {
  resolvePaymentCommissionBreakdown,
  resolveRefundCommissionBreakdown,
  roundCurrency,
} from "../shared/settlement-calculator";
import { validateDateRange } from "../shared/service-helpers";

type RevenueGroupBy = "day" | "week" | "month";

const normalizeRevenueGroupBy = (groupBy?: RevenueGroupBy): RevenueGroupBy => {
  if (!groupBy) return "day";
  if (groupBy === "day" || groupBy === "week" || groupBy === "month") {
    return groupBy;
  }
  throw new ValidationError(
    "Revenue analytics groupBy must be day, week, or month",
  );
};

export const getAdminFinancials = async (startDate?: Date, endDate?: Date) => {
  validateDateRange(startDate, endDate);
  const paidWhere = createPaidOrRefundedPaymentWhere(startDate, endDate);
  const refundDateFilter =
    startDate || endDate
      ? {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        }
      : undefined;
  const defaultCommissionRate = config.PLATFORM_COMMISSION_RATE ?? 10;

  const [payments, grossTotals, completedRefunds, directRefundedPayments] =
    await Promise.all([
      prisma.payment.findMany({
        where: paidWhere,
        include: adminFinancialPaymentsInclude,
        orderBy: { paidAt: "desc" },
        take: 100,
      }),
      prisma.payment.aggregate({
        where: paidWhere,
        _sum: {
          amount: true,
          platformCommission: true,
          teacherEarning: true,
        },
        _count: true,
      }),
      prisma.refund.findMany({
        where: {
          status: RefundStatus.COMPLETED,
          ...(refundDateFilter ? { completedAt: refundDateFilter } : {}),
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
      }),
      prisma.payment.findMany({
        where: {
          status: PaymentStatus.REFUNDED,
          orderId: null,
          paidAt: { not: null },
          ...(refundDateFilter ? { updatedAt: refundDateFilter } : {}),
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
      amount: grossTotals._sum.amount,
      platformCommission: grossTotals._sum.platformCommission,
      teacherEarning: grossTotals._sum.teacherEarning,
    },
    defaultCommissionRate,
  );

  const refundBreakdowns = [
    ...completedRefunds.map((refund) =>
      resolveRefundCommissionBreakdown(refund, defaultCommissionRate),
    ),
    ...directRefundedPayments.map((payment) =>
      resolveRefundCommissionBreakdown(payment, defaultCommissionRate),
    ),
  ];

  const refundedGross = roundCurrency(
    refundBreakdowns.reduce((sum, item) => sum + item.amount, 0),
  );
  const refundedCommission = roundCurrency(
    refundBreakdowns.reduce((sum, item) => sum + item.platformCommission, 0),
  );
  const refundedTeacher = roundCurrency(
    refundBreakdowns.reduce((sum, item) => sum + item.teacherEarning, 0),
  );

  return {
    totals: {
      totalRevenue: Math.max(
        0,
        roundCurrency(grossBreakdown.amount - refundedGross),
      ),
      platformEarnings: Math.max(
        0,
        roundCurrency(grossBreakdown.platformCommission - refundedCommission),
      ),
      teacherEarnings: Math.max(
        0,
        roundCurrency(grossBreakdown.teacherEarning - refundedTeacher),
      ),
      transactionCount: grossTotals._count,
    },
    recentPayments: payments,
  };
};

export const getAdminSettlements = async (
  params: {
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {},
) => {
  const { startDate, endDate, page = 1, limit = 20 } = params;
  validateDateRange(startDate, endDate);

  const pagination = normalizePagination(page, limit, {
    defaultLimit: 20,
    maxLimit: 100,
  });

  const payments = await prisma.payment.findMany({
    where: createCompletedPaymentWhere(startDate, endDate),
    include: settlementPaymentInclude,
    orderBy: { paidAt: "desc" },
  });

  return buildSettlementRows({
    payments,
    defaultCommissionRate: config.PLATFORM_COMMISSION_RATE,
    page: pagination.page,
    limit: pagination.limit,
  });
};

export const getAdminInvoices = async (
  params: {
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    search?: string;
  } = {},
) => {
  const { startDate, endDate, page = 1, limit = 20 } = params;
  const search = params.search?.trim();

  validateDateRange(startDate, endDate);

  const baseWhere = createPaidOrRefundedPaymentWhere(startDate, endDate);
  const userRelationFilter = createPaymentUserRelationFilter(search);
  const where: Prisma.PaymentWhereInput = userRelationFilter
    ? { ...baseWhere, user: userRelationFilter }
    : baseWhere;

  const pagination = normalizePagination(page, limit, {
    defaultLimit: 20,
    maxLimit: 100,
  });

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: adminFinancialPaymentsInclude,
      orderBy: { paidAt: "desc" },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    items: payments,
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const getAdminRevenueAnalytics = async (
  params: {
    startDate?: Date;
    endDate?: Date;
    groupBy?: RevenueGroupBy;
  } = {},
) => {
  const { startDate, endDate } = params;
  const groupBy = normalizeRevenueGroupBy(params.groupBy);

  validateDateRange(startDate, endDate);

  const payments = await prisma.payment.findMany({
    where: createCompletedPaymentWhere(startDate, endDate),
    include: settlementPaymentInclude,
    orderBy: { paidAt: "asc" },
  });

  return buildRevenueAnalytics({
    payments,
    groupBy,
    defaultCommissionRate: config.PLATFORM_COMMISSION_RATE,
  });
};

export const getAdminTeacherCommissions = async (
  filters: {
    search?: string;
    page?: number;
    limit?: number;
  } = {},
) => {
  const { page = 1, limit = 20 } = filters;
  const pagination = normalizePagination(page, limit, {
    defaultLimit: 20,
    maxLimit: 100,
  });
  const where = buildTeacherCommissionWhere(filters.search);

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      select: teacherCommissionListSelect,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: rows,
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const updateAdminTeacherCommission = async (
  userId: string,
  adminId: string,
  commissionRate: number | null,
) => {
  await requireTeacherUser(userId);
  ensureCommissionRateInRange(commissionRate);

  const profile = await requireTeacherProfile(userId);
  const oldCommissionRate = toNullableNumber(profile.commissionRate);

  return prisma.$transaction(async (tx) => {
    const updatedProfile = await tx.teacherProfile.update({
      where: { id: profile.id },
      data: {
        commissionRate:
          commissionRate === null ? null : new Prisma.Decimal(commissionRate),
      },
    });

    await createUserAuditLog(
      {
        adminId,
        userId,
        action: "UPDATE_COMMISSION",
        oldValues: { commissionRate: oldCommissionRate },
        newValues: { commissionRate },
      },
      tx,
    );

    return updatedProfile;
  });
};

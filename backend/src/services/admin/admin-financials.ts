import { Prisma } from "@prisma/client";
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
  createPaidPaymentWhere,
  createPaymentUserRelationFilter,
  getPaymentRetainedRatio,
  settlementPaymentInclude,
} from "./admin-metrics";
import { buildPaginationMeta, normalizePagination } from "../shared/pagination";
import { roundMoney, toNullableNumber, toNumber } from "../shared/payment-utils";
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
  const where = createPaidPaymentWhere(startDate, endDate);

  const [recentPayments, allPaidForTotals] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: adminFinancialPaymentsInclude,
      orderBy: { paidAt: "desc" },
      take: 100,
    }),
    prisma.payment.findMany({
      where,
      select: {
        amount: true,
        platformCommission: true,
        teacherEarning: true,
        status: true,
        orderId: true,
        order: {
          select: {
            refunds: {
              where: { status: "COMPLETED" },
              select: { amount: true, completedAt: true },
            },
          },
        },
      },
    }),
  ]);

  let totalRevenue = 0;
  let platformEarnings = 0;
  let teacherEarnings = 0;

  for (const payment of allPaidForTotals) {
    const retainedRatio = getPaymentRetainedRatio(payment);
    if (retainedRatio <= 0) {
      continue;
    }

    totalRevenue += toNumber(payment.amount) * retainedRatio;
    platformEarnings += toNumber(payment.platformCommission) * retainedRatio;
    teacherEarnings += toNumber(payment.teacherEarning) * retainedRatio;
  }

  return {
    totals: {
      totalRevenue: roundMoney(totalRevenue),
      platformEarnings: roundMoney(platformEarnings),
      teacherEarnings: roundMoney(teacherEarnings),
      transactionCount: allPaidForTotals.length,
    },
    recentPayments,
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
    where: createPaidPaymentWhere(startDate, endDate),
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

  const baseWhere = createPaidPaymentWhere(startDate, endDate);
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
    where: createPaidPaymentWhere(startDate, endDate),
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

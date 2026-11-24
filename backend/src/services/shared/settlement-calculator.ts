import { buildPaginationMeta, normalizePagination } from "./pagination";
import {
  allocateOrderItemAmounts,
  calculatePlatformCommission,
  calculateTeacherNetEarning,
  roundMoney,
  toNumber,
} from "./payment-utils";

export interface TeacherSettlement {
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

export interface SettlementTeacherRecord {
  id: string;
  userId: string;
  commissionRate: unknown;
  totalStudents: number;
  courseCount: number;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface SettlementPaymentRecord {
  amount: unknown;
  teacherEarning: unknown;
  package?: {
    course?: {
      teacherProfileId: string;
    } | null;
  } | null;
  order?: {
    items: Array<{
      finalPrice: unknown;
      package?: {
        course?: {
          teacherProfileId: string;
        } | null;
      } | null;
    }>;
  } | null;
}

export interface SettlementRefundRecord {
  amount: unknown;
  teacherEarning?: unknown;
  package?: {
    course?: {
      teacherProfileId: string;
    } | null;
  } | null;
  order?: {
    items: Array<{
      finalPrice: unknown;
      package?: {
        course?: {
          teacherProfileId: string;
          teacherProfile?: { commissionRate?: unknown } | null;
        } | null;
      } | null;
    }>;
  } | null;
}

export interface SettlementPendingPayoutRecord {
  userId: string;
  amount: unknown;
}

export const roundCurrency = (value: number): number =>
  roundMoney(Number.isFinite(value) ? value : 0);

export const resolvePaymentCommissionBreakdown = (
  payment: {
    amount: unknown;
    platformCommission: unknown;
    teacherEarning: unknown;
  },
  fallbackRate: number,
): { amount: number; platformCommission: number; teacherEarning: number } => {
  const amount = roundCurrency(toNumber(payment.amount));
  const storedCommission = roundCurrency(toNumber(payment.platformCommission));
  const storedTeacherEarning = roundCurrency(toNumber(payment.teacherEarning));

  if (
    amount === 0 ||
    roundCurrency(storedCommission + storedTeacherEarning) > 0
  ) {
    return {
      amount,
      platformCommission: storedCommission,
      teacherEarning: storedTeacherEarning,
    };
  }

  const platformCommission = calculatePlatformCommission(
    amount,
    null,
    fallbackRate,
  );
  return {
    amount,
    platformCommission,
    teacherEarning: roundCurrency(amount - platformCommission),
  };
};

export const resolveRefundCommissionBreakdown = (
  refund: SettlementRefundRecord & { platformCommission?: unknown },
  fallbackRate: number,
): { amount: number; platformCommission: number; teacherEarning: number } => {
  const refundAmount = roundCurrency(Math.max(0, toNumber(refund.amount)));
  if (refundAmount <= 0) {
    return { amount: 0, platformCommission: 0, teacherEarning: 0 };
  }

  const items = refund.order?.items ?? [];
  if (items.length === 0) {
    return resolvePaymentCommissionBreakdown(
      {
        amount: refundAmount,
        platformCommission: refund.platformCommission ?? 0,
        teacherEarning: refund.teacherEarning ?? 0,
      },
      fallbackRate,
    );
  }

  let totalTeacherShare = 0;

  for (const { item, allocatedAmount: itemRefundGross } of allocateOrderItemAmounts(
    items,
    refundAmount,
    { equalFallbackWhenZeroItemsTotal: true },
  )) {
    const teacherProfile = item.package?.course?.teacherProfile ?? null;
    const itemTeacherShare = roundCurrency(
      calculateTeacherNetEarning(itemRefundGross, teacherProfile, fallbackRate),
    );
    totalTeacherShare = roundCurrency(totalTeacherShare + itemTeacherShare);
  }

  const clampedTeacherShare = Math.min(refundAmount, totalTeacherShare);
  return {
    amount: refundAmount,
    platformCommission: roundCurrency(refundAmount - clampedTeacherShare),
    teacherEarning: clampedTeacherShare,
  };
};

/**
 * Pure settlement aggregation across both direct package payments and
 * multi-item cart/order payments, with proportional item-share refund deductions
 * and full-dataset totals independent of pagination.
 */
export const computeTeacherSettlementsSummary = (params: {
  teachers: SettlementTeacherRecord[];
  payments: SettlementPaymentRecord[];
  refunds: SettlementRefundRecord[];
  pendingPayouts: SettlementPendingPayoutRecord[];
  defaultCommissionRate: number;
  page: number;
  limit: number;
}) => {
  const {
    teachers,
    payments,
    refunds,
    pendingPayouts,
    defaultCommissionRate,
    page,
    limit,
  } = params;

  const teacherById = new Map(
    teachers.map((teacher) => [teacher.id, teacher]),
  );
  const earningsByProfileId = new Map<string, number>();
  const refundDeductionsByProfileId = new Map<string, number>();
  const pendingPayoutsByUserId = new Map<string, number>();

  for (const payment of payments) {
    if (payment.order && payment.order.items.length > 0) {
      for (const item of payment.order.items) {
        const teacherProfileId = item.package?.course?.teacherProfileId;
        if (!teacherProfileId || !teacherById.has(teacherProfileId)) {
          continue;
        }
        const profile = teacherById.get(teacherProfileId)!;
        const itemNet = calculateTeacherNetEarning(
          item.finalPrice,
          profile,
          defaultCommissionRate,
        );
        earningsByProfileId.set(
          teacherProfileId,
          (earningsByProfileId.get(teacherProfileId) ?? 0) + itemNet,
        );
      }
      continue;
    }

    const directProfileId = payment.package?.course?.teacherProfileId;
    if (!directProfileId || !teacherById.has(directProfileId)) {
      continue;
    }

    const profile = teacherById.get(directProfileId)!;
    const storedNet = toNumber(payment.teacherEarning);
    const grossAmount = toNumber(payment.amount);
    const effectiveNet =
      storedNet > 0 || grossAmount === 0
        ? storedNet
        : calculateTeacherNetEarning(
            grossAmount,
            profile,
            defaultCommissionRate,
          );

    earningsByProfileId.set(
      directProfileId,
      (earningsByProfileId.get(directProfileId) ?? 0) + effectiveNet,
    );
  }

  for (const refund of refunds) {
    const refundAmount = roundCurrency(Math.max(0, toNumber(refund.amount)));
    if (refundAmount <= 0) {
      continue;
    }

    const items = refund.order?.items ?? [];
    if (items.length === 0) {
      const directProfileId = refund.package?.course?.teacherProfileId;
      if (!directProfileId || !teacherById.has(directProfileId)) {
        continue;
      }
      const profile = teacherById.get(directProfileId)!;
      const storedNet = toNumber(refund.teacherEarning);
      const effectiveDeduction =
        storedNet > 0
          ? storedNet
          : calculateTeacherNetEarning(
              refundAmount,
              profile,
              defaultCommissionRate,
            );
      refundDeductionsByProfileId.set(
        directProfileId,
        (refundDeductionsByProfileId.get(directProfileId) ?? 0) +
          effectiveDeduction,
      );
      continue;
    }

    for (const { item, allocatedAmount: itemRefundGross } of allocateOrderItemAmounts(
      items,
      refundAmount,
      { equalFallbackWhenZeroItemsTotal: true },
    )) {
      const teacherProfileId = item.package?.course?.teacherProfileId;
      if (!teacherProfileId || !teacherById.has(teacherProfileId)) {
        continue;
      }

      const profile = teacherById.get(teacherProfileId)!;
      const itemRefundTeacherShare = roundCurrency(
        calculateTeacherNetEarning(
          itemRefundGross,
          profile,
          defaultCommissionRate,
        ),
      );

      refundDeductionsByProfileId.set(
        teacherProfileId,
        (refundDeductionsByProfileId.get(teacherProfileId) ?? 0) +
          itemRefundTeacherShare,
      );
    }
  }

  for (const payout of pendingPayouts) {
    const amount = toNumber(payout.amount);
    if (amount > 0) {
      pendingPayoutsByUserId.set(
        payout.userId,
        (pendingPayoutsByUserId.get(payout.userId) ?? 0) + amount,
      );
    }
  }

  const allSettlements: TeacherSettlement[] = teachers.map((profile) => {
    const totalEarnings = roundCurrency(
      earningsByProfileId.get(profile.id) ?? 0,
    );
    const totalRefundDeductions = roundCurrency(
      refundDeductionsByProfileId.get(profile.id) ?? 0,
    );
    const pendingPayoutAmount = roundCurrency(
      pendingPayoutsByUserId.get(profile.userId) ?? 0,
    );

    return {
      teacherProfileId: profile.id,
      teacherName: `${profile.user.firstName} ${profile.user.lastName}`.trim(),
      teacherEmail: profile.user.email,
      totalEarnings,
      totalRefundDeductions,
      pendingPayouts: pendingPayoutAmount,
      netSettlement: roundCurrency(
        totalEarnings - totalRefundDeductions - pendingPayoutAmount,
      ),
      totalStudents: profile.totalStudents,
      courseCount: profile.courseCount,
      commissionRate:
        profile.commissionRate !== null && profile.commissionRate !== undefined
          ? toNumber(profile.commissionRate)
          : null,
    };
  });

  const totals = allSettlements.reduce(
    (acc, item) => ({
      totalEarnings: roundCurrency(acc.totalEarnings + item.totalEarnings),
      totalRefundDeductions: roundCurrency(
        acc.totalRefundDeductions + item.totalRefundDeductions,
      ),
      totalNetSettlement: roundCurrency(
        acc.totalNetSettlement + item.netSettlement,
      ),
    }),
    { totalEarnings: 0, totalRefundDeductions: 0, totalNetSettlement: 0 },
  );

  const pagination = normalizePagination(page, limit, {
    defaultLimit: 20,
    maxLimit: 100,
  });

  return {
    settlements: allSettlements.slice(
      pagination.skip,
      pagination.skip + pagination.limit,
    ),
    totals,
    pagination: buildPaginationMeta(
      allSettlements.length,
      pagination.page,
      pagination.limit,
    ),
  };
};

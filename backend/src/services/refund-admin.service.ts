import {
  RefundStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  RefundMethod,
  WalletTransactionSource,
  WalletTransactionType,
} from "@prisma/client";
import prisma from "../config/database";
import config from "../config/env";
import logger from "../utils/logger";
import { NotFoundError, ValidationError } from "../utils/errors";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";
import { calculateTeacherNetEarning, toNumber } from "./shared/payment-utils";
import { countDistinctActiveStudentsForTeacherProfile } from "./shared/enrollment-access";

const refundOrderUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const refundWithOrderUserInclude = {
  order: {
    include: {
      user: {
        select: refundOrderUserSelect,
      },
    },
  },
} satisfies Prisma.RefundInclude;

const refundWithOrderItemsInclude = {
  order: {
    include: {
      user: {
        select: refundOrderUserSelect,
      },
      items: {
        include: {
          package: {
            include: {
              course: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.RefundInclude;

type RefundWithOrderUser = Prisma.RefundGetPayload<{
  include: typeof refundWithOrderUserInclude;
}>;

type RefundWithOrderItems = Prisma.RefundGetPayload<{
  include: typeof refundWithOrderItemsInclude;
}>;

type TeacherRefundAdjustment = {
  teacherProfileId: string;
  teacherUserId: string;
  orderItemId: string;
  amount: number;
};

const REFUND_STATUSES = Object.values(RefundStatus) as RefundStatus[];

const roundCurrency = (value: number): number =>
  Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

const isFullyRefunded = (refundedAmount: number, orderTotal: number): boolean =>
  roundCurrency(refundedAmount) >= roundCurrency(orderTotal);

const CREDITED_TO_PLATFORM_WALLET_NOTE =
  "Refund amount was credited to the student's platform wallet.";

const normalizeRefundId = (refundId: string): string => {
  const normalizedRefundId = refundId?.trim();

  if (!normalizedRefundId) {
    throw new ValidationError("Refund ID is required");
  }

  return normalizedRefundId;
};

const normalizeOptionalNote = (note?: string): string | undefined => {
  const normalizedNote =
    note === undefined ? undefined : sanitizeUserPlainText(note);
  return normalizedNote || undefined;
};

const parseRefundStatus = (status?: string): RefundStatus | undefined => {
  const normalizedStatus = status?.trim().toUpperCase();

  if (!normalizedStatus) {
    return undefined;
  }

  if (!REFUND_STATUSES.includes(normalizedStatus as RefundStatus)) {
    throw new ValidationError(
      `Invalid refund status. Allowed values: ${REFUND_STATUSES.join(", ")}`,
    );
  }

  return normalizedStatus as RefundStatus;
};

const normalizePagination = (
  limit: number = 50,
  offset: number = 0,
): { safeLimit: number; safeOffset: number } => ({
  safeLimit:
    Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 50,
  safeOffset: Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0,
});

const fetchRefundWithOrderUser = async (
  refundId: string,
): Promise<RefundWithOrderUser> => {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: refundWithOrderUserInclude,
  });

  if (!refund) {
    throw new NotFoundError("Refund not found");
  }

  return refund;
};

const transitionRefundStatus = async (
  refundId: string,
  fromStatus: RefundStatus,
  toStatus: RefundStatus,
  data: Prisma.RefundUpdateManyMutationInput = {},
): Promise<RefundWithOrderUser> => {
  const updateResult = await prisma.refund.updateMany({
    where: {
      id: refundId,
      status: fromStatus,
    },
    data: {
      ...data,
      status: toStatus,
    },
  });

  if (updateResult.count !== 1) {
    const existingRefund = await prisma.refund.findUnique({
      where: { id: refundId },
      select: { id: true, status: true },
    });

    if (!existingRefund) {
      throw new NotFoundError("Refund not found");
    }

    throw new ValidationError(
      `Only ${fromStatus.toLowerCase()} refunds can be changed to ${toStatus.toLowerCase()}`,
    );
  }

  return fetchRefundWithOrderUser(refundId);
};

/**
 * Admin Refund Management Service
 * Handles refund approval, rejection, processing, completion, and statistics.
 */
class RefundAdminService {
  /**
   * Get all refunds with optional status filter and safe pagination.
   */
  async getAllRefunds(
    status?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{
    refunds: RefundWithOrderItems[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const parsedStatus = parseRefundStatus(status);
    const { safeLimit, safeOffset } = normalizePagination(limit, offset);

    const where: Prisma.RefundWhereInput = parsedStatus
      ? { status: parsedStatus }
      : {};

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        include: refundWithOrderItemsInclude,
        orderBy: { createdAt: "desc" },
        take: safeLimit,
        skip: safeOffset,
      }),
      prisma.refund.count({ where }),
    ]);

    return {
      refunds,
      total,
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  /**
   * Get refund by ID.
   */
  async getRefundById(refundId: string): Promise<RefundWithOrderItems> {
    const normalizedRefundId = normalizeRefundId(refundId);

    const refund = await prisma.refund.findUnique({
      where: { id: normalizedRefundId },
      include: refundWithOrderItemsInclude,
    });

    if (!refund) {
      throw new NotFoundError("Refund not found");
    }

    return refund;
  }

  /**
   * Approve a pending refund request.
   */
  async approveRefund(
    refundId: string,
    adminNotes?: string,
  ): Promise<RefundWithOrderUser> {
    const normalizedRefundId = normalizeRefundId(refundId);
    const note = normalizeOptionalNote(adminNotes);

    return transitionRefundStatus(
      normalizedRefundId,
      RefundStatus.PENDING,
      RefundStatus.APPROVED,
      {
        ...(note ? { notes: note } : {}),
        processedAt: new Date(),
      },
    );
  }

  /**
   * Reject a pending refund request.
   */
  async rejectRefund(
    refundId: string,
    rejectionReason: string,
  ): Promise<RefundWithOrderUser> {
    const normalizedRefundId = normalizeRefundId(refundId);
    const reason = normalizeOptionalNote(rejectionReason);

    if (!reason) {
      throw new ValidationError("Rejection reason is required");
    }

    return transitionRefundStatus(
      normalizedRefundId,
      RefundStatus.PENDING,
      RefundStatus.REJECTED,
      {
        notes: reason,
        processedAt: new Date(),
      },
    );
  }

  /**
   * Mark an approved refund as processing.
   */
  async markAsProcessing(
    refundId: string,
    adminNotes?: string,
  ): Promise<RefundWithOrderUser> {
    const normalizedRefundId = normalizeRefundId(refundId);
    const note = normalizeOptionalNote(adminNotes);

    return transitionRefundStatus(
      normalizedRefundId,
      RefundStatus.APPROVED,
      RefundStatus.PROCESSING,
      {
        ...(note ? { notes: note } : {}),
      },
    );
  }

  /**
   * Complete a processing refund.
   */
  async completeRefund(
    refundId: string,
    adminNotes?: string,
  ): Promise<RefundWithOrderUser> {
    const normalizedRefundId = normalizeRefundId(refundId);
    const note = normalizeOptionalNote(adminNotes);

    const teacherAdjustments = await prisma.$transaction(async (tx) => {
      const completionTime = new Date();

      const refund = await tx.refund.findUnique({
        where: { id: normalizedRefundId },
        include: {
          order: {
            include: {
              payment: true,
              items: {
                include: {
                  package: {
                    include: {
                      course: {
                        include: {
                          teacherProfile: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!refund) {
        throw new NotFoundError("Refund not found");
      }

      if (refund.status !== RefundStatus.PROCESSING) {
        throw new ValidationError("Only processing refunds can be completed");
      }

      const refundableOrderStatuses: OrderStatus[] = [
        OrderStatus.PAID,
        OrderStatus.REFUNDED,
      ];

      if (!refundableOrderStatuses.includes(refund.order.status)) {
        throw new ValidationError("Only paid orders can be refunded");
      }

      const refundAmount = roundCurrency(toNumber(refund.amount));
      if (refundAmount <= 0) {
        throw new ValidationError("Refund amount must be greater than zero");
      }

      const orderTotal = roundCurrency(toNumber(refund.order.totalAmount));
      if (orderTotal <= 0) {
        throw new ValidationError(
          "Order total amount must be greater than zero",
        );
      }

      const completedBeforeAggregate = await tx.refund.aggregate({
        where: {
          orderId: refund.orderId,
          status: RefundStatus.COMPLETED,
          id: {
            not: refund.id,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const completedBeforeAmount = roundCurrency(
        toNumber(completedBeforeAggregate._sum.amount),
      );
      const remainingRefundableAmount = roundCurrency(
        orderTotal - completedBeforeAmount,
      );

      if (refundAmount > remainingRefundableAmount) {
        throw new ValidationError(
          "Refund amount exceeds the remaining refundable amount for this order",
        );
      }

      const cumulativeRefundAmount = roundCurrency(
        completedBeforeAmount + refundAmount,
      );
      const fullyRefunded = isFullyRefunded(cumulativeRefundAmount, orderTotal);

      const transitionResult = await tx.refund.updateMany({
        where: {
          id: normalizedRefundId,
          status: RefundStatus.PROCESSING,
        },
        data: {
          status: RefundStatus.COMPLETED,
          processedAt: refund.processedAt ?? completionTime,
          completedAt: completionTime,
          ...(note ? { notes: note } : {}),
        },
      });

      if (transitionResult.count !== 1) {
        throw new ValidationError(
          "Refund status changed while completion was being processed",
        );
      }

      await tx.order.update({
        where: { id: refund.orderId },
        data: {
          status: fullyRefunded ? OrderStatus.REFUNDED : OrderStatus.PAID,
          refundedAt: completionTime,
          refundAmount: cumulativeRefundAmount,
          refundReason:
            refund.reason?.trim() || refund.order.refundReason || null,
        },
      });

      if (refund.order.payment) {
        await tx.payment.update({
          where: { id: refund.order.payment.id },
          data: {
            status: fullyRefunded
              ? PaymentStatus.REFUNDED
              : PaymentStatus.COMPLETED,
          },
        });
      }

      if (refund.refundMethod === RefundMethod.WALLET) {
        const wallet = await tx.wallet.upsert({
          where: { userId: refund.order.userId },
          update: {},
          create: { userId: refund.order.userId },
        });

        const existingWalletCredit = await tx.walletTransaction.findFirst({
          where: {
            walletId: wallet.id,
            source: WalletTransactionSource.REFUND,
            referenceId: refund.id,
          },
          select: { id: true },
        });

        if (!existingWalletCredit) {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              availableBalance: { increment: refundAmount },
            },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              amount: refundAmount,
              type: WalletTransactionType.CREDIT,
              source: WalletTransactionSource.REFUND,
              referenceId: refund.id,
              metadata: {
                refundId: refund.id,
                orderId: refund.orderId,
                refundMethod: RefundMethod.WALLET,
              },
            },
          });
        }

        if (!note) {
          await tx.refund.update({
            where: { id: refund.id },
            data: { notes: CREDITED_TO_PLATFORM_WALLET_NOTE },
          });
        }
      }

      const totalItemsAmount = roundCurrency(
        refund.order.items.reduce(
          (sum, item) => sum + toNumber(item.finalPrice),
          0,
        ),
      );
      const proportionalBase =
        totalItemsAmount > 0 ? totalItemsAmount : orderTotal;

      const adjustments: TeacherRefundAdjustment[] = [];
      const teacherEarningsAdjustments = new Map<string, number>();
      let allocatedRefundAmount = 0;

      refund.order.items.forEach((item, index) => {
        const teacherProfile = item.package?.course?.teacherProfile;
        if (!teacherProfile) {
          return;
        }

        const isLastItem = index === refund.order.items.length - 1;
        const itemPrice = roundCurrency(toNumber(item.finalPrice));
        const itemPortion = isLastItem
          ? roundCurrency(refundAmount - allocatedRefundAmount)
          : roundCurrency((itemPrice / proportionalBase) * refundAmount);

        allocatedRefundAmount = roundCurrency(
          allocatedRefundAmount + itemPortion,
        );

        const teacherNet = roundCurrency(
          calculateTeacherNetEarning(
            itemPortion,
            teacherProfile,
            config.PLATFORM_COMMISSION_RATE,
          ),
        );

        if (teacherNet <= 0) {
          return;
        }

        adjustments.push({
          teacherProfileId: teacherProfile.id,
          teacherUserId: teacherProfile.userId,
          orderItemId: item.id,
          amount: teacherNet,
        });

        teacherEarningsAdjustments.set(
          teacherProfile.id,
          roundCurrency(
            (teacherEarningsAdjustments.get(teacherProfile.id) || 0) +
              teacherNet,
          ),
        );
      });

      for (const [
        teacherProfileId,
        amount,
      ] of teacherEarningsAdjustments.entries()) {
        await tx.teacherProfile.update({
          where: { id: teacherProfileId },
          data: {
            totalEarnings: {
              decrement: amount,
            },
          },
        });
      }

      if (fullyRefunded) {
        const packageIds = refund.order.items.map((item) => item.packageId);

        if (packageIds.length > 0) {
          await tx.enrollment.updateMany({
            where: {
              userId: refund.order.userId,
              packageId: {
                in: packageIds,
              },
              isActive: true,
            },
            data: {
              isActive: false,
            },
          });
        }

        const impactedTeacherProfileIds = Array.from(
          new Set(adjustments.map((adjustment) => adjustment.teacherProfileId)),
        );

        for (const teacherProfileId of impactedTeacherProfileIds) {
          const activeStudentCount =
            await countDistinctActiveStudentsForTeacherProfile(
              tx,
              teacherProfileId,
              completionTime,
            );

          await tx.teacherProfile.update({
            where: { id: teacherProfileId },
            data: {
              totalStudents: activeStudentCount,
            },
          });
        }
      }

      return adjustments;
    });

    const updated = await fetchRefundWithOrderUser(normalizedRefundId);

    // Wallet adjustment is kept outside the DB transaction to avoid holding the transaction
    // open while external wallet logic runs. It should be idempotent in wallet.service.
    if (teacherAdjustments.length > 0) {
      try {
        const walletService = (await import("./wallet.service")).default;

        for (const adjustment of teacherAdjustments) {
          await walletService.debitForRefund(
            adjustment.teacherUserId,
            adjustment.amount,
            {
              orderItemId: adjustment.orderItemId,
              refundId: updated.id,
            },
          );
        }
      } catch (error) {
        logger.error(
          "Non-blocking wallet adjustment failed for completed refund",
          {
            refundId: updated.id,
            error,
          },
        );
      }
    }

    return updated;
  }

  /**
   * Get refund statistics.
   */
  async getRefundStats(): Promise<{
    pending: number;
    approved: number;
    processing: number;
    completed: number;
    rejected: number;
    totalRefundAmount: number;
    completedRefundAmount: number;
  }> {
    const [
      pending,
      approved,
      processing,
      completed,
      rejected,
      totalAmount,
      completedAmount,
    ] = await Promise.all([
      prisma.refund.count({ where: { status: RefundStatus.PENDING } }),
      prisma.refund.count({ where: { status: RefundStatus.APPROVED } }),
      prisma.refund.count({ where: { status: RefundStatus.PROCESSING } }),
      prisma.refund.count({ where: { status: RefundStatus.COMPLETED } }),
      prisma.refund.count({ where: { status: RefundStatus.REJECTED } }),
      prisma.refund.aggregate({
        _sum: {
          amount: true,
        },
      }),
      prisma.refund.aggregate({
        where: {
          status: RefundStatus.COMPLETED,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      pending,
      approved,
      processing,
      completed,
      rejected,
      totalRefundAmount: roundCurrency(toNumber(totalAmount._sum.amount)),
      completedRefundAmount: roundCurrency(
        toNumber(completedAmount._sum.amount),
      ),
    };
  }
}

export default new RefundAdminService();

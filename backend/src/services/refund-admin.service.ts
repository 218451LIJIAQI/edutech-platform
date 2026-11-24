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
import { NotFoundError, ValidationError } from "../utils/errors";
import logger from "../utils/logger";
import notificationService from "./notification.service";
import walletService from "./wallet.service";
import { countDistinctActiveStudentsForTeacherProfile } from "./shared/enrollment-access";
import { normalizeOffsetPagination } from "./shared/pagination";
import {
  calculateTeacherNetEarning,
  roundMoney,
  toNumber,
} from "./shared/payment-utils";
import {
  normalizeOptionalSanitizedText,
  normalizeRequiredSanitizedText,
} from "./shared/service-helpers";

const refundOrderUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const refundWithOrderUserInclude = {
  order: {
    include: {
      user: { select: refundOrderUserSelect },
    },
  },
} satisfies Prisma.RefundInclude;

const refundWithOrderItemsInclude = {
  order: {
    include: {
      user: { select: refundOrderUserSelect },
      items: {
        include: {
          package: {
            include: { course: true },
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
const CREDITED_TO_PLATFORM_WALLET_NOTE =
  "Refund amount was credited to the student's platform wallet.";

const parseRefundStatus = (status?: string): RefundStatus | undefined => {
  const normalizedStatus = status?.trim().toUpperCase();
  if (!normalizedStatus) return undefined;

  if (!REFUND_STATUSES.includes(normalizedStatus as RefundStatus)) {
    throw new ValidationError(
      `Invalid refund status. Allowed values: ${REFUND_STATUSES.join(", ")}`,
    );
  }

  return normalizedStatus as RefundStatus;
};

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
    where: { id: refundId, status: fromStatus },
    data: { ...data, status: toStatus },
  });

  if (updateResult.count !== 1) {
    const existingRefund = await prisma.refund.findUnique({
      where: { id: refundId },
      select: { id: true },
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

class RefundAdminService {
  async getAllRefunds(
    status?: string,
    limit = 50,
    offset = 0,
  ): Promise<{
    refunds: RefundWithOrderItems[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const parsedStatus = parseRefundStatus(status);
    const pagination = normalizeOffsetPagination(limit, offset, {
      defaultLimit: 50,
      maxLimit: 100,
    });
    const where: Prisma.RefundWhereInput = parsedStatus
      ? { status: parsedStatus }
      : {};

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        include: refundWithOrderItemsInclude,
        orderBy: { createdAt: "desc" },
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.refund.count({ where }),
    ]);

    return {
      refunds,
      total,
      limit: pagination.limit,
      offset: pagination.offset,
    };
  }

  async getRefundById(refundId: string): Promise<RefundWithOrderItems> {
    const normalizedRefundId = normalizeRequiredSanitizedText(
      refundId,
      "Refund ID",
    );

    const refund = await prisma.refund.findUnique({
      where: { id: normalizedRefundId },
      include: refundWithOrderItemsInclude,
    });

    if (!refund) {
      throw new NotFoundError("Refund not found");
    }

    return refund;
  }

  private async notifyStudentRefundUpdate(
    userId: string | undefined,
    title: string,
    message: string,
  ): Promise<void> {
    if (!userId) return;
    try {
      await notificationService.createNotification(
        userId,
        title,
        message,
        "refund",
      );
    } catch (error) {
      logger.warn("Failed to create refund notification", { userId, error });
    }
  }

  async approveRefund(
    refundId: string,
    adminNotes?: string,
  ): Promise<RefundWithOrderUser> {
    const note = normalizeOptionalSanitizedText(adminNotes);
    const updated = await transitionRefundStatus(
      normalizeRequiredSanitizedText(refundId, "Refund ID"),
      RefundStatus.PENDING,
      RefundStatus.APPROVED,
      {
        ...(note ? { notes: note } : {}),
        processedAt: new Date(),
      },
    );

    await this.notifyStudentRefundUpdate(
      updated.order?.user?.id,
      "Refund Request Approved",
      `Your refund request of $${roundMoney(updated.amount).toFixed(2)} for order ${updated.order?.orderNo ?? ""} has been approved and queued for settlement.`,
    );

    return updated;
  }

  async rejectRefund(
    refundId: string,
    rejectionReason: string,
  ): Promise<RefundWithOrderUser> {
    const sanitizedReason = normalizeRequiredSanitizedText(
      rejectionReason,
      "Rejection reason",
    );
    const updated = await transitionRefundStatus(
      normalizeRequiredSanitizedText(refundId, "Refund ID"),
      RefundStatus.PENDING,
      RefundStatus.REJECTED,
      {
        notes: sanitizedReason,
        processedAt: new Date(),
      },
    );

    await this.notifyStudentRefundUpdate(
      updated.order?.user?.id,
      "Refund Request Rejected",
      `Your refund request for order ${updated.order?.orderNo ?? ""} was not approved: ${sanitizedReason}`,
    );

    return updated;
  }

  async markAsProcessing(
    refundId: string,
    adminNotes?: string,
  ): Promise<RefundWithOrderUser> {
    const note = normalizeOptionalSanitizedText(adminNotes);
    return transitionRefundStatus(
      normalizeRequiredSanitizedText(refundId, "Refund ID"),
      RefundStatus.APPROVED,
      RefundStatus.PROCESSING,
      note ? { notes: note } : {},
    );
  }

  async completeRefund(
    refundId: string,
    adminNotes?: string,
  ): Promise<RefundWithOrderUser> {
    const normalizedRefundId = normalizeRequiredSanitizedText(
      refundId,
      "Refund ID",
    );
    const note = normalizeOptionalSanitizedText(adminNotes);

    await prisma.$transaction(async (tx) => {
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
                      course: { include: { teacherProfile: true } },
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

      if (
        refund.order.status !== OrderStatus.PAID &&
        refund.order.status !== OrderStatus.REFUNDED
      ) {
        throw new ValidationError("Only paid orders can be refunded");
      }

      const refundAmount = roundMoney(refund.amount);
      if (refundAmount <= 0) {
        throw new ValidationError("Refund amount must be greater than zero");
      }

      const orderTotal = roundMoney(refund.order.totalAmount);
      if (orderTotal <= 0) {
        throw new ValidationError(
          "Order total amount must be greater than zero",
        );
      }

      const completedBeforeAggregate = await tx.refund.aggregate({
        where: {
          orderId: refund.orderId,
          status: RefundStatus.COMPLETED,
          id: { not: refund.id },
        },
        _sum: { amount: true },
      });

      const completedBeforeAmount = roundMoney(
        completedBeforeAggregate._sum.amount,
      );
      const remainingRefundableAmount = roundMoney(
        orderTotal - completedBeforeAmount,
      );

      if (refundAmount > remainingRefundableAmount) {
        throw new ValidationError(
          "Refund amount exceeds the remaining refundable amount for this order",
        );
      }

      const cumulativeRefundAmount = roundMoney(
        completedBeforeAmount + refundAmount,
      );
      const fullyRefunded = cumulativeRefundAmount >= orderTotal;

      const transitionResult = await tx.refund.updateMany({
        where: { id: normalizedRefundId, status: RefundStatus.PROCESSING },
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
            data: { availableBalance: { increment: refundAmount } },
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

      const totalItemsAmount = roundMoney(
        refund.order.items.reduce(
          (sum, item) => sum + Math.max(0, toNumber(item.finalPrice)),
          0,
        ),
      );
      const proportionalBase =
        totalItemsAmount > 0 ? totalItemsAmount : orderTotal;

      const adjustments: TeacherRefundAdjustment[] = [];
      const teacherEarningsAdjustments = new Map<string, number>();
      const affectedTeacherProfileIds = new Set<string>();
      let allocatedRefundAmount = 0;

      refund.order.items.forEach((item, index) => {
        const isLastItem = index === refund.order.items.length - 1;
        const itemPrice = roundMoney(Math.max(0, toNumber(item.finalPrice)));
        const itemPortion = isLastItem
          ? roundMoney(refundAmount - allocatedRefundAmount)
          : roundMoney((itemPrice / proportionalBase) * refundAmount);

        allocatedRefundAmount = roundMoney(allocatedRefundAmount + itemPortion);

        const teacherProfile = item.package?.course?.teacherProfile;
        if (!teacherProfile) return;

        affectedTeacherProfileIds.add(teacherProfile.id);

        const teacherNet = roundMoney(
          calculateTeacherNetEarning(
            itemPortion,
            teacherProfile,
            config.PLATFORM_COMMISSION_RATE,
          ),
        );

        if (teacherNet <= 0) return;

        adjustments.push({
          teacherProfileId: teacherProfile.id,
          teacherUserId: teacherProfile.userId,
          orderItemId: item.id,
          amount: teacherNet,
        });

        teacherEarningsAdjustments.set(
          teacherProfile.id,
          roundMoney(
            (teacherEarningsAdjustments.get(teacherProfile.id) || 0) +
              teacherNet,
          ),
        );
      });

      for (const adjustment of adjustments) {
        await walletService.debitForRefundInTransaction(
          tx,
          adjustment.teacherUserId,
          adjustment.amount,
          {
            orderItemId: adjustment.orderItemId,
            refundId: refund.id,
          },
        );
      }

      for (const [
        teacherProfileId,
        amount,
      ] of teacherEarningsAdjustments.entries()) {
        const currentProfile = await tx.teacherProfile.findUnique({
          where: { id: teacherProfileId },
          select: { totalEarnings: true },
        });

        if (currentProfile) {
          const nextEarnings = Math.max(
            0,
            roundMoney(toNumber(currentProfile.totalEarnings) - amount),
          );
          await tx.teacherProfile.update({
            where: { id: teacherProfileId },
            data: { totalEarnings: nextEarnings },
          });
        }
      }

      if (fullyRefunded) {
        const packageIds = refund.order.items.map((item) => item.packageId);
        if (packageIds.length > 0) {
          await tx.enrollment.updateMany({
            where: {
              userId: refund.order.userId,
              packageId: { in: packageIds },
              isActive: true,
            },
            data: { isActive: false },
          });
        }

        for (const teacherProfileId of affectedTeacherProfileIds) {
          const activeStudentCount =
            await countDistinctActiveStudentsForTeacherProfile(
              tx,
              teacherProfileId,
              completionTime,
            );

          await tx.teacherProfile.update({
            where: { id: teacherProfileId },
            data: { totalStudents: activeStudentCount },
          });
        }
      }
    });

    const completedRefund = await fetchRefundWithOrderUser(normalizedRefundId);
    await this.notifyStudentRefundUpdate(
      completedRefund.order?.user?.id,
      "Refund Completed",
      `Your refund of $${roundMoney(completedRefund.amount).toFixed(2)} for order ${completedRefund.order?.orderNo ?? ""} has been completed.`,
    );

    return completedRefund;
  }

  async getRefundStats(): Promise<{
    pending: number;
    approved: number;
    processing: number;
    completed: number;
    rejected: number;
    totalRefundAmount: number;
    completedRefundAmount: number;
  }> {
    const [groupedCounts, totalAmount, completedAmount] = await Promise.all([
      prisma.refund.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.refund.aggregate({ _sum: { amount: true } }),
      prisma.refund.aggregate({
        where: { status: RefundStatus.COMPLETED },
        _sum: { amount: true },
      }),
    ]);

    const counts = new Map(
      groupedCounts.map((entry) => [entry.status, entry._count._all]),
    );

    return {
      pending: counts.get(RefundStatus.PENDING) ?? 0,
      approved: counts.get(RefundStatus.APPROVED) ?? 0,
      processing: counts.get(RefundStatus.PROCESSING) ?? 0,
      completed: counts.get(RefundStatus.COMPLETED) ?? 0,
      rejected: counts.get(RefundStatus.REJECTED) ?? 0,
      totalRefundAmount: roundMoney(totalAmount._sum.amount),
      completedRefundAmount: roundMoney(completedAmount._sum.amount),
    };
  }
}

export default new RefundAdminService();

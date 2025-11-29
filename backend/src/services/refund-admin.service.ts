import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { RefundStatus, OrderStatus, Prisma } from '@prisma/client';
import config from '../config/env';

// Helper: safely convert Prisma.Decimal | string | number to number
const toNum = (v: unknown): number => {
  if (v && typeof v === 'object' && 'toNumber' in v && typeof (v as { toNumber: () => number }).toNumber === 'function') {
    return (v as { toNumber: () => number }).toNumber();
  }
  const num = Number(v);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return num;
};

/**
 * Admin Refund Management Service
 * Handles refund approval, rejection, and processing by admins
 */
class RefundAdminService {
  /**
   * Get all refunds with filters
   */
  async getAllRefunds(
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    refunds: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 50;
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
    
    const where: Prisma.RefundWhereInput = {};
    if (status && status.trim()) {
      where.status = status.trim() as RefundStatus;
    }

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        include: {
          order: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
              items: {
                include: {
                  package: {
                    include: { course: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
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
   * Get refund by ID
   */
  async getRefundById(refundId: string): Promise<any> {
    if (!refundId || !refundId.trim()) {
      throw new ValidationError('Refund ID is required');
    }
    const refund = await prisma.refund.findUnique({
      where: { id: refundId.trim() },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            items: {
              include: {
                package: {
                  include: { course: true },
                },
              },
            },
          },
        },
      },
    });

    if (!refund) throw new NotFoundError('Refund not found');
    return refund;
  }

  /**
   * Approve a refund request
   */
  async approveRefund(refundId: string, adminNotes?: string): Promise<any> {
    if (!refundId || !refundId.trim()) {
      throw new ValidationError('Refund ID is required');
    }
    const refund = await prisma.refund.findUnique({
      where: { id: refundId.trim() },
    });

    if (!refund) throw new NotFoundError('Refund not found');
    if (refund.status !== RefundStatus.PENDING) {
      throw new ValidationError('Only pending refunds can be approved');
    }

    const updated = await prisma.refund.update({
      where: { id: refundId.trim() },
      data: {
        status: RefundStatus.APPROVED,
        notes: adminNotes?.trim() || refund.notes || null,
        processedAt: new Date(),
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  /**
   * Reject a refund request
   */
  async rejectRefund(refundId: string, rejectionReason: string): Promise<any> {
    if (!refundId || !refundId.trim()) {
      throw new ValidationError('Refund ID is required');
    }
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new ValidationError('Rejection reason is required');
    }

    const refund = await prisma.refund.findUnique({
      where: { id: refundId.trim() },
    });

    if (!refund) throw new NotFoundError('Refund not found');
    if (refund.status !== RefundStatus.PENDING) {
      throw new ValidationError('Only pending refunds can be rejected');
    }

    const updated = await prisma.refund.update({
      where: { id: refundId.trim() },
      data: {
        status: RefundStatus.REJECTED,
        notes: rejectionReason.trim(),
        processedAt: new Date(),
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  /**
   * Mark refund as processing
   */
  async markAsProcessing(refundId: string, adminNotes?: string): Promise<any> {
    if (!refundId || !refundId.trim()) {
      throw new ValidationError('Refund ID is required');
    }
    const refund = await prisma.refund.findUnique({
      where: { id: refundId.trim() },
    });

    if (!refund) throw new NotFoundError('Refund not found');
    if (refund.status !== RefundStatus.APPROVED) {
      throw new ValidationError('Only approved refunds can be marked as processing');
    }

    const updated = await prisma.refund.update({
      where: { id: refundId.trim() },
      data: {
        status: RefundStatus.PROCESSING,
        notes: adminNotes?.trim() || refund.notes || null,
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  /**
   * Mark refund as completed
   */
  async completeRefund(refundId: string, adminNotes?: string): Promise<any> {
    if (!refundId || !refundId.trim()) {
      throw new ValidationError('Refund ID is required');
    }
    const refund = await prisma.refund.findUnique({
      where: { id: refundId.trim() },
    });

    if (!refund) throw new NotFoundError('Refund not found');
    if (refund.status !== RefundStatus.APPROVED && refund.status !== RefundStatus.PROCESSING) {
      throw new ValidationError('Only approved or processing refunds can be completed');
    }

    const updated = await prisma.refund.update({
      where: { id: refundId.trim() },
      data: {
        status: RefundStatus.COMPLETED,
        completedAt: new Date(),
        notes: adminNotes?.trim() || refund.notes || null,
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Update order status to REFUNDED
    await prisma.order.update({
      where: { id: refund.orderId },
      data: {
        status: OrderStatus.REFUNDED,
        refundedAt: new Date(),
        refundAmount: refund.amount,
      },
    });

    // Debit teacher wallets proportional to refunded amount across order items
    try {
      const order = await prisma.order.findUnique({
        where: { id: refund.orderId },
        include: {
          items: {
            include: {
              package: {
                include: { course: { include: { teacherProfile: true } } },
              },
            },
          },
        },
      });
      if (order && order.items.length > 0) {
        const walletService = (await import('./wallet.service')).default;
        const totalItemsAmount = order.items.reduce((sum, it) => sum + toNum(it.finalPrice), 0) || toNum(order.totalAmount);
        const base = totalItemsAmount > 0 ? totalItemsAmount : 1;
        for (const item of order.items) {
          const teacherProfile = item.package?.course?.teacherProfile;
          if (teacherProfile) {
            const rate = toNum(teacherProfile.commissionRate ?? config.PLATFORM_COMMISSION_RATE ?? 0);
            const itemPrice = toNum(item.finalPrice);
            const refundAmount = toNum(refund.amount);
            const itemPortion = (itemPrice / base) * refundAmount;
            const teacherNet = itemPortion * (1 - rate / 100);
            await walletService.debitForRefund(teacherProfile.userId, teacherNet, {
              orderItemId: item.id,
              refundId: refund.id,
            });
          }
        }
      }
    } catch (e) {
      // non-blocking wallet adjustment
    }

    return updated;
  }

  /**
   * Get refund statistics
   */
  async getRefundStats(): Promise<{
    pending: number;
    approved: number;
    processing: number;
    completed: number;
    rejected: number;
    totalRefundAmount: number | null;
    completedRefundAmount: number | null;
  }> {
    const [pending, approved, processing, completed, rejected] = await Promise.all([
      prisma.refund.count({ where: { status: RefundStatus.PENDING } }),
      prisma.refund.count({ where: { status: RefundStatus.APPROVED } }),
      prisma.refund.count({ where: { status: RefundStatus.PROCESSING } }),
      prisma.refund.count({ where: { status: RefundStatus.COMPLETED } }),
      prisma.refund.count({ where: { status: RefundStatus.REJECTED } }),
    ]);

    const totalAmount = await prisma.refund.aggregate({
      _sum: { amount: true },
    });

    const completedAmount = await prisma.refund.aggregate({
      where: { status: RefundStatus.COMPLETED },
      _sum: { amount: true },
    });

    return {
      pending,
      approved,
      processing,
      completed,
      rejected,
      totalRefundAmount: toNum(totalAmount._sum.amount),
      completedRefundAmount: toNum(completedAmount._sum.amount),
    };
  }
}

export default new RefundAdminService();

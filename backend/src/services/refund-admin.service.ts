import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { RefundStatus, OrderStatus } from '@prisma/client';
import config from '../config/env';

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
  ) {
    const where: any = {};
    if (status) {
      where.status = status;
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
        take: limit,
        skip: offset,
      }),
      prisma.refund.count({ where }),
    ]);

    return {
      refunds,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get refund by ID
   */
  async getRefundById(refundId: string) {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
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
  async approveRefund(refundId: string, adminNotes?: string) {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) throw new NotFoundError('Refund not found');
    if (refund.status !== RefundStatus.PENDING) {
      throw new ValidationError('Only pending refunds can be approved');
    }

    const updated = await prisma.refund.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.APPROVED,
        notes: adminNotes || refund.notes,
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
  async rejectRefund(refundId: string, rejectionReason: string) {
    if (!rejectionReason.trim()) {
      throw new ValidationError('Rejection reason is required');
    }

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) throw new NotFoundError('Refund not found');
    if (refund.status !== RefundStatus.PENDING) {
      throw new ValidationError('Only pending refunds can be rejected');
    }

    const updated = await prisma.refund.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.REJECTED,
        notes: rejectionReason,
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
  async markAsProcessing(refundId: string, adminNotes?: string) {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) throw new NotFoundError('Refund not found');
    if (refund.status !== RefundStatus.APPROVED) {
      throw new ValidationError('Only approved refunds can be marked as processing');
    }

    const updated = await prisma.refund.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.PROCESSING,
        notes: adminNotes || refund.notes,
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
  async completeRefund(refundId: string, adminNotes?: string) {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) throw new NotFoundError('Refund not found');
    if (![RefundStatus.APPROVED, RefundStatus.PROCESSING].includes(refund.status as any)) {
      throw new ValidationError('Only approved or processing refunds can be completed');
    }

    const updated = await prisma.refund.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.COMPLETED,
        completedAt: new Date(),
        notes: adminNotes || refund.notes,
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
        const totalItemsAmount = order.items.reduce((sum, it) => sum + it.finalPrice, 0) || order.totalAmount || 0;
        const base = totalItemsAmount > 0 ? totalItemsAmount : 1;
        for (const item of order.items) {
          const teacherProfile = item.package?.course?.teacherProfile;
          if (teacherProfile) {
            const rate = teacherProfile.commissionRate ?? config.PLATFORM_COMMISSION_RATE; // fallback to platform rate
            const itemPortion = (item.finalPrice / base) * refund.amount;
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
  async getRefundStats() {
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
      totalRefundAmount: totalAmount._sum.amount || 0,
      completedRefundAmount: completedAmount._sum.amount || 0,
    };
  }
}

export default new RefundAdminService();

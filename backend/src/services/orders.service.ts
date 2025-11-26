import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { OrderStatus, RefundStatus } from '@prisma/client';

const genOrderNo = () => {
  const now = new Date();
  return `ORD-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${now.getTime()}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
};

class OrdersService {
  async getMyOrders(userId: string) {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            package: {
              include: { course: true },
            },
          },
        },
        payment: true,
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders;
  }

  async getOrderById(userId: string, id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            package: { include: { course: true } },
          },
        },
        payment: true,
        refunds: true,
      },
    });
    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId) throw new ValidationError('Unauthorized');
    return order;
  }

  async createOrderFromCart(userId: string) {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        package: true,
      },
    });
    if (cartItems.length === 0) {
      throw new ValidationError('Your cart is empty');
    }

    const totalAmount = cartItems.reduce((sum, it) => sum + it.package.finalPrice * it.quantity, 0);

    const order = await prisma.order.create({
      data: {
        orderNo: genOrderNo(),
        userId,
        totalAmount,
        status: OrderStatus.PENDING,
        items: {
          create: cartItems.map((it) => ({
            packageId: it.packageId,
            price: it.package.price,
            discount: (it.package.discount || 0),
            finalPrice: it.package.finalPrice,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return order;
  }

  async cancelOrder(userId: string, id: string, reason?: string) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId) throw new ValidationError('Unauthorized');
    if (order.status !== OrderStatus.PENDING) {
      throw new ValidationError('Only pending orders can be cancelled');
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        canceledAt: new Date(),
        cancelReason: reason,
      },
    });
    return updated;
  }

  async requestRefund(
    userId: string,
    id: string,
    amount: number,
    reason?: string,
    reasonCategory?: string,
    refundMethod: string = 'ORIGINAL_PAYMENT',
    bankDetails?: string,
    notes?: string
  ) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId) throw new ValidationError('Unauthorized');
    if (order.status !== OrderStatus.PAID) {
      throw new ValidationError('Only paid orders can be refunded');
    }

    // Validate refund amount
    if (amount <= 0 || amount > order.totalAmount) {
      throw new ValidationError('Invalid refund amount');
    }

    const refund = await prisma.refund.create({
      data: {
        orderId: id,
        amount,
        reason,
        reasonCategory,
        status: RefundStatus.PENDING,
        refundMethod: refundMethod as any,
        bankDetails,
        notes,
      },
      include: {
        order: {
          include: {
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

    return refund;
  }

  /**
   * Get refund details for an order
   */
  async getRefundByOrderId(userId: string, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId) throw new ValidationError('Unauthorized');

    const refund = await prisma.refund.findFirst({
      where: { orderId },
      include: {
        order: {
          include: {
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

    return refund;
  }

  /**
   * Get all refunds for a user
   */
  async getUserRefunds(userId: string) {
    const refunds = await prisma.refund.findMany({
      where: {
        order: {
          userId,
        },
      },
      include: {
        order: {
          include: {
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
    });

    return refunds;
  }
}

export default new OrdersService();


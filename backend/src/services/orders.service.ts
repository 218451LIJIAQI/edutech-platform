import prisma from '../config/database';
import { NotFoundError, ValidationError, AuthorizationError } from '../utils/errors';
import { OrderStatus, RefundStatus, RefundMethod } from '@prisma/client';

const genOrderNo = () => {
  const now = new Date();
  return `ORD-${now.getFullYear()}${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getTime()}-${Math.floor(
    Math.random() * 1000
  )
    .toString()
    .padStart(3, '0')}`;
};

class OrdersService {
  async getMyOrders(userId: string) {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const orders = await prisma.order.findMany({
      where: { userId: userId.trim() },
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
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    if (!id || !id.trim()) {
      throw new ValidationError('Order ID is required');
    }
    const order = await prisma.order.findUnique({
      where: { id: id.trim() },
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
    if (order.userId !== userId.trim()) throw new AuthorizationError('You can only access your own orders');
    return order;
  }

  async createOrderFromCart(userId: string) {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: userId.trim() },
      include: {
        package: {
          include: {
            course: { select: { isPublished: true } },
          },
        },
      },
    });
    if (cartItems.length === 0) {
      throw new ValidationError('Your cart is empty');
    }

    // Validate availability of all items
    const unavailable = cartItems.find(
      (it) => !it.package || !it.package.isActive || !it.package.course?.isPublished
    );
    if (unavailable) {
      throw new ValidationError('Some items are no longer available. Please update your cart.');
    }

    // Filter out items without packages (type guard)
    const validCartItems = cartItems.filter((it): it is typeof it & { package: NonNullable<typeof it.package> } => 
      it.package !== null && it.package !== undefined
    );

    const totalAmount = validCartItems.reduce(
      (sum, it) => {
        const price = Number(it.package.finalPrice ?? 0);
        const quantity = Number(it.quantity ?? 0);
        if (!Number.isFinite(price) || !Number.isFinite(quantity) || price < 0 || quantity < 0) {
          throw new ValidationError('Invalid cart item price or quantity');
        }
        return sum + price * quantity;
      },
      0
    );

    const order = await prisma.order.create({
      data: {
        orderNo: genOrderNo(),
        userId,
        totalAmount,
        status: OrderStatus.PENDING,
        items: {
          create: validCartItems.map((it) => ({
            packageId: it.packageId,
            price: it.package.price,
            discount: it.package.discount || 0,
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
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    if (!id || !id.trim()) {
      throw new ValidationError('Order ID is required');
    }
    const order = await prisma.order.findUnique({ where: { id: id.trim() } });
    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId.trim()) throw new AuthorizationError('You can only modify your own orders');
    if (order.status !== OrderStatus.PENDING) {
      throw new ValidationError('Only pending orders can be cancelled');
    }

    const updated = await prisma.order.update({
      where: { id: id.trim() },
      data: {
        status: OrderStatus.CANCELLED,
        canceledAt: new Date(),
        cancelReason: reason?.trim() || null,
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
    refundMethod: RefundMethod = RefundMethod.ORIGINAL_PAYMENT,
    bankDetails?: string,
    notes?: string
  ) {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    if (!id || !id.trim()) {
      throw new ValidationError('Order ID is required');
    }
    const order = await prisma.order.findUnique({
      where: { id: id.trim() },
      include: { payment: true },
    });
    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId.trim()) throw new AuthorizationError('You can only request refund for your own orders');
    if (order.status !== OrderStatus.PAID) {
      throw new ValidationError('Only paid orders can be refunded');
    }

    // Validate refund amount
    const orderTotal = Number(order.totalAmount ?? 0);
    const refundAmount = Number(amount);
    if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > orderTotal) {
      throw new ValidationError('Invalid refund amount');
    }

    // Prevent duplicate pending/processing refunds on the same order
    const existing = await prisma.refund.findFirst({
      where: { orderId: id, status: { in: [RefundStatus.PENDING, RefundStatus.PROCESSING] } },
    });
    if (existing) {
      throw new ValidationError('A refund request is already in progress for this order');
    }

    const refund = await prisma.refund.create({
      data: {
        orderId: id.trim(),
        amount: refundAmount,
        reason: reason?.trim() || null,
        reasonCategory: reasonCategory?.trim() || null,
        status: RefundStatus.PENDING,
        refundMethod,
        bankDetails: bankDetails?.trim() || null,
        notes: notes?.trim() || null,
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
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    if (!orderId || !orderId.trim()) {
      throw new ValidationError('Order ID is required');
    }
    const order = await prisma.order.findUnique({
      where: { id: orderId.trim() },
    });

    if (!order) throw new NotFoundError('Order not found');
    if (order.userId !== userId.trim()) throw new AuthorizationError('You can only access your own refunds');

    const refund = await prisma.refund.findFirst({
      where: { orderId: orderId.trim() },
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
   * Get all refunds for the current user
   */
  async getUserRefunds(userId: string) {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const refunds = await prisma.refund.findMany({
      where: {
        order: {
          userId: userId.trim(),
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

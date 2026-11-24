import { roundCurrency as roundBaseCurrency } from "./shared/settlement-calculator";
import { randomInt } from "crypto";
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  RefundMethod,
  RefundStatus,
} from "@prisma/client";
import prisma from "../config/database";
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from "../utils/errors";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";
import { assertPackageHasAvailableCapacity } from "./cart.service";
import { buildCurrentEnrollmentWhere } from "./shared/enrollment-access";
import { toNumber } from "./shared/payment-utils";
import { isUniqueConstraintError } from "./shared/service-helpers";

const ORDER_NO_RETRY_ATTEMPTS = 5;
const MAX_REFUND_NOTE_LENGTH = 1000;
const MAX_REFUND_REASON_LENGTH = 1000;
const MAX_REASON_CATEGORY_LENGTH = 100;
const MAX_BANK_DETAILS_LENGTH = 2000;
const MAX_CANCEL_REASON_LENGTH = 500;
const MAX_ORDER_AMOUNT = 99999999.99;

const ACTIVE_REFUND_STATUSES = new Set<RefundStatus>([
  RefundStatus.PENDING,
  RefundStatus.APPROVED,
  RefundStatus.PROCESSING,
]);

const orderDetailInclude = {
  items: {
    include: {
      package: {
        include: {
          course: true,
        },
      },
    },
  },
  payment: true,
  refunds: true,
} satisfies Prisma.OrderInclude;

const refundDetailInclude = {
  order: {
    include: {
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

const normalizeRequiredId = (value: string, fieldName: string): string => {
  const normalized = value?.trim();

  if (!normalized) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return normalized;
};

const normalizeOptionalText = (
  value: string | undefined,
  fieldName: string,
  maxLength: number,
): string | null => {
  const normalized =
    value === undefined ? undefined : sanitizeUserPlainText(value);

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return normalized;
};

const roundCurrency = (value: unknown): number =>
  roundBaseCurrency(toNumber(value));

const normalizePositiveCurrency = (
  value: unknown,
  fieldName: string,
): number => {
  const amount = roundCurrency(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError(`${fieldName} must be greater than 0`);
  }

  if (amount > MAX_ORDER_AMOUNT) {
    throw new ValidationError(`${fieldName} is too large`);
  }

  return amount;
};

const normalizeNonNegativeCurrency = (
  value: unknown,
  fieldName: string,
): number => {
  const amount = roundCurrency(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new ValidationError(`${fieldName} must not be negative`);
  }

  if (amount > MAX_ORDER_AMOUNT) {
    throw new ValidationError(`${fieldName} is too large`);
  }

  return amount;
};

const getCompletedRefundAmount = (
  refunds: Array<{ status: RefundStatus; amount: unknown }>,
): number =>
  roundCurrency(
    refunds.reduce(
      (sum, refund) =>
        refund.status === RefundStatus.COMPLETED
          ? sum + roundCurrency(refund.amount)
          : sum,
      0,
    ),
  );

const normalizeOrderRefundState = <
  T extends {
    totalAmount: unknown;
    status: OrderStatus;
    refundAmount?: unknown | null;
    refunds: Array<{ status: RefundStatus; amount: unknown }>;
  },
>(
  order: T,
) => {
  const totalAmount = roundCurrency(order.totalAmount);
  const completedRefundAmount = getCompletedRefundAmount(order.refunds);
  const isPartiallyRefunded =
    completedRefundAmount > 0 && completedRefundAmount < totalAmount;

  return {
    ...order,
    status:
      order.status === OrderStatus.REFUNDED && isPartiallyRefunded
        ? OrderStatus.PAID
        : order.status,
    refundAmount:
      completedRefundAmount > 0 ? completedRefundAmount : order.refundAmount,
    refundableAmount: Math.max(
      0,
      roundCurrency(totalAmount - completedRefundAmount),
    ),
  };
};

const generateOrderNo = () => {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const randomPart = randomInt(100000, 999999);

  return `ORD-${datePart}-${now.getTime()}-${randomPart}`;
};

const createOrderNoWithRetry = async <T>(
  operation: (orderNo: string) => Promise<T>,
) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= ORDER_NO_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await operation(generateOrderNo());
    } catch (error) {
      lastError = error;

      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
};

const requireOwnOrder = async (userId: string, orderId: string) => {
  const normalizedUserId = normalizeRequiredId(userId, "User ID");
  const normalizedOrderId = normalizeRequiredId(orderId, "Order ID");

  const order = await prisma.order.findUnique({
    where: { id: normalizedOrderId },
    include: orderDetailInclude,
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  if (order.userId !== normalizedUserId) {
    throw new AuthorizationError("You can only access your own orders");
  }

  return order;
};

/**
 * Orders Service
 * Handles order creation, cancellation, refund requests, and user refund history.
 */
class OrdersService {
  /**
   * Get all orders for the current user.
   */
  async getMyOrders(userId: string) {
    const normalizedUserId = normalizeRequiredId(userId, "User ID");

    const orders = await prisma.order.findMany({
      where: { userId: normalizedUserId },
      include: orderDetailInclude,
      orderBy: { createdAt: "desc" },
    });

    return orders.map((order) => normalizeOrderRefundState(order));
  }

  /**
   * Get one order by ID, scoped to the current user.
   */
  async getOrderById(userId: string, id: string) {
    const order = await requireOwnOrder(userId, id);
    return normalizeOrderRefundState(order);
  }

  /**
   * Create a pending order from the user's cart.
   * The cart allows only one package per course and is cleared after the order is created.
   */
  async createOrderFromCart(userId: string) {
    const normalizedUserId = normalizeRequiredId(userId, "User ID");
    const referenceDate = new Date();

    await prisma.cartItem.updateMany({
      where: {
        userId: normalizedUserId,
        NOT: { quantity: 1 },
      },
      data: { quantity: 1 },
    });

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: normalizedUserId },
      include: {
        package: {
          include: {
            course: {
              select: {
                id: true,
                isPublished: true,
                teacherProfile: {
                  select: {
                    registrationStatus: true,
                    user: { select: { isActive: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (cartItems.length === 0) {
      throw new ValidationError("Your cart is empty");
    }

    const cartCourseIds = cartItems.map((item) => item.package.course.id);

    if (new Set(cartCourseIds).size !== cartCourseIds.length) {
      throw new ValidationError(
        "Your cart contains multiple packages for the same course. Please keep only one package per course.",
      );
    }

    const activeEnrollments = await prisma.enrollment.findMany({
      where: buildCurrentEnrollmentWhere(
        {
          userId: normalizedUserId,
          package: {
            courseId: { in: cartCourseIds },
          },
        },
        referenceDate,
      ),
      select: { id: true },
    });

    if (activeEnrollments.length > 0) {
      throw new ValidationError(
        "Your cart contains course access that is already active. Please refresh your cart.",
      );
    }

    const unavailableItem = cartItems.find(
      (item) =>
        !item.package.isActive ||
        !item.package.course.isPublished ||
        item.package.course.teacherProfile.registrationStatus !== "APPROVED" ||
        !item.package.course.teacherProfile.user.isActive,
    );

    if (unavailableItem) {
      throw new ValidationError(
        "Some items are no longer available. Please update your cart.",
      );
    }

    for (const item of cartItems) {
      await assertPackageHasAvailableCapacity(
        prisma,
        item.package,
        referenceDate,
      );
    }

    const normalizedItems = cartItems.map((item) => {
      const price = normalizeNonNegativeCurrency(
        item.package.price,
        "Package price",
      );
      const discount = normalizeNonNegativeCurrency(
        item.package.discount ?? 0,
        "Package discount",
      );
      const finalPrice = normalizeNonNegativeCurrency(
        item.package.finalPrice,
        "Package final price",
      );

      if (discount > price) {
        throw new ValidationError("Invalid package discount detected");
      }

      if (finalPrice > price) {
        throw new ValidationError("Invalid package final price detected");
      }

      return {
        cartItemId: item.id,
        packageId: item.packageId,
        price,
        discount,
        finalPrice,
      };
    });

    const totalAmount = roundCurrency(
      normalizedItems.reduce((sum, item) => sum + item.finalPrice, 0),
    );

    if (totalAmount > MAX_ORDER_AMOUNT) {
      throw new ValidationError("Order amount is too large");
    }

    const order = await createOrderNoWithRetry((orderNo) =>
      prisma.$transaction(async (tx) => {
        const deletedCart = await tx.cartItem.deleteMany({
          where: {
            id: {
              in: normalizedItems.map((item) => item.cartItemId),
            },
            userId: normalizedUserId,
          },
        });

        if (deletedCart.count !== normalizedItems.length) {
          throw new ValidationError(
            "Your cart changed while creating the order. Please review your cart and try again.",
          );
        }

        for (const item of cartItems) {
          await assertPackageHasAvailableCapacity(
            tx,
            item.package,
            referenceDate,
          );
        }

        return tx.order.create({
          data: {
            orderNo,
            userId: normalizedUserId,
            totalAmount,
            status: OrderStatus.PENDING,
            items: {
              create: normalizedItems.map((item) => ({
                packageId: item.packageId,
                price: item.price,
                discount: item.discount,
                finalPrice: item.finalPrice,
              })),
            },
          },
          include: {
            items: {
              include: {
                package: {
                  include: {
                    course: true,
                  },
                },
              },
            },
            payment: true,
            refunds: true,
          },
        });
      }),
    );

    return normalizeOrderRefundState(order);
  }

  /**
   * Create a pending order for a single package checkout.
   */
  async createOrderForPackage(userId: string, packageId: string) {
    const normalizedUserId = normalizeRequiredId(userId, "User ID");
    const normalizedPackageId = normalizeRequiredId(packageId, "Package ID");
    const referenceDate = new Date();

    const lessonPackage = await prisma.lessonPackage.findUnique({
      where: { id: normalizedPackageId },
      include: {
        course: {
          select: {
            id: true,
            isPublished: true,
            teacherProfile: {
              select: {
                registrationStatus: true,
                user: { select: { isActive: true } },
              },
            },
          },
        },
      },
    });

    if (!lessonPackage) {
      throw new NotFoundError("Package not found");
    }

    if (
      !lessonPackage.isActive ||
      !lessonPackage.course.isPublished ||
      lessonPackage.course.teacherProfile.registrationStatus !== "APPROVED" ||
      !lessonPackage.course.teacherProfile.user.isActive
    ) {
      throw new ValidationError("This package is no longer available");
    }

    const activeEnrollment = await prisma.enrollment.findFirst({
      where: buildCurrentEnrollmentWhere(
        {
          userId: normalizedUserId,
          package: {
            courseId: lessonPackage.course.id,
          },
        },
        referenceDate,
      ),
      select: { id: true },
    });

    if (activeEnrollment) {
      throw new ValidationError("You are already enrolled in this package");
    }

    await assertPackageHasAvailableCapacity(
      prisma,
      lessonPackage,
      referenceDate,
    );

    const price = normalizeNonNegativeCurrency(
      lessonPackage.price,
      "Package price",
    );
    const discount = normalizeNonNegativeCurrency(
      lessonPackage.discount ?? 0,
      "Package discount",
    );
    const finalPrice = normalizeNonNegativeCurrency(
      lessonPackage.finalPrice,
      "Package final price",
    );

    if (discount > price) {
      throw new ValidationError("Invalid package discount detected");
    }

    if (finalPrice > price) {
      throw new ValidationError("Invalid package final price detected");
    }

    const order = await createOrderNoWithRetry((orderNo) =>
      prisma.order.create({
        data: {
          orderNo,
          userId: normalizedUserId,
          totalAmount: finalPrice,
          status: OrderStatus.PENDING,
          items: {
            create: {
              packageId: normalizedPackageId,
              price,
              discount,
              finalPrice,
            },
          },
        },
        include: orderDetailInclude,
      }),
    );

    return normalizeOrderRefundState(order);
  }

  /**
   * Cancel a pending order owned by the current user.
   */
  async cancelOrder(userId: string, id: string, reason?: string) {
    const order = await requireOwnOrder(userId, id);

    if (order.status !== OrderStatus.PENDING) {
      throw new ValidationError("Only pending orders can be cancelled");
    }

    const normalizedReason = normalizeOptionalText(
      reason,
      "Cancel reason",
      MAX_CANCEL_REASON_LENGTH,
    );

    const updated = await prisma.$transaction(async (tx) => {
      const canceledAt = new Date();

      const claimedOrder = await tx.order.updateMany({
        where: {
          id: order.id,
          userId: order.userId,
          status: OrderStatus.PENDING,
        },
        data: {
          status: OrderStatus.CANCELLED,
          canceledAt,
          cancelReason: normalizedReason,
        },
      });

      if (claimedOrder.count !== 1) {
        throw new ValidationError("Only pending orders can be cancelled");
      }

      await tx.payment.updateMany({
        where: {
          orderId: order.id,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: orderDetailInclude,
      });
    });

    return normalizeOrderRefundState(updated);
  }

  /**
   * Request a refund for a paid order owned by the current user.
   */
  async requestRefund(
    userId: string,
    id: string,
    amount: number,
    reason?: string,
    reasonCategory?: string,
    refundMethod: RefundMethod = RefundMethod.ORIGINAL_PAYMENT,
    bankDetails?: string,
    notes?: string,
  ) {
    const order = await requireOwnOrder(userId, id);
    const normalizedOrder = normalizeOrderRefundState(order);

    if (normalizedOrder.status !== OrderStatus.PAID) {
      throw new ValidationError("Only paid orders can be refunded");
    }

    if (!order.payment || order.payment.status !== PaymentStatus.COMPLETED) {
      throw new ValidationError(
        "A completed payment is required before requesting a refund",
      );
    }

    const orderTotal = roundCurrency(order.totalAmount);
    if (orderTotal <= 0) {
      throw new ValidationError("Free orders cannot be refunded");
    }

    if (refundMethod === RefundMethod.WALLET) {
      throw new ValidationError(
        "Platform wallet refunds are unavailable; please choose original payment or bank transfer",
      );
    }

    const normalizedBankDetails = normalizeOptionalText(
      bankDetails,
      "Bank details",
      MAX_BANK_DETAILS_LENGTH,
    );

    if (refundMethod === RefundMethod.BANK_TRANSFER && !normalizedBankDetails) {
      throw new ValidationError(
        "Bank details are required for bank transfer refunds",
      );
    }

    const completedRefundAmount = getCompletedRefundAmount(order.refunds);
    const remainingRefundAmount = Math.max(
      0,
      roundCurrency(orderTotal - completedRefundAmount),
    );
    const refundAmount = normalizePositiveCurrency(amount, "Refund amount");

    if (remainingRefundAmount <= 0) {
      throw new ValidationError("This order has already been fully refunded");
    }

    if (refundAmount > remainingRefundAmount) {
      throw new ValidationError(
        `Refund amount exceeds the remaining refundable balance of $${remainingRefundAmount.toFixed(2)}`,
      );
    }

    const existingActiveRefund = order.refunds.find((refund) =>
      ACTIVE_REFUND_STATUSES.has(refund.status),
    );

    if (existingActiveRefund) {
      throw new ValidationError(
        "A refund request is already in progress for this order",
      );
    }

    try {
      return await prisma.refund.create({
        data: {
          orderId: order.id,
          amount: refundAmount,
          reason: normalizeOptionalText(
            reason,
            "Refund reason",
            MAX_REFUND_REASON_LENGTH,
          ),
          reasonCategory: normalizeOptionalText(
            reasonCategory,
            "Refund reason category",
            MAX_REASON_CATEGORY_LENGTH,
          ),
          status: RefundStatus.PENDING,
          refundMethod,
          bankDetails: normalizedBankDetails,
          notes: normalizeOptionalText(
            notes,
            "Refund notes",
            MAX_REFUND_NOTE_LENGTH,
          ),
        },
        include: refundDetailInclude,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ValidationError(
          "A refund request is already in progress for this order",
        );
      }

      throw error;
    }
  }

  /**
   * Get the latest refund record for an order owned by the current user.
   */
  async getRefundByOrderId(userId: string, orderId: string) {
    const order = await requireOwnOrder(userId, orderId);

    return prisma.refund.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
      include: refundDetailInclude,
    });
  }

  /**
   * Get all refund records for an order owned by the current user.
   */
  async getRefundsByOrderId(userId: string, orderId: string) {
    const order = await requireOwnOrder(userId, orderId);

    return prisma.refund.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
      include: refundDetailInclude,
    });
  }

  /**
   * Get all refund records across all orders owned by the current user.
   */
  async getMyRefunds(userId: string) {
    const normalizedUserId = normalizeRequiredId(userId, "User ID");

    return prisma.refund.findMany({
      where: {
        order: {
          userId: normalizedUserId,
        },
      },
      orderBy: { createdAt: "desc" },
      include: refundDetailInclude,
    });
  }
}

export default new OrdersService();

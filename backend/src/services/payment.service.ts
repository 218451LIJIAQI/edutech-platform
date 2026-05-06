import { PaymentStatus, OrderStatus, Prisma } from "@prisma/client";
import type { Payment as PaymentModel, Enrollment } from "@prisma/client";
import prisma from "../config/database";
import config from "../config/env";
import logger from "../utils/logger";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  InternalServerError,
} from "../utils/errors";
import ordersService from "./orders.service";
import {
  buildTeacherCourseEarningsSummary,
  buildTeacherEarningsTimeline,
  type TeacherEarningsEntry,
  type TeacherEarningsPayment,
} from "./payment/payment-helpers";
import {
  cartCheckoutItemInclude,
  ensureRequiredPaymentField,
  findCompletedTeacherPayments,
  orderPaymentItemsInclude,
  paymentConfirmationInclude,
  paymentDetailsInclude,
  requireAvailableLessonPackage,
  requireTeacherProfileByUserId,
  userPaymentHistoryInclude,
  type PaymentDetailsRecord,
  type UserPaymentHistoryRecord,
} from "./payment/payment-service-helpers";
import {
  calculateExpirationDate,
  calculatePlatformCommission,
  calculateTeacherNetEarning,
  toNumber,
} from "./shared/payment-utils";
import {
  buildCurrentEnrollmentWhere,
  countDistinctActiveStudentsForTeacherProfile,
  isEnrollmentCurrentlyActive,
} from "./shared/enrollment-access";

const pendingCartPaymentInclude = {
  order: {
    include: {
      items: {
        select: {
          packageId: true,
        },
      },
    },
  },
} satisfies Prisma.PaymentInclude;

type PendingCartPaymentRecord = Prisma.PaymentGetPayload<{
  include: typeof pendingCartPaymentInclude;
}>;

type ConfirmPaymentResult =
  | { payment: PaymentModel; enrollment: Enrollment }
  | { payment: PaymentModel; orderId: string }
  | { payment: PaymentModel };

type SinglePaymentConfirmationTransactionResult =
  | { kind: "unavailable-package" }
  | { kind: "stale-package" }
  | { kind: "already-processed" }
  | { kind: "single-complete"; payment: PaymentModel; enrollmentId: string };

type CartPaymentConfirmationTransactionResult =
  | { kind: "order-not-found" }
  | { kind: "order-not-payable" }
  | { kind: "stale-order" }
  | { kind: "duplicate-course-order" }
  | { kind: "unavailable-order" }
  | { kind: "already-processed" }
  | { kind: "order-complete"; payment: PaymentModel; orderId: string };

type PaymentSplit = {
  amount: number;
  platformCommission: number;
  teacherEarning: number;
};

const normalizePackageIds = (packageIds: string[]): string[] =>
  [...packageIds].sort((left, right) => left.localeCompare(right));

const haveSamePackages = (left: string[], right: string[]): boolean => {
  const normalizedLeft = normalizePackageIds(left);
  const normalizedRight = normalizePackageIds(right);

  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every(
      (packageId, index) => packageId === normalizedRight[index],
    )
  );
};

const roundMoney = (
  value: Prisma.Decimal | number | string | null | undefined,
): number => {
  const numericValue = toNumber(value ?? 0);
  return Math.round((numericValue + Number.EPSILON) * 100) / 100;
};

const buildPaymentSplit = (
  rawAmount: Prisma.Decimal | number | string,
  rawPlatformCommission: number,
): PaymentSplit => {
  const amount = roundMoney(rawAmount);
  const platformCommission = roundMoney(
    Math.min(Math.max(rawPlatformCommission, 0), amount),
  );
  const teacherEarning = roundMoney(amount - platformCommission);

  return {
    amount,
    platformCommission,
    teacherEarning,
  };
};

/**
 * Payment Service
 * Handles payment processing, order checkout, enrollment creation, teacher earnings,
 * wallet synchronization, and direct-payment refunds.
 */
class PaymentService {
  private async syncTeacherWalletCredits(payment: PaymentModel): Promise<void> {
    const walletService = (await import("./wallet.service")).default;

    if (payment.packageId) {
      const lessonPackage = await prisma.lessonPackage.findUnique({
        where: { id: payment.packageId },
        include: {
          course: {
            include: {
              teacherProfile: true,
            },
          },
        },
      });

      const teacherUserId = lessonPackage?.course?.teacherProfile?.userId;
      if (!teacherUserId) {
        return;
      }

      await walletService.creditForTeacher(
        teacherUserId,
        roundMoney(payment.teacherEarning),
        {
          paymentId: payment.id,
          packageId: payment.packageId,
        },
      );
      return;
    }

    if (!payment.orderId) {
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: payment.orderId },
      include: orderPaymentItemsInclude,
    });

    if (!order) {
      return;
    }

    for (const item of order.items) {
      const teacherProfile = item.package?.course?.teacherProfile;
      if (!teacherProfile) {
        continue;
      }

      const teacherNet = roundMoney(
        calculateTeacherNetEarning(
          item.finalPrice,
          teacherProfile,
          config.PLATFORM_COMMISSION_RATE,
        ),
      );

      await walletService.creditForTeacher(teacherProfile.userId, teacherNet, {
        paymentId: payment.id,
        orderItemId: item.id,
      });
    }
  }

  private async trySyncTeacherWalletCredits(
    payment: PaymentModel,
    context: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.syncTeacherWalletCredits(payment);
    } catch (error) {
      logger.error("Failed to synchronize teacher wallet credits", {
        ...context,
        error,
      });
    }
  }

  private async buildCompletedPaymentResponse(
    payment: PaymentModel,
    context: Record<string, unknown>,
  ): Promise<ConfirmPaymentResult> {
    await this.trySyncTeacherWalletCredits(payment, {
      ...context,
      paymentId: payment.id,
      state: "completed-reconciliation",
    });

    if (payment.packageId) {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: payment.userId,
          packageId: payment.packageId,
        },
      });

      if (!enrollment) {
        throw new InternalServerError(
          "Enrollment not found for completed payment",
        );
      }

      return { payment, enrollment };
    }

    if (payment.orderId) {
      return { payment, orderId: payment.orderId };
    }

    return { payment };
  }

  private async findReusablePendingPackagePayment(
    userId: string,
    packageId: string,
  ): Promise<PaymentModel | null> {
    return prisma.payment.findFirst({
      where: {
        userId,
        packageId,
        status: PaymentStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private async findReusablePendingCartPayment(
    userId: string,
    packageIds: string[],
  ): Promise<PendingCartPaymentRecord | null> {
    if (packageIds.length === 0) {
      return null;
    }

    const pendingPayments = await prisma.payment.findMany({
      where: {
        userId,
        status: PaymentStatus.PENDING,
        order: {
          status: OrderStatus.PENDING,
        },
      },
      include: pendingCartPaymentInclude,
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return (
      pendingPayments.find((payment) =>
        payment.order
          ? haveSamePackages(
              payment.order.items.map((item) => item.packageId),
              packageIds,
            )
          : false,
      ) ?? null
    );
  }

  /**
   * Create cart payment intent for multi-course checkout.
   */
  async createCartPaymentIntent(userId: string): Promise<{
    payment: PaymentModel;
    order: {
      id: string;
      orderNo: string;
      amount: number;
    };
  }> {
    const normalizedUserId = ensureRequiredPaymentField(userId, "User ID");
    const referenceDate = new Date();

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: normalizedUserId },
      include: cartCheckoutItemInclude,
    });

    if (cartItems.length === 0) {
      throw new ValidationError("Your cart is empty");
    }

    const cartPackageIds = cartItems.map((item) => item.packageId);
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
        "Your cart contains package access that is already active. Please refresh your cart.",
      );
    }

    const reusablePayment = await this.findReusablePendingCartPayment(
      normalizedUserId,
      cartPackageIds,
    );

    if (reusablePayment?.order) {
      return {
        payment: reusablePayment,
        order: {
          id: reusablePayment.order.id,
          orderNo: reusablePayment.order.orderNo,
          amount: roundMoney(reusablePayment.order.totalAmount),
        },
      };
    }

    const unavailable = cartItems.find(
      (item) =>
        !item.package ||
        !item.package.isActive ||
        !item.package.course?.isPublished,
    );

    if (unavailable) {
      throw new ValidationError(
        "Some items are no longer available. Please update your cart.",
      );
    }

    const order = await ordersService.createOrderFromCart(normalizedUserId);

    const orderWithItems = await prisma.order.findUnique({
      where: { id: order.id },
      include: orderPaymentItemsInclude,
    });

    if (!orderWithItems) {
      throw new InternalServerError(
        "Failed to load order items for commission calculation",
      );
    }

    let rawPlatformCommission = 0;
    for (const item of orderWithItems.items) {
      rawPlatformCommission += calculatePlatformCommission(
        item.finalPrice,
        item.package?.course?.teacherProfile,
        config.PLATFORM_COMMISSION_RATE,
      );
    }

    const split = buildPaymentSplit(order.totalAmount, rawPlatformCommission);

    const payment = await prisma.payment.create({
      data: {
        userId: normalizedUserId,
        orderId: order.id,
        amount: split.amount,
        platformCommission: split.platformCommission,
        teacherEarning: split.teacherEarning,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      payment,
      order: {
        id: order.id,
        orderNo: order.orderNo,
        amount: split.amount,
      },
    };
  }

  /**
   * Create payment intent for a single package purchase.
   */
  async createPaymentIntent(
    userId: string,
    packageId: string,
  ): Promise<{
    payment: PaymentModel;
    package: {
      id: string;
      name: string;
      price: number;
    };
  }> {
    const normalizedUserId = ensureRequiredPaymentField(userId, "User ID");
    const { lessonPackage, normalizedPackageId } =
      await requireAvailableLessonPackage(packageId);
    const referenceDate = new Date();

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: buildCurrentEnrollmentWhere(
        {
          userId: normalizedUserId,
          package: {
            courseId: lessonPackage.courseId,
          },
        },
        referenceDate,
      ),
    });

    if (existingEnrollment) {
      throw new ValidationError("You are already enrolled in this package");
    }

    const reusableOrderPayment = await this.findReusablePendingCartPayment(
      normalizedUserId,
      [normalizedPackageId],
    );

    if (reusableOrderPayment?.order) {
      return {
        payment: reusableOrderPayment,
        package: {
          id: lessonPackage.id,
          name: lessonPackage.name,
          price: roundMoney(lessonPackage.finalPrice),
        },
      };
    }

    const reusablePayment = await this.findReusablePendingPackagePayment(
      normalizedUserId,
      normalizedPackageId,
    );

    if (reusablePayment) {
      return {
        payment: reusablePayment,
        package: {
          id: lessonPackage.id,
          name: lessonPackage.name,
          price: roundMoney(lessonPackage.finalPrice),
        },
      };
    }

    const order = await ordersService.createOrderForPackage(
      normalizedUserId,
      normalizedPackageId,
    );

    const orderWithItems = await prisma.order.findUnique({
      where: { id: order.id },
      include: orderPaymentItemsInclude,
    });

    if (!orderWithItems) {
      throw new InternalServerError(
        "Failed to load order items for commission calculation",
      );
    }

    let rawPlatformCommission = 0;
    for (const item of orderWithItems.items) {
      rawPlatformCommission += calculatePlatformCommission(
        item.finalPrice,
        item.package?.course?.teacherProfile,
        config.PLATFORM_COMMISSION_RATE,
      );
    }

    const split = buildPaymentSplit(order.totalAmount, rawPlatformCommission);

    const payment = await prisma.payment.create({
      data: {
        userId: normalizedUserId,
        orderId: order.id,
        amount: split.amount,
        platformCommission: split.platformCommission,
        teacherEarning: split.teacherEarning,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      payment,
      package: {
        id: lessonPackage.id,
        name: lessonPackage.name,
        price: split.amount,
      },
    };
  }

  /**
   * Confirm payment and create enrollment.
   * This method is designed to be idempotent for completed payments and safer for repeated requests.
   */
  async confirmPayment(
    paymentId: string,
    userId: string,
  ): Promise<ConfirmPaymentResult> {
    const normalizedPaymentId = ensureRequiredPaymentField(
      paymentId,
      "Payment ID",
    );
    const normalizedUserId = ensureRequiredPaymentField(userId, "User ID");

    const payment = await prisma.payment.findUnique({
      where: { id: normalizedPaymentId },
      include: paymentConfirmationInclude,
    });

    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    if (payment.userId !== normalizedUserId) {
      throw new AuthorizationError("You can only confirm your own payments");
    }

    if (
      payment.status === PaymentStatus.FAILED ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      throw new ValidationError("This payment can no longer be confirmed");
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return this.buildCompletedPaymentResponse(payment, {
        flow: "already-completed",
      });
    }

    if (payment.order && payment.order.status !== OrderStatus.PENDING) {
      if (
        payment.order.status === OrderStatus.CANCELLED ||
        payment.order.status === OrderStatus.FAILED
      ) {
        await prisma.payment.updateMany({
          where: {
            id: payment.id,
            status: PaymentStatus.PENDING,
          },
          data: {
            status: PaymentStatus.FAILED,
          },
        });
      }

      throw new ValidationError("This checkout is no longer payable");
    }

    if (payment.packageId && payment.package) {
      const pkg = payment.package;
      const confirmationTime = new Date();

      const result: SinglePaymentConfirmationTransactionResult =
        await prisma.$transaction(async (tx) => {
          const currentPackage = await tx.lessonPackage.findUnique({
            where: { id: pkg.id },
            include: {
              course: {
                select: {
                  id: true,
                  isPublished: true,
                  teacherProfileId: true,
                },
              },
            },
          });

          if (
            !currentPackage ||
            !currentPackage.isActive ||
            !currentPackage.course?.isPublished
          ) {
            await tx.payment.updateMany({
              where: {
                id: normalizedPaymentId,
                status: PaymentStatus.PENDING,
              },
              data: {
                status: PaymentStatus.FAILED,
              },
            });

            return {
              kind: "unavailable-package" as const,
            };
          }

          const activeEnrollment = await tx.enrollment.findFirst({
            where: buildCurrentEnrollmentWhere(
              {
                userId: payment.userId,
                package: {
                  courseId: pkg.courseId,
                },
              },
              confirmationTime,
            ),
            select: { id: true },
          });

          if (activeEnrollment) {
            const failedUpdate = await tx.payment.updateMany({
              where: {
                id: normalizedPaymentId,
                status: PaymentStatus.PENDING,
              },
              data: {
                status: PaymentStatus.FAILED,
              },
            });

            return {
              kind:
                failedUpdate.count === 1
                  ? ("stale-package" as const)
                  : ("already-processed" as const),
            };
          }

          const paymentUpdate = await tx.payment.updateMany({
            where: {
              id: normalizedPaymentId,
              status: PaymentStatus.PENDING,
            },
            data: {
              status: PaymentStatus.COMPLETED,
              paidAt: confirmationTime,
            },
          });

          if (paymentUpdate.count !== 1) {
            return {
              kind: "already-processed" as const,
            };
          }

          const updatedPayment = await tx.payment.findUniqueOrThrow({
            where: { id: normalizedPaymentId },
          });

          const existed = await tx.enrollment.findUnique({
            where: {
              userId_packageId: { userId: payment.userId, packageId: pkg.id },
            },
            select: {
              isActive: true,
              expiresAt: true,
            },
          });
          const hadCurrentEnrollment = isEnrollmentCurrentlyActive(
            existed,
            confirmationTime,
          );
          const expiresAt = calculateExpirationDate(pkg.duration);

          const enrollment = await tx.enrollment.upsert({
            where: {
              userId_packageId: { userId: payment.userId, packageId: pkg.id },
            },
            update: {
              isActive: true,
              expiresAt,
            },
            create: {
              userId: payment.userId,
              packageId: pkg.id,
              expiresAt,
            },
          });

          await tx.teacherProfile.update({
            where: { id: currentPackage.course.teacherProfileId },
            data: {
              ...(hadCurrentEnrollment
                ? {}
                : { totalStudents: { increment: 1 } }),
              totalEarnings: {
                increment: roundMoney(updatedPayment.teacherEarning),
              },
            },
          });

          return {
            kind: "single-complete" as const,
            payment: updatedPayment,
            enrollmentId: enrollment.id,
          };
        });

      if (result.kind === "already-processed") {
        const currentPayment = await prisma.payment.findUnique({
          where: { id: normalizedPaymentId },
        });

        if (currentPayment?.status === PaymentStatus.COMPLETED) {
          return this.buildCompletedPaymentResponse(currentPayment, {
            flow: "single-package-race-reconciliation",
          });
        }

        throw new ValidationError("This payment has already been processed");
      }

      if (result.kind === "unavailable-package") {
        throw new ValidationError("This package is no longer available");
      }

      if (result.kind === "stale-package") {
        throw new ValidationError(
          "This payment is stale because access to this package is already active",
        );
      }

      await this.trySyncTeacherWalletCredits(result.payment, {
        paymentId: result.payment.id,
        flow: "single-package-confirmation",
      });

      const enrollment = await prisma.enrollment.findUnique({
        where: { id: result.enrollmentId },
      });

      if (!enrollment) {
        throw new InternalServerError("Enrollment not found after creation");
      }

      return {
        payment: result.payment,
        enrollment,
      };
    }

    if (payment.orderId) {
      const confirmationTime = new Date();

      const result: CartPaymentConfirmationTransactionResult =
        await prisma.$transaction(async (tx) => {
          const order = await tx.order.findUnique({
            where: { id: payment.orderId! },
            include: orderPaymentItemsInclude,
          });

          if (!order) {
            return {
              kind: "order-not-found" as const,
            };
          }

          if (order.status !== OrderStatus.PENDING) {
            if (
              order.status === OrderStatus.CANCELLED ||
              order.status === OrderStatus.FAILED
            ) {
              await tx.payment.updateMany({
                where: {
                  id: normalizedPaymentId,
                  status: PaymentStatus.PENDING,
                },
                data: {
                  status: PaymentStatus.FAILED,
                },
              });
            }

            return {
              kind: "order-not-payable" as const,
            };
          }

          const unavailableOrderItem = order.items.find(
            (item) =>
              !item.package?.isActive || !item.package.course?.isPublished,
          );

          if (unavailableOrderItem) {
            await tx.payment.updateMany({
              where: {
                id: normalizedPaymentId,
                status: PaymentStatus.PENDING,
              },
              data: {
                status: PaymentStatus.FAILED,
              },
            });

            await tx.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.FAILED },
            });

            return {
              kind: "unavailable-order" as const,
            };
          }

          const courseIds = order.items.map((item) => item.package.course.id);
          if (new Set(courseIds).size !== courseIds.length) {
            await tx.payment.updateMany({
              where: {
                id: normalizedPaymentId,
                status: PaymentStatus.PENDING,
              },
              data: {
                status: PaymentStatus.FAILED,
              },
            });

            await tx.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.FAILED },
            });

            return {
              kind: "duplicate-course-order" as const,
            };
          }

          const activeEnrollments = await tx.enrollment.findMany({
            where: buildCurrentEnrollmentWhere(
              {
                userId: payment.userId,
                package: {
                  courseId: { in: courseIds },
                },
              },
              confirmationTime,
            ),
            select: { id: true },
          });

          if (activeEnrollments.length > 0) {
            const failedUpdate = await tx.payment.updateMany({
              where: {
                id: normalizedPaymentId,
                status: PaymentStatus.PENDING,
              },
              data: {
                status: PaymentStatus.FAILED,
              },
            });

            await tx.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.FAILED },
            });

            return {
              kind:
                failedUpdate.count === 1
                  ? ("stale-order" as const)
                  : ("already-processed" as const),
            };
          }

          const paymentUpdate = await tx.payment.updateMany({
            where: {
              id: normalizedPaymentId,
              status: PaymentStatus.PENDING,
            },
            data: {
              status: PaymentStatus.COMPLETED,
              paidAt: confirmationTime,
            },
          });

          if (paymentUpdate.count !== 1) {
            return {
              kind: "already-processed" as const,
            };
          }

          const updatedPayment = await tx.payment.findUniqueOrThrow({
            where: { id: normalizedPaymentId },
          });

          for (const item of order.items) {
            const pkg = item.package;
            const expiresAt = calculateExpirationDate(pkg?.duration);

            const existed = await tx.enrollment.findUnique({
              where: {
                userId_packageId: {
                  userId: payment.userId,
                  packageId: item.packageId,
                },
              },
              select: {
                isActive: true,
                expiresAt: true,
              },
            });
            const hadCurrentEnrollment = isEnrollmentCurrentlyActive(
              existed,
              confirmationTime,
            );

            await tx.enrollment.upsert({
              where: {
                userId_packageId: {
                  userId: payment.userId,
                  packageId: item.packageId,
                },
              },
              update: {
                isActive: true,
                expiresAt,
              },
              create: {
                userId: payment.userId,
                packageId: item.packageId,
                expiresAt,
              },
            });

            if (pkg?.course) {
              const netTeacherEarning = roundMoney(
                calculateTeacherNetEarning(
                  item.finalPrice,
                  pkg.course.teacherProfile,
                  config.PLATFORM_COMMISSION_RATE,
                ),
              );

              await tx.teacherProfile.update({
                where: { id: pkg.course.teacherProfileId },
                data: {
                  ...(hadCurrentEnrollment
                    ? {}
                    : { totalStudents: { increment: 1 } }),
                  totalEarnings: { increment: netTeacherEarning },
                },
              });
            }
          }

          await tx.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.PAID,
              paidAt: confirmationTime,
            },
          });

          await tx.cartItem.deleteMany({
            where: {
              userId: payment.userId,
              packageId: {
                in: order.items.map((item) => item.packageId),
              },
            },
          });

          return {
            kind: "order-complete" as const,
            payment: updatedPayment,
            orderId: order.id,
          };
        });

      if (result.kind === "already-processed") {
        const currentPayment = await prisma.payment.findUnique({
          where: { id: normalizedPaymentId },
        });

        if (currentPayment?.status === PaymentStatus.COMPLETED) {
          return this.buildCompletedPaymentResponse(currentPayment, {
            flow: "cart-race-reconciliation",
          });
        }

        throw new ValidationError("This payment has already been processed");
      }

      if (result.kind === "order-not-found") {
        throw new NotFoundError("Order not found");
      }

      if (result.kind === "order-not-payable") {
        throw new ValidationError("This checkout is no longer payable");
      }

      if (result.kind === "stale-order") {
        throw new ValidationError(
          "This checkout is stale because one or more packages are already active in your account",
        );
      }

      if (result.kind === "duplicate-course-order") {
        throw new ValidationError(
          "This checkout is invalid because it contains multiple packages for the same course",
        );
      }

      if (result.kind === "unavailable-order") {
        throw new ValidationError(
          "This checkout is stale because one or more packages are no longer available",
        );
      }

      await this.trySyncTeacherWalletCredits(result.payment, {
        paymentId: result.payment.id,
        orderId: result.orderId,
        flow: "cart-confirmation",
      });

      return {
        payment: result.payment,
        orderId: result.orderId,
      };
    }

    throw new ValidationError("Invalid payment state");
  }

  /**
   * Get user's payment history.
   */
  async getUserPayments(userId: string): Promise<UserPaymentHistoryRecord[]> {
    const normalizedUserId = ensureRequiredPaymentField(userId, "User ID");

    return prisma.payment.findMany({
      where: { userId: normalizedUserId },
      include: userPaymentHistoryInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get payment by ID.
   */
  async getPaymentById(
    paymentId: string,
    userId: string,
  ): Promise<PaymentDetailsRecord> {
    const normalizedPaymentId = ensureRequiredPaymentField(
      paymentId,
      "Payment ID",
    );
    const normalizedUserId = ensureRequiredPaymentField(userId, "User ID");

    const payment = await prisma.payment.findUnique({
      where: { id: normalizedPaymentId },
      include: paymentDetailsInclude,
    });

    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    if (payment.userId !== normalizedUserId) {
      throw new AuthorizationError("You can only access your own payment");
    }

    return payment;
  }

  /**
   * Get teacher's earnings.
   */
  async getTeacherEarnings(userId: string): Promise<{
    totalEarnings: number;
    payments: TeacherEarningsPayment[];
  }> {
    const { teacherProfile } = await requireTeacherProfileByUserId(userId);
    const payments = await findCompletedTeacherPayments(teacherProfile.id);

    const entries = buildTeacherEarningsTimeline(
      payments,
      teacherProfile.id,
      config.PLATFORM_COMMISSION_RATE,
    );
    const totalEarnings = entries.reduce(
      (sum, entry) => sum + (entry.teacherEarning || 0),
      0,
    );

    return {
      totalEarnings: roundMoney(totalEarnings),
      payments: entries,
    };
  }

  /**
   * Get teacher's earnings grouped by course.
   */
  async getTeacherEarningsByCourse(userId: string): Promise<{
    totalEarnings: number;
    totalCourses: number;
    totalStudents: number;
    courseEarnings: Array<{
      courseId: string;
      courseTitle: string;
      totalEarnings: number;
      totalStudents: number;
      payments: TeacherEarningsEntry[];
    }>;
    recentPayments: TeacherEarningsEntry[];
  }> {
    const { teacherProfile } = await requireTeacherProfileByUserId(userId);
    const payments = await findCompletedTeacherPayments(teacherProfile.id);
    const summary = buildTeacherCourseEarningsSummary(
      payments,
      teacherProfile.id,
      config.PLATFORM_COMMISSION_RATE,
    );

    return {
      totalEarnings: roundMoney(summary.totalEarnings),
      totalCourses: summary.totalCourses,
      totalStudents: summary.totalStudents,
      courseEarnings: summary.courseEarnings.map((course) => ({
        ...course,
        totalEarnings: roundMoney(course.totalEarnings),
      })),
      recentPayments: summary.recentPayments,
    };
  }

  /**
   * Request refund for a direct single-package payment.
   * Order-based payments should use the order refund workflow.
   */
  async requestRefund(paymentId: string): Promise<PaymentModel> {
    const normalizedPaymentId = ensureRequiredPaymentField(
      paymentId,
      "Payment ID",
    );

    const payment = await prisma.payment.findUnique({
      where: { id: normalizedPaymentId },
    });

    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new ValidationError("Only completed payments can be refunded");
    }

    if (payment.orderId) {
      throw new ValidationError(
        "Use the order refund workflow for order-based payments",
      );
    }

    if (!payment.packageId) {
      throw new ValidationError("Invalid payment state");
    }

    const normalizedPackageId = payment.packageId;

    const lessonPackage = await prisma.lessonPackage.findUnique({
      where: { id: normalizedPackageId },
      include: {
        course: {
          include: {
            teacherProfile: true,
          },
        },
      },
    });

    const updatedPayment = await prisma.$transaction(async (tx) => {
      const refundUpdate = await tx.payment.updateMany({
        where: {
          id: normalizedPaymentId,
          status: PaymentStatus.COMPLETED,
        },
        data: { status: PaymentStatus.REFUNDED },
      });

      if (refundUpdate.count !== 1) {
        throw new ValidationError("This payment has already been processed");
      }

      const refundedPayment = await tx.payment.findUniqueOrThrow({
        where: { id: normalizedPaymentId },
      });

      await tx.enrollment.updateMany({
        where: {
          userId: payment.userId,
          packageId: normalizedPackageId,
        },
        data: { isActive: false },
      });

      const teacherProfile = lessonPackage?.course?.teacherProfile;
      if (teacherProfile) {
        await tx.teacherProfile.update({
          where: { id: teacherProfile.id },
          data: {
            totalEarnings: {
              decrement: roundMoney(payment.teacherEarning),
            },
          },
        });

        const activeStudentCount =
          await countDistinctActiveStudentsForTeacherProfile(
            tx,
            teacherProfile.id,
          );

        await tx.teacherProfile.update({
          where: { id: teacherProfile.id },
          data: { totalStudents: activeStudentCount },
        });
      }

      return refundedPayment;
    });

    const teacherUserId = lessonPackage?.course?.teacherProfile?.userId;
    if (teacherUserId) {
      try {
        const walletService = (await import("./wallet.service")).default;
        await walletService.debitForRefund(
          teacherUserId,
          roundMoney(payment.teacherEarning),
          {
            paymentId: payment.id,
            packageId: normalizedPackageId,
          },
        );
      } catch (error) {
        logger.error(
          "Failed to synchronize teacher wallet debit for direct payment refund",
          {
            paymentId: payment.id,
            error,
          },
        );
      }
    }

    return updatedPayment;
  }
}

export default new PaymentService();

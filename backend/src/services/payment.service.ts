import Stripe from 'stripe';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import type { Payment as PaymentModel } from '@prisma/client';
import prisma from '../config/database';
import config from '../config/env';
import {
  NotFoundError,
  ValidationError,
  InternalServerError,
} from '../utils/errors';
import ordersService from './orders.service';

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

// Helper: normalize commission rate [0, 100]
const getCommissionRate = (teacherProfile?: { commissionRate?: unknown }): number => {
  const raw = (teacherProfile?.commissionRate ?? config.PLATFORM_COMMISSION_RATE ?? 0);
  const n = toNum(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 100) return 100;
  return n;
};

// Initialize Stripe
const stripe = config.STRIPE_SECRET_KEY
  ? new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null;

// Type for teacher earnings entry
type TeacherEarningsEntry = {
  id: string;
  amount: number;
  teacherEarning: number;
  paidAt: Date | null;
  package: { id: string; name: string; finalPrice: number; course: { id: string; title: string } };
  user: { firstName: string | null; lastName: string | null; email: string } | null;
};

/**
 * Payment Service
 * Handles payment processing and enrollment
 */
class PaymentService {
  /**
   * Create cart payment intent (multi-course checkout)
   */
  async createCartPaymentIntent(userId: string): Promise<{
    payment: PaymentModel;
    clientSecret: string | null;
    order: {
      id: string;
      orderNo: string;
      amount: number;
    };
  }> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    // Load cart items
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: userId.trim() },
      include: {
        package: {
          include: {
            course: {
              include: { teacherProfile: true },
            },
          },
        },
      },
    });

    if (!cartItems || cartItems.length === 0) {
      throw new ValidationError('Your cart is empty');
    }

    // Validate availability of all items (active package and published course)
    const unavailable = cartItems.find(
      (it) => !it.package || !it.package.isActive || !it.package.course?.isPublished
    );
    if (unavailable) {
      throw new ValidationError('Some items are no longer available. Please update your cart.');
    }

    // Create order from cart
    const order = await ordersService.createOrderFromCart(userId.trim());

    // Load order with items to compute accurate commissions (avoid relying on cart snapshot)
    const orderWithItems = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
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
    });

    if (!orderWithItems) {
      throw new InternalServerError('Failed to load order items for commission calculation');
    }

    // Calculate commission per item using teacher-specific commissionRate when present
    const amount = toNum(order.totalAmount);
    let platformCommission = 0;
    for (const item of orderWithItems.items) {
      const rate = getCommissionRate(item.package?.course?.teacherProfile);
      platformCommission += (toNum(item.finalPrice) * rate) / 100;
    }
    const teacherEarning = amount - platformCommission;

    // Create payment record for the order
    const payment = await prisma.payment.create({
      data: {
        userId: userId.trim(),
        orderId: order.id,
        amount,
        platformCommission,
        teacherEarning,
        status: PaymentStatus.PENDING,
      },
    });

    // Create Stripe payment intent if configured
    let clientSecret: string | null = null;
    if (stripe) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: 'usd',
          metadata: {
            paymentId: payment.id,
            userId: userId.trim(),
            orderId: order.id,
          },
        });
        clientSecret = paymentIntent.client_secret;

        await prisma.payment.update({
          where: { id: payment.id },
          data: { stripePaymentId: paymentIntent.id },
        });
      } catch {
        // Fallback: allow non-Stripe flow
      }
    }

    // Clear cart only after payment confirmed; keep items now
    return {
      payment,
      clientSecret,
      order: {
        id: order.id,
        orderNo: order.orderNo,
        amount: toNum(order.totalAmount),
      },
    };
  }

  /**
   * Create payment intent for package purchase
   */
  async createPaymentIntent(userId: string, packageId: string): Promise<{
    payment: PaymentModel;
    clientSecret: string | null;
    package: {
      id: string;
      name: string;
      price: number;
    };
  }> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    if (!packageId || !packageId.trim()) {
      throw new ValidationError('Package ID is required');
    }
    // Get package details
    const lessonPackage = await prisma.lessonPackage.findUnique({
      where: { id: packageId.trim() },
      include: {
        course: {
          include: {
            teacherProfile: true,
          },
        },
      },
    });

    if (!lessonPackage) {
      throw new NotFoundError('Package not found');
    }

    if (!lessonPackage.isActive || !lessonPackage.course?.isPublished) {
      throw new ValidationError('This package is no longer available');
    }

    // Check if user already enrolled
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId: userId.trim(),
        packageId: packageId.trim(),
        isActive: true,
      },
    });

    if (existingEnrollment) {
      throw new ValidationError('You are already enrolled in this package');
    }

    // Calculate commission using teacher-specific rate when present
    const amount = toNum(lessonPackage.finalPrice);
    const teacherRate = getCommissionRate(lessonPackage.course?.teacherProfile);
    const platformCommission = (amount * teacherRate) / 100;
    const teacherEarning = amount - platformCommission;

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: userId.trim(),
        packageId: packageId.trim(),
        amount,
        platformCommission,
        teacherEarning,
        status: PaymentStatus.PENDING,
      },
    });

    // Create Stripe payment intent if configured
    let clientSecret: string | null = null;
    if (stripe) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          metadata: {
            paymentId: payment.id,
            userId: userId.trim(),
            packageId: packageId.trim(),
          },
        });

        clientSecret = paymentIntent.client_secret;

        // Update payment with Stripe payment ID
        await prisma.payment.update({
          where: { id: payment.id },
          data: { stripePaymentId: paymentIntent.id },
        });
      } catch {
        // Fallback: if Stripe fails (e.g., invalid key), continue without clientSecret
        // This allows non-Stripe (dev) flow to proceed
      }
    }

    return {
      payment,
      clientSecret,
      package: {
        id: lessonPackage.id,
        name: lessonPackage.name,
        price: toNum(lessonPackage.finalPrice),
      },
    };
  }

  /**
   * Confirm payment and create enrollment
   */
  async confirmPayment(
    paymentId: string,
    stripePaymentId?: string
  ): Promise<
    | { payment: PaymentModel; enrollment: any }
    | { payment: PaymentModel; orderId: string }
    | { payment: PaymentModel }
  > {
    if (!paymentId || !paymentId.trim()) {
      throw new ValidationError('Payment ID is required');
    }
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId.trim() },
      include: {
        package: true,
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // If already completed, make this method idempotent by returning the existing state
    if (payment.status === PaymentStatus.COMPLETED) {
      if (payment.packageId) {
        const enrollment = await prisma.enrollment.findFirst({
          where: { userId: payment.userId, packageId: payment.packageId },
        });
        return { payment, enrollment };
      }
      if (payment.orderId) {
        return { payment, orderId: payment.orderId };
      }
      return { payment };
    }

    // Verify payment with Stripe if configured
    if (stripe) {
      try {
        const intentId = stripePaymentId ?? payment.stripePaymentId ?? undefined;

        // If both provided and mismatch, fail early
        if (stripePaymentId && payment.stripePaymentId && stripePaymentId !== payment.stripePaymentId) {
          throw new ValidationError('Payment verification failed');
        }

        if (intentId) {
          const paymentIntent = await stripe.paymentIntents.retrieve(intentId);

          if (paymentIntent.status !== 'succeeded') {
            throw new ValidationError('Payment not successful');
          }

          const metaPaymentId = (paymentIntent.metadata as Record<string, string | null>)['paymentId'];
          if (metaPaymentId !== payment.id) {
            throw new ValidationError('Payment verification mismatch');
          }

          if (paymentIntent.amount !== Math.round(toNum(payment.amount) * 100)) {
            throw new ValidationError('Payment amount mismatch');
          }

          if (!payment.stripePaymentId) {
            await prisma.payment.update({
              where: { id: payment.id },
              data: { stripePaymentId: intentId },
            });
          }
        }
        // If Stripe is configured but no intent id is available, we allow non-Stripe/manual flows
      } catch (error) {
        if (error instanceof ValidationError) throw error;
        throw new ValidationError('Failed to verify payment');
      }
    }

    // Prepare results to return and wallet credit tasks to perform after commit
    // Use Prisma model type for updatedPayment to avoid type mismatches with included relations
    let updatedPayment: PaymentModel | null = null;

    // Single-package purchase flow
    if (payment.packageId && payment.package) {
      const pkg = payment.package;
      const expiresAt = pkg.duration
        ? new Date(Date.now() + toNum(pkg.duration) * 24 * 60 * 60 * 1000)
        : null;

      let enrollmentId: string | null = null;
      const result = await prisma.$transaction(async (tx) => {
        // Update payment status
        const upPayment = await tx.payment.update({
          where: { id: paymentId.trim() },
          data: {
            status: PaymentStatus.COMPLETED,
            paidAt: new Date(),
          },
        });

        // Check existing enrollment to avoid overcounting totalStudents
        const existed = await tx.enrollment.findUnique({
          where: { userId_packageId: { userId: payment.userId, packageId: pkg.id } },
        });

        // Upsert enrollment to guarantee idempotency
        const enrollment = await tx.enrollment.upsert({
          where: { userId_packageId: { userId: payment.userId, packageId: pkg.id } },
          update: { isActive: true, expiresAt },
          create: {
            userId: payment.userId,
            packageId: pkg.id,
            expiresAt,
          },
        });

        // Update teacher's total students (only if new) and earnings (always)
        if (pkg.courseId) {
          const courseEntity = await tx.course.findUnique({ where: { id: pkg.courseId } });
          if (courseEntity) {
            await tx.teacherProfile.update({
              where: { id: courseEntity.teacherProfileId },
              data: {
                ...(existed ? {} : { totalStudents: { increment: 1 } }),
                totalEarnings: { increment: toNum(payment.teacherEarning) },
              },
            });
          }
        }

        enrollmentId = enrollment.id;
        return upPayment;
      });

      updatedPayment = result;

      // Credit teacher wallet after transaction (non-blocking)
      try {
        if (pkg.courseId) {
          const courseRecord = await prisma.course.findUnique({ where: { id: pkg.courseId } });
          if (courseRecord) {
            const teacher = await prisma.teacherProfile.findUnique({ where: { id: courseRecord.teacherProfileId } });
            if (teacher) {
              const walletService = (await import('./wallet.service')).default;
              if (payment.packageId) {
                await walletService.creditForTeacher(teacher.userId, toNum(payment.teacherEarning), { paymentId: payment.id, packageId: payment.packageId });
              }
            }
          }
        }
      } catch {
        // non-blocking
      }

      if (!enrollmentId) {
        throw new InternalServerError('Failed to create enrollment');
      }
      const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
      if (!enrollment) {
        throw new InternalServerError('Enrollment not found after creation');
      }
      return {
        payment: updatedPayment,
        enrollment,
      };
    }

    // Order/cart-based payment flow
    if (payment.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: payment.orderId },
        include: {
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
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Perform DB changes atomically
      const updatedPaymentLocal = await prisma.$transaction(async (tx) => {
        // Update payment status
        const upPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.COMPLETED,
            paidAt: new Date(),
          },
        });

        // Create enrollments for each order item
        for (const item of order.items) {
          const pkg = item.package;
          const expiresAt = pkg?.duration
            ? new Date(Date.now() + toNum(pkg.duration) * 24 * 60 * 60 * 1000)
            : null;

          // Check existing enrollment to avoid overcounting totalStudents
          const existed = await tx.enrollment.findUnique({
            where: { userId_packageId: { userId: payment.userId, packageId: item.packageId } },
          });

          await tx.enrollment.upsert({
            where: { userId_packageId: { userId: payment.userId, packageId: item.packageId } },
            update: { isActive: true, expiresAt },
            create: {
              userId: payment.userId,
              packageId: item.packageId,
              expiresAt,
            },
          });

          // Update teacher stats per course
          if (pkg?.course) {
            const rate = getCommissionRate(pkg.course?.teacherProfile);
            const netTeacherEarning = toNum(item.finalPrice) * (1 - rate / 100);
            await tx.teacherProfile.update({
              where: { id: pkg.course.teacherProfileId },
              data: {
                ...(existed ? {} : { totalStudents: { increment: 1 } }),
                totalEarnings: { increment: netTeacherEarning },
              },
            });
          }
        }

        // Mark order as PAID
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PAID, paidAt: new Date() }
        });

        // Clear user's cart
        await tx.cartItem.deleteMany({ where: { userId: payment.userId } });

        return upPayment;
      });

      updatedPayment = updatedPaymentLocal;

      // Credit teacher wallets per item after commit
      try {
        const walletService = (await import('./wallet.service')).default;
        for (const item of order.items) {
          const pkg = item.package;
          if (pkg?.course) {
            const teacherProfile = await prisma.teacherProfile.findUnique({ where: { id: pkg.course.teacherProfileId } });
            if (teacherProfile) {
              const rate = getCommissionRate(teacherProfile);
              const teacherNet = toNum(item.finalPrice) * (1 - rate / 100);
              await walletService.creditForTeacher(teacherProfile.userId, teacherNet, { paymentId: payment.id, orderItemId: item.id });
            }
          }
        }
      } catch {
        // non-blocking
      }

      return { payment: updatedPaymentLocal, orderId: order.id };
    }

    throw new ValidationError('Invalid payment state');
  }

  /**
   * Get user's payment history
   */
  async getUserPayments(userId: string): Promise<any[]> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const payments = await prisma.payment.findMany({
      where: { userId: userId.trim() },
      include: {
        package: {
          include: {
            course: {
              include: {
                teacherProfile: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments;
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string, userId: string): Promise<any> {
    if (!paymentId || !paymentId.trim()) {
      throw new ValidationError('Payment ID is required');
    }
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId.trim() },
      include: {
        package: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.userId !== userId.trim()) {
      throw new ValidationError('Unauthorized access to payment');
    }

    return payment;
  }

  /**
   * Get teacher's earnings
   */
  async getTeacherEarnings(userId: string): Promise<{
    totalEarnings: number;
    payments: Array<{
      id: string;
      amount: number;
      teacherEarning: number;
      paidAt: Date | null;
      status: PaymentStatus;
      package: any;
      user: { firstName: string | null; lastName: string | null; email: string } | null;
    }>;
  }> {
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: userId.trim() },
    });

    if (!teacherProfile) {
      throw new NotFoundError('Teacher profile not found');
    }

    // Fetch all completed payments that may contribute to this teacher
    const payments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        OR: [
          // Direct single-package purchases for this teacher
          {
            package: {
              course: { teacherProfileId: teacherProfile.id },
            },
          },
          // Cart/order purchases that include any item of this teacher
          {
            order: {
              items: {
                some: {
                  package: { course: { teacherProfileId: teacherProfile.id } },
                },
              },
            },
          },
        ],
      },
      include: {
        package: { include: { course: { include: { teacherProfile: true } } } },
        order: {
          include: {
            items: { include: { package: { include: { course: { include: { teacherProfile: true } } } } } },
          },
        },
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    // Flatten into per-course entries
    const entries: Array<{
      id: string;
      amount: number;
      teacherEarning: number;
      paidAt: Date | null;
      status: PaymentStatus;
      package: any;
      user: { firstName: string | null; lastName: string | null; email: string } | null;
    }> = [];

    for (const p of payments) {
      if (p.packageId && p.package && p.package.course.teacherProfileId === teacherProfile.id) {
        // Direct purchase
        entries.push({
          id: p.id,
          amount: toNum(p.amount),
          teacherEarning: toNum(p.teacherEarning),
          paidAt: p.paidAt,
          status: p.status,
          package: p.package,
          user: p.user,
        });
      }

      if (p.orderId && p.order) {
        for (const item of p.order.items) {
          const pkg = item.package;
          if (pkg?.course && pkg.course.teacherProfileId === teacherProfile.id) {
            const teacherRate = getCommissionRate(pkg.course?.teacherProfile);
            const teacherEarning = toNum(item.finalPrice) * (1 - teacherRate / 100);
            entries.push({
              id: `${p.id}:${item.id}`,
              amount: toNum(item.finalPrice),
              teacherEarning,
              paidAt: p.paidAt,
              status: p.status,
              package: pkg,
              user: p.user,
            });
          }
        }
      }
    }

    // Sort entries by paidAt desc
    entries.sort((a, b) => (new Date(b.paidAt || 0).getTime()) - (new Date(a.paidAt || 0).getTime()));

    const totalEarnings = entries.reduce((sum, e) => sum + (e.teacherEarning || 0), 0);

    return {
      totalEarnings,
      payments: entries,
    };
  }

  /**
   * Get teacher's earnings grouped by course
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
    if (!userId || !userId.trim()) {
      throw new ValidationError('User ID is required');
    }
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: userId.trim() },
    });

    if (!teacherProfile) {
      throw new NotFoundError('Teacher profile not found');
    }

    // Get all completed payments related to this teacher (direct and order-based)
    const payments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        OR: [
          { package: { course: { teacherProfileId: teacherProfile.id } } },
          { order: { items: { some: { package: { course: { teacherProfileId: teacherProfile.id } } } } } },
        ],
      },
      include: {
        package: { include: { course: { include: { teacherProfile: true } } } },
        order: { include: { items: { include: { package: { include: { course: { include: { teacherProfile: true } } } } } } } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { paidAt: 'desc' },
    });

    const courseEarningsMap = new Map<string, {
      courseId: string;
      courseTitle: string;
      totalEarnings: number;
      totalStudents: number;
      payments: TeacherEarningsEntry[];
    }>();

    const pushToCourse = (courseId: string, courseTitle: string, entry: TeacherEarningsEntry) => {
      if (!courseEarningsMap.has(courseId)) {
        courseEarningsMap.set(courseId, {
          courseId,
          courseTitle,
          totalEarnings: 0,
          totalStudents: 0,
          payments: [],
        });
      }
      const courseData = courseEarningsMap.get(courseId)!;
      courseData.totalEarnings += entry.teacherEarning;
      courseData.totalStudents += 1;
      courseData.payments.push(entry);
    };

    // Build entries from payments
    const entries: TeacherEarningsEntry[] = [];
    for (const p of payments) {
      if (p.packageId && p.package && p.package.course.teacherProfileId === teacherProfile.id) {
        // Use stored teacherEarning for direct purchases to preserve historical accuracy
        const entry: TeacherEarningsEntry = {
          id: p.id,
          amount: toNum(p.amount),
          teacherEarning: toNum(p.teacherEarning),
          paidAt: p.paidAt,
          package: { id: p.package.id, name: p.package.name, finalPrice: toNum(p.package.finalPrice), course: { id: p.package.course.id, title: p.package.course.title } },
          user: p.user,
        };
        entries.push(entry);
        pushToCourse(p.package.course.id, p.package.course.title, entry);
      }

      if (p.orderId && p.order) {
        for (const item of p.order.items) {
          const pkg = item.package;
          if (pkg?.course && pkg.course.teacherProfileId === teacherProfile.id) {
            const tRate = getCommissionRate(pkg.course?.teacherProfile);
            const teacherEarning = toNum(item.finalPrice) * (1 - tRate / 100);
            const entry: TeacherEarningsEntry = {
              id: `${p.id}:${item.id}`,
              amount: toNum(item.finalPrice),
              teacherEarning,
              paidAt: p.paidAt,
              package: { id: pkg.id, name: pkg.name, finalPrice: toNum(pkg.finalPrice), course: { id: pkg.course.id, title: pkg.course.title } },
              user: p.user,
            };
            entries.push(entry);
            pushToCourse(pkg.course.id, pkg.course.title, entry);
          }
        }
      }
    }

    const courseEarnings = Array.from(courseEarningsMap.values()).sort(
      (a, b) => b.totalEarnings - a.totalEarnings
    );

    const totalEarnings = entries.reduce((sum, e) => sum + e.teacherEarning, 0);

    return {
      totalEarnings,
      totalCourses: courseEarnings.length,
      totalStudents: entries.length,
      courseEarnings,
      recentPayments: entries.slice(0, 10),
    };
  }

  /**
   * Request refund (Admin only)
   */
  async requestRefund(paymentId: string): Promise<PaymentModel> {
    if (!paymentId || !paymentId.trim()) {
      throw new ValidationError('Payment ID is required');
    }
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId.trim() },
      include: {
        order: {
          include: { items: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new ValidationError('Only completed payments can be refunded');
    }

    // Process refund with Stripe if configured
    if (stripe && payment.stripePaymentId) {
      try {
        await stripe.refunds.create({
          payment_intent: payment.stripePaymentId,
        });
      } catch {
        throw new InternalServerError('Failed to process refund');
      }
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId.trim() },
      data: { status: PaymentStatus.REFUNDED },
    });

    // Deactivate enrollment(s)
    if (payment.packageId) {
      await prisma.enrollment.updateMany({
        where: {
          userId: payment.userId,
          packageId: payment.packageId,
        },
        data: { isActive: false },
      });
    } else if (payment.orderId && payment.order) {
      const packageIds = payment.order.items.map((i) => i.packageId);
      if (packageIds.length > 0) {
        await prisma.enrollment.updateMany({
          where: {
            userId: payment.userId,
            packageId: { in: packageIds },
          },
          data: { isActive: false },
        });
      }
    }

    return updatedPayment;
  }
}

export default new PaymentService();

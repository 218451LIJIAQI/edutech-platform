import Stripe from 'stripe';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import prisma from '../config/database';
import config from '../config/env';
import {
  NotFoundError,
  ValidationError,
  InternalServerError,
} from '../utils/errors';
import ordersService from './orders.service';

// Initialize Stripe
const stripe = config.STRIPE_SECRET_KEY
  ? new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null;

/**
 * Payment Service
 * Handles payment processing and enrollment
 */
class PaymentService {
  /**
   * Create cart payment intent (multi-course checkout)
   */
  async createCartPaymentIntent(userId: string) {
    // Load cart items
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
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

    // Create order from cart
    const order = await ordersService.createOrderFromCart(userId);

    // Calculate commission per item using teacher-specific commissionRate when present
    const amount = order.totalAmount;
    let platformCommission = 0;
    for (const item of cartItems) {
      const pkg = item.package;
      const course = pkg?.course;
      const teacherRate = course?.teacherProfile?.commissionRate ?? config.PLATFORM_COMMISSION_RATE;
      platformCommission += (pkg.finalPrice * teacherRate) / 100;
    }
    const teacherEarning = amount - platformCommission;

    // Create payment record for the order
    const payment = await prisma.payment.create({
      data: {
        userId,
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
            userId,
            orderId: order.id,
          },
        });
        clientSecret = paymentIntent.client_secret;

        await prisma.payment.update({
          where: { id: payment.id },
          data: { stripePaymentId: paymentIntent.id },
        });
      } catch (error) {
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
        amount: order.totalAmount,
      },
    };
  }

  /**
   * Create payment intent for package purchase
   */
  async createPaymentIntent(userId: string, packageId: string) {
    // Get package details
    const lessonPackage = await prisma.lessonPackage.findUnique({
      where: { id: packageId },
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

    if (!lessonPackage.isActive) {
      throw new ValidationError('This package is no longer available');
    }

    // Check if user already enrolled
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        packageId,
        isActive: true,
      },
    });

    if (existingEnrollment) {
      throw new ValidationError('You are already enrolled in this package');
    }

    // Calculate commission using teacher-specific rate when present
    const amount = lessonPackage.finalPrice;
    const teacherRate = lessonPackage.course?.teacherProfile?.commissionRate ?? config.PLATFORM_COMMISSION_RATE;
    const platformCommission = (amount * teacherRate) / 100;
    const teacherEarning = amount - platformCommission;

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        packageId,
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
            userId,
            packageId,
          },
        });

        clientSecret = paymentIntent.client_secret;

        // Update payment with Stripe payment ID
        await prisma.payment.update({
          where: { id: payment.id },
          data: { stripePaymentId: paymentIntent.id },
        });
      } catch (error) {
        // Fallback: if Stripe fails (e.g., invalid key), continue without clientSecret
        // This allows non-Stripe (dev) flow to proceed
        // Optionally log error via your logger
      }
    }

    return {
      payment,
      clientSecret,
      package: {
        id: lessonPackage.id,
        name: lessonPackage.name,
        price: lessonPackage.finalPrice,
      },
    };
  }

  /**
   * Confirm payment and create enrollment
   */
  async confirmPayment(paymentId: string, stripePaymentId?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        package: true,
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new ValidationError('Payment already completed');
    }

    // Verify payment with Stripe if configured
    if (stripe && stripePaymentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          stripePaymentId
        );

        if (paymentIntent.status !== 'succeeded') {
          throw new ValidationError('Payment not successful');
        }
      } catch (error) {
        throw new ValidationError('Failed to verify payment');
      }
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
      },
    });

    // Single-package purchase flow
    if (payment.packageId && payment.package) {
      const expiresAt = payment.package.duration
        ? new Date(Date.now() + payment.package.duration * 24 * 60 * 60 * 1000)
        : null;

      const enrollment = await prisma.enrollment.create({
        data: {
          userId: payment.userId,
          packageId: payment.packageId,
          expiresAt,
        },
      });

      // Update teacher's total students and earnings
      const course = await prisma.course.findUnique({
        where: { id: payment.package.courseId },
      });

      if (course) {
        await prisma.teacherProfile.update({
          where: { id: course.teacherProfileId },
          data: {
            totalStudents: { increment: 1 },
            totalEarnings: { increment: payment.teacherEarning },
          },
        });
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

      // Create enrollments for each order item
      for (const item of order.items) {
        const pkg = item.package;
        const expiresAt = pkg?.duration
          ? new Date(Date.now() + (pkg.duration as number) * 24 * 60 * 60 * 1000)
          : null;

        // Upsert enrollment to prevent crashes if already enrolled
        await prisma.enrollment.upsert({
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
          const teacherRate = pkg.course?.teacherProfile?.commissionRate ?? config.PLATFORM_COMMISSION_RATE;
          const netTeacherEarning = item.finalPrice * (1 - teacherRate / 100);
          await prisma.teacherProfile.update({
            where: { id: pkg.course.teacherProfileId },
            data: {
              totalStudents: { increment: 1 },
              totalEarnings: { increment: netTeacherEarning },
            },
          });
        }
      }

      // Mark order as PAID
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID, paidAt: new Date() }
      });

      // Clear user's cart
      await prisma.cartItem.deleteMany({ where: { userId: payment.userId } });

      return { payment: updatedPayment, orderId: order.id };
    }

    throw new ValidationError('Invalid payment state');
  }

  /**
   * Get user's payment history
   */
  async getUserPayments(userId: string) {
    const payments = await prisma.payment.findMany({
      where: { userId },
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
  async getPaymentById(paymentId: string, userId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
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

    if (payment.userId !== userId) {
      throw new ValidationError('Unauthorized access to payment');
    }

    return payment;
  }

  /**
   * Get teacher's earnings
   */
  async getTeacherEarnings(userId: string) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
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
        package: { include: { course: true } },
        order: {
          include: {
            items: { include: { package: { include: { course: true } } } },
          },
        },
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    // Flatten into per-course entries
    const entries: any[] = [];
    for (const p of payments) {
      if (p.packageId && p.package && p.package.course.teacherProfileId === teacherProfile.id) {
        // Direct purchase
        entries.push({
          id: p.id,
          amount: p.amount,
          teacherEarning: p.teacherEarning,
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
            const teacherEarning = item.finalPrice * (1 - ((teacherProfile.commissionRate ?? config.PLATFORM_COMMISSION_RATE) / 100));
            entries.push({
              id: `${p.id}:${item.id}`,
              amount: item.finalPrice,
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
  async getTeacherEarningsByCourse(userId: string) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
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
        package: { include: { course: true } },
        order: { include: { items: { include: { package: { include: { course: true } } } } } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { paidAt: 'desc' },
    });

    type Entry = {
      id: string;
      amount: number;
      teacherEarning: number;
      paidAt: Date | null;
      package: { id: string; name: string; finalPrice: number; course: { id: string; title: string } };
      user: { firstName: string | null; lastName: string | null; email: string } | null;
    };

    const courseEarningsMap = new Map<string, {
      courseId: string;
      courseTitle: string;
      totalEarnings: number;
      totalStudents: number;
      payments: Entry[];
    }>();

    const pushToCourse = (courseId: string, courseTitle: string, entry: Entry) => {
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
    const entries: Entry[] = [];
    for (const p of payments) {
      if (p.packageId && p.package && p.package.course.teacherProfileId === teacherProfile.id) {
        const entry: Entry = {
          id: p.id,
          amount: p.amount,
          teacherEarning: p.teacherEarning,
          paidAt: p.paidAt,
          package: { id: p.package.id, name: p.package.name, finalPrice: p.package.finalPrice, course: { id: p.package.course.id, title: p.package.course.title } },
          user: p.user,
        };
        entries.push(entry);
        pushToCourse(p.package.course.id, p.package.course.title, entry);
      }

      if (p.orderId && p.order) {
        for (const item of p.order.items) {
          const pkg = item.package;
          if (pkg?.course && pkg.course.teacherProfileId === teacherProfile.id) {
            const teacherEarning = item.finalPrice * (1 - config.PLATFORM_COMMISSION_RATE / 100);
            const entry: Entry = {
              id: `${p.id}:${item.id}`,
              amount: item.finalPrice,
              teacherEarning,
              paidAt: p.paidAt,
              package: { id: pkg.id, name: pkg.name, finalPrice: pkg.finalPrice, course: { id: pkg.course.id, title: pkg.course.title } },
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
  async requestRefund(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
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
      } catch (error) {
        throw new InternalServerError('Failed to process refund');
      }
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
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


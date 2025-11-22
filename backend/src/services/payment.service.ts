import Stripe from 'stripe';
import { PaymentStatus } from '@prisma/client';
import prisma from '../config/database';
import config from '../config/env';
import {
  NotFoundError,
  ValidationError,
  InternalServerError,
} from '../utils/errors';

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

    // Calculate commission
    const amount = lessonPackage.finalPrice;
    const platformCommission =
      (amount * config.PLATFORM_COMMISSION_RATE) / 100;
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
        throw new InternalServerError('Failed to create payment intent');
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

    // Create enrollment
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

    const payments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        package: {
          course: {
            teacherProfileId: teacherProfile.id,
          },
        },
      },
      include: {
        package: {
          include: {
            course: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    const totalEarnings = payments.reduce(
      (sum, payment) => sum + payment.teacherEarning,
      0
    );

    return {
      totalEarnings,
      payments,
    };
  }

  /**
   * Request refund (Admin only)
   */
  async requestRefund(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
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

    // Deactivate enrollment
    await prisma.enrollment.updateMany({
      where: {
        userId: payment.userId,
        packageId: payment.packageId,
      },
      data: { isActive: false },
    });

    return updatedPayment;
  }
}

export default new PaymentService();


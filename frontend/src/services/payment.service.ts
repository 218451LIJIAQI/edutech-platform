import api from './api';
import { Payment, ApiResponse, PaymentWithDetails, Enrollment } from '@/types';
import { extractData } from './response-utils';
import {
  normalizePayment,
  toFiniteNumber,
} from '@/utils/asset-normalizers';

type ConfirmPaymentResponse =
  | {
      payment: Payment;
      enrollment: Enrollment;
    }
  | {
      payment: Payment;
      orderId: string;
    }
  | {
      payment: Payment;
    };

/**
 * Payment Service
 * Handles all payment-related API calls
 */

const paymentService = {
  /**
   * Create payment intent
   */
  // Create cart payment intent (multi-course checkout)
  createCartPaymentIntent: async (): Promise<{
    payment: Payment;
    order: {
      id: string;
      orderNo: string;
      amount: number;
    };
  }> => {
    const response = await api.post<ApiResponse<{
      payment: Payment;
      order: {
        id: string;
        orderNo: string;
        amount: number;
      };
    }>>('/payments/cart/create-intent');
    const result = extractData(response);
    return {
      ...result,
      payment: normalizePayment(result.payment),
      order: {
        ...result.order,
        amount: toFiniteNumber(result.order.amount),
      },
    };
  },

  createPaymentIntent: async (packageId: string): Promise<{
    payment: Payment;
    package: {
      id: string;
      name: string;
      price: number;
    };
  }> => {
    const response = await api.post<ApiResponse<{
      payment: Payment;
      package: {
        id: string;
        name: string;
        price: number;
      };
    }>>('/payments/create-intent', {
      packageId,
    });
    const result = extractData(response);
    return {
      ...result,
      payment: normalizePayment(result.payment),
      package: {
        ...result.package,
        price: toFiniteNumber(result.package.price),
      },
    };
  },

  /**
   * Confirm payment
   */
  confirmPayment: async (paymentId: string): Promise<ConfirmPaymentResponse> => {
    const response = await api.post<ApiResponse<ConfirmPaymentResponse>>('/payments/confirm', {
      paymentId,
    });
    const result = extractData(response);
    return {
      ...result,
      payment: normalizePayment(result.payment),
    };
  },

  /**
   * Get teacher earnings grouped by course (Teacher only)
   */
  getTeacherEarningsByCourse: async (): Promise<{
    totalEarnings: number;
    totalCourses: number;
    totalStudents: number;
    courseEarnings: Array<{
      courseId: string;
      courseTitle: string;
      totalEarnings: number;
      totalStudents: number;
      payments: PaymentWithDetails[];
    }>;
    recentPayments: PaymentWithDetails[];
  }> => {
    const response = await api.get<ApiResponse<{
      totalEarnings: number;
      totalCourses: number;
      totalStudents: number;
      courseEarnings: Array<{
        courseId: string;
        courseTitle: string;
        totalEarnings: number;
        totalStudents: number;
        payments: PaymentWithDetails[];
      }>;
      recentPayments: PaymentWithDetails[];
    }>>('/payments/teacher/earnings-by-course');
    const result = extractData(response);
    return {
      ...result,
      totalEarnings: toFiniteNumber(result.totalEarnings),
      courseEarnings: result.courseEarnings.map((course) => ({
        ...course,
        totalEarnings: toFiniteNumber(course.totalEarnings),
        payments: course.payments.map(normalizePayment),
      })),
      recentPayments: result.recentPayments.map(normalizePayment),
    };
  },
};

export default paymentService;

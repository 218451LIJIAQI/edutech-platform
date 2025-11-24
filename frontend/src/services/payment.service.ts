import api from './api';
import { Payment, ApiResponse, PaymentWithDetails } from '@/types';

/**
 * Payment Service
 * Handles all payment-related API calls
 */

export const paymentService = {
  /**
   * Create payment intent
   */
  // Create cart payment intent (multi-course checkout)
  createCartPaymentIntent: async (): Promise<{
    payment: Payment;
    clientSecret: string | null;
    order: {
      id: string;
      orderNo: string;
      amount: number;
    };
  }> => {
    const response = await api.post<ApiResponse<{
      payment: Payment;
      clientSecret: string | null;
      order: {
        id: string;
        orderNo: string;
        amount: number;
      };
    }>>('/payments/cart/create-intent');
    return response.data.data!;
  },

  createPaymentIntent: async (packageId: string): Promise<{
    payment: Payment;
    clientSecret: string | null;
    package: {
      id: string;
      name: string;
      price: number;
    };
  }> => {
    const response = await api.post<ApiResponse<{
      payment: Payment;
      clientSecret: string | null;
      package: {
        id: string;
        name: string;
        price: number;
      };
    }>>('/payments/create-intent', {
      packageId,
    });
    return response.data.data!;
  },

  /**
   * Confirm payment
   */
  confirmPayment: async (
    paymentId: string,
    stripePaymentId?: string
  ): Promise<Payment> => {
    const response = await api.post<ApiResponse<Payment>>('/payments/confirm', {
      paymentId,
      stripePaymentId,
    });
    return response.data.data!;
  },

  /**
   * Get user's payment history
   */
  getMyPayments: async (): Promise<Payment[]> => {
    const response = await api.get<ApiResponse<Payment[]>>('/payments/my-payments');
    return response.data.data!;
  },

  /**
   * Get payment by ID
   */
  getPaymentById: async (id: string): Promise<Payment> => {
    const response = await api.get<ApiResponse<Payment>>(`/payments/${id}`);
    return response.data.data!;
  },

  /**
   * Get teacher earnings (Teacher only)
   */
  getTeacherEarnings: async (): Promise<{
    totalEarnings: number;
    payments: PaymentWithDetails[];
  }> => {
    const response = await api.get<ApiResponse<{
      totalEarnings: number;
      payments: PaymentWithDetails[];
    }>>('/payments/teacher/earnings');
    return response.data.data!;
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
    return response.data.data!;
  },
};

export default paymentService;


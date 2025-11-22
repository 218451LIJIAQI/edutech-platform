import api from './api';
import { Payment, ApiResponse, PaymentWithDetails, Enrollment } from '@/types';

/**
 * Payment Service
 * Handles all payment-related API calls
 */

export const paymentService = {
  /**
   * Create payment intent
   */
  createPaymentIntent: async (packageId: string): Promise<{
    payment: Payment;
    clientSecret: string | null;
    package: {
      id: string;
      name: string;
      price: number;
    };
  }> => {
    const response = await api.post<ApiResponse<any>>('/payments/create-intent', {
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
  ): Promise<{
    payment: Payment;
    enrollment: Enrollment;
  }> => {
    const response = await api.post<ApiResponse<{
      payment: Payment;
      enrollment: Enrollment;
    }>>('/payments/confirm', {
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
};

export default paymentService;


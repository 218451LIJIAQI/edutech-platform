import {
  OrderStatus,
  PaymentStatus,
  RefundMethod,
  RefundStatus,
} from './enums';
import type { Course, Enrollment, LessonPackage } from './course';
import type { User } from './user';

export interface Payment {
  readonly id: string;
  readonly userId: string;
  readonly packageId?: string;
  readonly orderId?: string;
  readonly amount: number;
  readonly platformCommission: number;
  readonly teacherEarning: number;
  readonly currency: string;
  readonly status: PaymentStatus;
  readonly paidAt?: string;
  readonly createdAt: string;
}

export interface CartItem {
  readonly id: string;
  readonly userId: string;
  readonly packageId: string;
  readonly quantity: number;
  readonly addedAt: string;
  readonly package?: LessonPackage & { course?: Course };
}

export interface CartSummary {
  readonly items: CartItem[];
  readonly totalAmount: number;
  readonly currency: string;
}

export interface OrderItem {
  readonly id: string;
  readonly orderId: string;
  readonly packageId: string;
  readonly price: number;
  readonly discount?: number;
  readonly finalPrice: number;
  readonly package?: LessonPackage & { course?: Course };
}

export interface Order {
  readonly id: string;
  readonly orderNo: string;
  readonly userId: string;
  readonly status: OrderStatus;
  readonly totalAmount: number;
  readonly currency: string;
  readonly createdAt: string;
  readonly paidAt?: string;
  readonly canceledAt?: string;
  readonly cancelReason?: string;
  readonly refundedAt?: string;
  readonly refundAmount?: number;
  readonly refundReason?: string;
  readonly items?: OrderItem[];
}

export interface Refund {
  readonly id: string;
  readonly orderId: string;
  readonly amount: number;
  readonly reason?: string;
  readonly reasonCategory?: string;
  readonly status: RefundStatus;
  readonly refundMethod: RefundMethod;
  readonly bankDetails?: string;
  readonly notes?: string;
  readonly createdAt: string;
  readonly processedAt?: string;
  readonly completedAt?: string;
  readonly order?: Order & { user?: User };
}

export interface PaymentWithDetails extends Payment {
  readonly user?: {
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
  };
  readonly package?: Partial<LessonPackage> & {
    readonly course?: {
      readonly id?: string;
      readonly title: string;
      readonly courseType?: string;
    };
  };
  readonly order?: Order & {
    readonly items?: Array<OrderItem & {
      readonly package?: Partial<LessonPackage> & {
        readonly course?: {
          readonly id?: string;
          readonly title: string;
          readonly courseType?: string;
        };
      };
    }>;
  };
}

export interface Review {
  readonly id: string;
  readonly enrollmentId: string;
  readonly reviewerId: string;
  readonly teacherId: string;
  readonly rating: number;
  readonly comment?: string;
  readonly isPublished: boolean;
  readonly createdAt: string;
  readonly reviewer?: User;
  readonly enrollment?: Enrollment;
}

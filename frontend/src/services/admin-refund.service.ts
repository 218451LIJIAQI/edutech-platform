import api from './api';
import { ApiResponse, Refund } from '@/types';

const adminRefundService = {
  /**
   * Get all refunds with optional filters
   */
  getAllRefunds: async (
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ refunds: Refund[]; total: number; limit: number; offset: number }> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const res = await api.get<
      ApiResponse<{
        refunds: Refund[];
        total: number;
        limit: number;
        offset: number;
      }>
    >(`/admin/refunds?${params.toString()}`);
    return res.data.data!;
  },

  /**
   * Get refund by ID
   */
  getRefundById: async (id: string): Promise<Refund> => {
    const res = await api.get<ApiResponse<Refund>>(`/admin/refunds/${id}`);
    return res.data.data!;
  },

  /**
   * Approve a refund
   */
  approveRefund: async (id: string, adminNotes?: string): Promise<Refund> => {
    const res = await api.post<ApiResponse<Refund>>(`/admin/refunds/${id}/approve`, {
      adminNotes,
    });
    return res.data.data!;
  },

  /**
   * Reject a refund
   */
  rejectRefund: async (id: string, rejectionReason: string): Promise<Refund> => {
    const res = await api.post<ApiResponse<Refund>>(`/admin/refunds/${id}/reject`, {
      rejectionReason,
    });
    return res.data.data!;
  },

  /**
   * Mark refund as processing
   */
  markAsProcessing: async (id: string, adminNotes?: string): Promise<Refund> => {
    const res = await api.post<ApiResponse<Refund>>(`/admin/refunds/${id}/processing`, {
      adminNotes,
    });
    return res.data.data!;
  },

  /**
   * Complete a refund
   */
  completeRefund: async (id: string, adminNotes?: string): Promise<Refund> => {
    const res = await api.post<ApiResponse<Refund>>(`/admin/refunds/${id}/complete`, {
      adminNotes,
    });
    return res.data.data!;
  },

  /**
   * Get refund statistics
   */
  getStats: async (): Promise<{
    pending: number;
    approved: number;
    processing: number;
    completed: number;
    rejected: number;
    totalRefundAmount: number;
    completedRefundAmount: number;
  }> => {
    const res = await api.get<
      ApiResponse<{
        pending: number;
        approved: number;
        processing: number;
        completed: number;
        rejected: number;
        totalRefundAmount: number;
        completedRefundAmount: number;
      }>
    >('/admin/refunds/stats');
    return res.data.data!;
  },
};

export default adminRefundService;


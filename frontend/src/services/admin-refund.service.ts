import api from './api';
import { ApiResponse, Refund } from '@/types';
import { normalizeRefund, toFiniteNumber } from '@/utils/asset-normalizers';
import { extractData } from './response-utils';

export interface AdminRefundStats {
  pending: number;
  approved: number;
  processing: number;
  completed: number;
  rejected: number;
  totalRefundAmount: number;
  completedRefundAmount: number;
}

const adminRefundService = {
  getAllRefunds: async (
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ refunds: Refund[]; total: number; limit: number; offset: number }> => {
    const res = await api.get<
      ApiResponse<{
        refunds: Refund[];
        total: number;
        limit: number;
        offset: number;
      }>
    >('/admin/refunds', {
      params: { ...(status ? { status } : {}), limit, offset },
    });
    const data = extractData(res);
    return {
      ...data,
      refunds: data.refunds.map(normalizeRefund),
    };
  },

  approveRefund: async (id: string, adminNotes?: string): Promise<Refund> => {
    const res = await api.post<ApiResponse<Refund>>(`/admin/refunds/${id}/approve`, {
      adminNotes,
    });
    return normalizeRefund(extractData(res));
  },

  rejectRefund: async (id: string, rejectionReason: string): Promise<Refund> => {
    const res = await api.post<ApiResponse<Refund>>(`/admin/refunds/${id}/reject`, {
      rejectionReason,
    });
    return normalizeRefund(extractData(res));
  },

  markAsProcessing: async (id: string, adminNotes?: string): Promise<Refund> => {
    const res = await api.post<ApiResponse<Refund>>(`/admin/refunds/${id}/processing`, {
      adminNotes,
    });
    return normalizeRefund(extractData(res));
  },

  completeRefund: async (id: string, adminNotes?: string): Promise<Refund> => {
    const res = await api.post<ApiResponse<Refund>>(`/admin/refunds/${id}/complete`, {
      adminNotes,
    });
    return normalizeRefund(extractData(res));
  },

  getStats: async (): Promise<AdminRefundStats> => {
    const res = await api.get<ApiResponse<AdminRefundStats>>('/admin/refunds/stats');
    const data = extractData(res);
    return {
      ...data,
      totalRefundAmount: toFiniteNumber(data.totalRefundAmount),
      completedRefundAmount: toFiniteNumber(data.completedRefundAmount),
    };
  },
};

export default adminRefundService;

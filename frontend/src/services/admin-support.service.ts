import api from './api';
import { ApiResponse, SupportTicket, SupportTicketMessage } from '@/types';
import {
  normalizeSupportMessageAssets,
  normalizeSupportTicketAssets,
} from '@/utils/asset-normalizers';
import { extractData } from './response-utils';

interface AdminSupportStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  total: number;
}

const adminSupportService = {
  getAllTickets: async (
    status?: string,
    priority?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ tickets: SupportTicket[]; total: number; limit: number; offset: number }> => {
    const res = await api.get<
      ApiResponse<{
        tickets: SupportTicket[];
        total: number;
        limit: number;
        offset: number;
      }>
    >('/admin/support', {
      params: {
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        limit,
        offset,
      },
    });
    const data = extractData(res);
    return {
      ...data,
      tickets: data.tickets.map(normalizeSupportTicketAssets),
    };
  },

  getTicketById: async (id: string): Promise<SupportTicket> => {
    const res = await api.get<ApiResponse<SupportTicket>>(`/admin/support/${id}`);
    return normalizeSupportTicketAssets(extractData(res));
  },

  assignTicket: async (id: string): Promise<SupportTicket> => {
    const res = await api.post<ApiResponse<SupportTicket>>(`/admin/support/${id}/assign`);
    return normalizeSupportTicketAssets(extractData(res));
  },

  addResponse: async (
    id: string,
    message: string,
    attachment?: string
  ): Promise<SupportTicketMessage> => {
    const res = await api.post<ApiResponse<SupportTicketMessage>>(`/admin/support/${id}/response`, {
      message,
      attachment,
    });
    return normalizeSupportMessageAssets(extractData(res));
  },

  resolveTicket: async (id: string, resolution: string): Promise<SupportTicket> => {
    const res = await api.post<ApiResponse<SupportTicket>>(`/admin/support/${id}/resolve`, {
      resolution,
    });
    return normalizeSupportTicketAssets(extractData(res));
  },

  closeTicket: async (id: string): Promise<SupportTicket> => {
    const res = await api.post<ApiResponse<SupportTicket>>(`/admin/support/${id}/close`);
    return normalizeSupportTicketAssets(extractData(res));
  },

  getStats: async (): Promise<AdminSupportStats> => {
    const res = await api.get<ApiResponse<AdminSupportStats>>('/admin/support/stats');
    return extractData(res);
  },
};

export default adminSupportService;

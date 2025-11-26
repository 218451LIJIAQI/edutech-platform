import api from './api';
import { ApiResponse, SupportTicket, SupportTicketMessage } from '@/types';

const adminSupportService = {
  /**
   * Get all support tickets with optional filters
   */
  getAllTickets: async (
    status?: string,
    priority?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ tickets: SupportTicket[]; total: number; limit: number; offset: number }> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const res = await api.get<
      ApiResponse<{
        tickets: SupportTicket[];
        total: number;
        limit: number;
        offset: number;
      }>
    >(`/admin/support?${params.toString()}`);
    return res.data.data!;
  },

  /**
   * Get support ticket by ID
   */
  getTicketById: async (id: string): Promise<SupportTicket> => {
    const res = await api.get<ApiResponse<SupportTicket>>(`/admin/support/${id}`);
    return res.data.data!;
  },

  /**
   * Assign ticket to admin
   */
  assignTicket: async (id: string): Promise<SupportTicket> => {
    const res = await api.post<ApiResponse<SupportTicket>>(`/admin/support/${id}/assign`);
    return res.data.data!;
  },

  /**
   * Add admin response to ticket
   */
  addResponse: async (id: string, message: string): Promise<SupportTicketMessage> => {
    const res = await api.post<ApiResponse<SupportTicketMessage>>(`/admin/support/${id}/response`, {
      message,
    });
    return res.data.data!;
  },

  /**
   * Resolve support ticket
   */
  resolveTicket: async (id: string, resolution: string): Promise<SupportTicket> => {
    const res = await api.post<ApiResponse<SupportTicket>>(`/admin/support/${id}/resolve`, {
      resolution,
    });
    return res.data.data!;
  },

  /**
   * Close support ticket
   */
  closeTicket: async (id: string): Promise<SupportTicket> => {
    const res = await api.post<ApiResponse<SupportTicket>>(`/admin/support/${id}/close`);
    return res.data.data!;
  },

  /**
   * Get support ticket statistics
   */
  getStats: async (): Promise<{
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    total: number;
  }> => {
    const res = await api.get<
      ApiResponse<{
        open: number;
        inProgress: number;
        resolved: number;
        closed: number;
        total: number;
      }>
    >('/admin/support/stats');
    return res.data.data!;
  },
};

export default adminSupportService;


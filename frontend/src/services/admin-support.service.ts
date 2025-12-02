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
    
    if (!res.data.data) {
      throw new Error('Failed to fetch support tickets: No data returned');
    }
    
    return res.data.data;
  },

  /**
   * Get support ticket by ID
   */
  getTicketById: async (id: string): Promise<SupportTicket> => {
    const res = await api.get<ApiResponse<SupportTicket>>(`/admin/support/${id}`);
    
    if (!res.data.data) {
      throw new Error('Failed to fetch support ticket: No data returned');
    }
    
    return res.data.data;
  },

  /**
   * Assign ticket to admin
   */
  assignTicket: async (id: string): Promise<SupportTicket> => {
    const res = await api.post<ApiResponse<SupportTicket>>(`/admin/support/${id}/assign`);
    
    if (!res.data.data) {
      throw new Error('Failed to assign ticket: No data returned');
    }
    
    return res.data.data;
  },

  /**
   * Add admin response to ticket
   */
  addResponse: async (id: string, message: string): Promise<SupportTicketMessage> => {
    const res = await api.post<ApiResponse<SupportTicketMessage>>(`/admin/support/${id}/response`, {
      message,
    });
    
    if (!res.data.data) {
      throw new Error('Failed to add response: No data returned');
    }
    
    return res.data.data;
  },

  /**
   * Resolve support ticket
   */
  resolveTicket: async (id: string, resolution: string): Promise<SupportTicket> => {
    const res = await api.post<ApiResponse<SupportTicket>>(`/admin/support/${id}/resolve`, {
      resolution,
    });
    
    if (!res.data.data) {
      throw new Error('Failed to resolve ticket: No data returned');
    }
    
    return res.data.data;
  },

  /**
   * Close support ticket
   */
  closeTicket: async (id: string): Promise<SupportTicket> => {
    const res = await api.post<ApiResponse<SupportTicket>>(`/admin/support/${id}/close`);
    
    if (!res.data.data) {
      throw new Error('Failed to close ticket: No data returned');
    }
    
    return res.data.data;
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
    
    if (!res.data.data) {
      throw new Error('Failed to fetch support ticket stats: No data returned');
    }
    
    return res.data.data;
  },
};

export default adminSupportService;

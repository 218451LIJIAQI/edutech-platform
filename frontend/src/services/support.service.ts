import api from './api';
import { ApiResponse, SupportTicket, SupportTicketMessage } from '@/types';
import {
  normalizeSupportMessageAssets,
  normalizeSupportTicketAssets,
} from '@/utils/asset-normalizers';

/**
 * Support Statistics Interface
 */
export interface SupportStats {
  totalConversations: number;
  activeConversations: number;
  resolvedConversations: number;
  averageResponseTime: number;
  satisfactionRating: number | null;
}

const supportService = {
  /**
   * Create a new support ticket
   */
  createTicket: async (
    subject: string,
    description: string,
    category: string,
    orderId?: string,
    priority?: string,
    attachment?: string
  ): Promise<SupportTicket> => {
    const res = await api.post<ApiResponse<SupportTicket>>('/support', {
      subject,
      description,
      category,
      orderId,
      priority,
      attachment,
    });
    if (!res.data.data) {
      throw new Error('Failed to create support ticket');
    }
    return normalizeSupportTicketAssets(res.data.data);
  },

  /**
   * Get all support tickets for the current user
   */
  getUserTickets: async (): Promise<SupportTicket[]> => {
    const res = await api.get<ApiResponse<SupportTicket[]>>('/support');
    if (!res.data.data) {
      throw new Error('Failed to get support tickets');
    }
    return res.data.data.map(normalizeSupportTicketAssets);
  },

  /**
   * Get a specific support ticket by ID
   */
  getTicketById: async (id: string): Promise<SupportTicket> => {
    const res = await api.get<ApiResponse<SupportTicket>>(`/support/${id}`);
    if (!res.data.data) {
      throw new Error('Failed to get support ticket');
    }
    return normalizeSupportTicketAssets(res.data.data);
  },

  /**
   * Add a message to a support ticket
   */
  addMessage: async (
    ticketId: string,
    message: string,
    attachment?: string
  ): Promise<SupportTicketMessage> => {
    const res = await api.post<ApiResponse<SupportTicketMessage>>(
      `/support/${ticketId}/messages`,
      {
        message,
        attachment,
      }
    );
    if (!res.data.data) {
      throw new Error('Failed to add message to ticket');
    }
    return normalizeSupportMessageAssets(res.data.data);
  },

  /**
   * Close a support ticket
   */
  closeTicket: async (ticketId: string, resolution?: string): Promise<SupportTicket> => {
    const res = await api.post<ApiResponse<SupportTicket>>(`/support/${ticketId}/close`, {
      resolution,
    });
    if (!res.data.data) {
      throw new Error('Failed to close support ticket');
    }
    return normalizeSupportTicketAssets(res.data.data);
  },

  /**
   * Get support statistics for the current user
   */
  getStats: async (): Promise<SupportStats> => {
    const res = await api.get<ApiResponse<SupportStats>>('/support/stats');
    return res.data.data || {
      totalConversations: 0,
      activeConversations: 0,
      resolvedConversations: 0,
      averageResponseTime: 0,
      satisfactionRating: null,
    };
  },
};

export default supportService;

import api from './api';
import { ApiResponse, SupportTicket, SupportTicketMessage } from '@/types';
import {
  normalizeSupportMessageAssets,
  normalizeSupportTicketAssets,
} from '@/utils/asset-normalizers';
import { extractData, extractDataOrDefault } from './response-utils';

export interface SupportStats {
  totalConversations: number;
  activeConversations: number;
  resolvedConversations: number;
  averageResponseTime: number;
  satisfactionRating: number | null;
}

const DEFAULT_SUPPORT_STATS: SupportStats = {
  totalConversations: 0,
  activeConversations: 0,
  resolvedConversations: 0,
  averageResponseTime: 0,
  satisfactionRating: null,
};

const supportService = {
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
    return normalizeSupportTicketAssets(extractData(res));
  },

  getUserTickets: async (): Promise<SupportTicket[]> => {
    const res = await api.get<ApiResponse<SupportTicket[]>>('/support');
    return extractData(res).map(normalizeSupportTicketAssets);
  },

  getTicketById: async (id: string): Promise<SupportTicket> => {
    const res = await api.get<ApiResponse<SupportTicket>>(`/support/${id}`);
    return normalizeSupportTicketAssets(extractData(res));
  },

  addMessage: async (
    ticketId: string,
    message: string,
    attachment?: string
  ): Promise<SupportTicketMessage> => {
    const res = await api.post<ApiResponse<SupportTicketMessage>>(
      `/support/${ticketId}/messages`,
      { message, attachment }
    );
    return normalizeSupportMessageAssets(extractData(res));
  },

  closeTicket: async (ticketId: string, resolution?: string): Promise<SupportTicket> => {
    const res = await api.post<ApiResponse<SupportTicket>>(`/support/${ticketId}/close`, {
      resolution,
    });
    return normalizeSupportTicketAssets(extractData(res));
  },

  getStats: async (): Promise<SupportStats> => {
    const res = await api.get<ApiResponse<SupportStats>>('/support/stats');
    return extractDataOrDefault(res, DEFAULT_SUPPORT_STATS);
  },
};

export default supportService;

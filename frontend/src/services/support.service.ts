import api from './api';
import { ApiResponse, SupportTicket, SupportTicketMessage } from '@/types';

const supportService = {
  /**
   * Create a new support ticket
   */
  createTicket: async (
    subject: string,
    description: string,
    category: string,
    orderId?: string,
    priority?: string
  ): Promise<SupportTicket> => {
    const res = await api.post<ApiResponse<SupportTicket>>('/support', {
      subject,
      description,
      category,
      orderId,
      priority,
    });
    return res.data.data!;
  },

  /**
   * Get all support tickets for the current user
   */
  getUserTickets: async (): Promise<SupportTicket[]> => {
    const res = await api.get<ApiResponse<SupportTicket[]>>('/support');
    return res.data.data!;
  },

  /**
   * Get a specific support ticket by ID
   */
  getTicketById: async (id: string): Promise<SupportTicket> => {
    const res = await api.get<ApiResponse<SupportTicket>>(`/support/${id}`);
    return res.data.data!;
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
    return res.data.data!;
  },

  /**
   * Close a support ticket
   */
  closeTicket: async (ticketId: string, resolution?: string): Promise<SupportTicket> => {
    const res = await api.post<ApiResponse<SupportTicket>>(`/support/${ticketId}/close`, {
      resolution,
    });
    return res.data.data!;
  },

  /**
   * Get support tickets for a specific order
   */
  getTicketsByOrderId: async (orderId: string): Promise<SupportTicket[]> => {
    const res = await api.get<ApiResponse<SupportTicket[]>>(`/support/order/${orderId}`);
    return res.data.data!;
  },
};

export default supportService;


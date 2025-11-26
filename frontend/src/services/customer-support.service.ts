import api from './api';
import { ApiResponse } from '@/types';

/**
 * Customer Support Chat Interface
 */
export interface SupportMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'CUSTOMER' | 'SUPPORT_AGENT';
  message: string;
  attachment?: string;
  attachmentType?: string;
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export interface SupportConversation {
  id: string;
  userId: string;
  status: 'ACTIVE' | 'RESOLVED' | 'CLOSED';
  category: string;
  subject: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedAgentId?: string;
  messages?: SupportMessage[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  assignedAgent?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export interface SupportStats {
  totalConversations: number;
  activeConversations: number;
  resolvedConversations: number;
  averageResponseTime: number; // in minutes
  satisfactionRating: number; // 0-5
}

const customerSupportService = {
  /**
   * Get all support conversations for the current user
   */
  getConversations: async (): Promise<SupportConversation[]> => {
    const res = await api.get<ApiResponse<SupportConversation[]>>('/customer-support/conversations');
    return res.data.data || [];
  },

  /**
   * Get a specific support conversation by ID
   */
  getConversation: async (conversationId: string): Promise<SupportConversation> => {
    const res = await api.get<ApiResponse<SupportConversation>>(
      `/customer-support/conversations/${conversationId}`
    );
    return res.data.data!;
  },

  /**
   * Create a new support conversation
   */
  createConversation: async (
    subject: string,
    category: string,
    message: string,
    priority?: string
  ): Promise<SupportConversation> => {
    const res = await api.post<ApiResponse<SupportConversation>>(
      '/customer-support/conversations',
      {
        subject,
        category,
        message,
        priority,
      }
    );
    return res.data.data!;
  },

  /**
   * Send a message in a support conversation
   */
  sendMessage: async (
    conversationId: string,
    message: string,
    attachment?: string
  ): Promise<SupportMessage> => {
    const res = await api.post<ApiResponse<SupportMessage>>(
      `/customer-support/conversations/${conversationId}/messages`,
      {
        message,
        attachment,
      }
    );
    return res.data.data!;
  },

  /**
   * Get messages for a conversation
   */
  getMessages: async (conversationId: string): Promise<SupportMessage[]> => {
    const res = await api.get<ApiResponse<SupportMessage[]>>(
      `/customer-support/conversations/${conversationId}/messages`
    );
    return res.data.data || [];
  },

  /**
   * Close a support conversation
   */
  closeConversation: async (conversationId: string): Promise<SupportConversation> => {
    const res = await api.post<ApiResponse<SupportConversation>>(
      `/customer-support/conversations/${conversationId}/close`,
      {}
    );
    return res.data.data!;
  },

  /**
   * Rate a support conversation
   */
  rateConversation: async (
    conversationId: string,
    rating: number,
    feedback?: string
  ): Promise<any> => {
    const res = await api.post<ApiResponse<any>>(
      `/customer-support/conversations/${conversationId}/rate`,
      {
        rating,
        feedback,
      }
    );
    return res.data.data;
  },

  /**
   * Get support statistics
   */
  getStats: async (): Promise<SupportStats> => {
    const res = await api.get<ApiResponse<SupportStats>>('/support/stats');
    return res.data.data || {
      totalConversations: 0,
      activeConversations: 0,
      resolvedConversations: 0,
      averageResponseTime: 0,
      satisfactionRating: 0,
    };
  },

  /**
   * Get FAQ categories
   */
  getFAQCategories: async (): Promise<any[]> => {
    const res = await api.get<ApiResponse<any[]>>('/customer-support/faq/categories');
    return res.data.data || [];
  },

  /**
   * Get FAQ items by category
   */
  getFAQByCategory: async (category: string): Promise<any[]> => {
    const res = await api.get<ApiResponse<any[]>>(
      `/customer-support/faq/categories/${category}`
    );
    return res.data.data || [];
  },

  /**
   * Search FAQ
   */
  searchFAQ: async (query: string): Promise<any[]> => {
    const res = await api.get<ApiResponse<any[]>>('/customer-support/faq/search', {
      params: { q: query },
    });
    return res.data.data || [];
  },
};

export default customerSupportService;


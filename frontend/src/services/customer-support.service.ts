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

export interface ConversationRating {
  rating: number;
  feedback?: string;
  createdAt: string;
}

export interface FAQCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  views?: number;
  helpful?: number;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Helper function to extract data from API response with error handling
 */
function extractData<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.data) {
    throw new Error(response.data.message || 'No data received from server');
  }
  return response.data.data;
}

const customerSupportService = {
  /**
   * Get all support conversations for the current user
   */
  getConversations: async (): Promise<SupportConversation[]> => {
    try {
      const res = await api.get<ApiResponse<SupportConversation[]>>('/customer-support/conversations');
      return res.data.data || [];
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      throw error;
    }
  },

  /**
   * Get a specific support conversation by ID
   */
  getConversation: async (conversationId: string): Promise<SupportConversation> => {
    try {
      const res = await api.get<ApiResponse<SupportConversation>>(
        `/customer-support/conversations/${conversationId}`
      );
      return extractData(res);
    } catch (error) {
      console.error(`Failed to fetch conversation ${conversationId}:`, error);
      throw error;
    }
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
    try {
      const res = await api.post<ApiResponse<SupportConversation>>(
        '/customer-support/conversations',
        {
          subject,
          category,
          message,
          priority,
        }
      );
      return extractData(res);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  },

  /**
   * Send a message in a support conversation
   */
  sendMessage: async (
    conversationId: string,
    message: string,
    attachment?: string
  ): Promise<SupportMessage> => {
    try {
      const res = await api.post<ApiResponse<SupportMessage>>(
        `/customer-support/conversations/${conversationId}/messages`,
        {
          message,
          attachment,
        }
      );
      return extractData(res);
    } catch (error) {
      console.error(`Failed to send message to conversation ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Get messages for a conversation
   */
  getMessages: async (conversationId: string): Promise<SupportMessage[]> => {
    try {
      const res = await api.get<ApiResponse<SupportMessage[]>>(
        `/customer-support/conversations/${conversationId}/messages`
      );
      return res.data.data || [];
    } catch (error) {
      console.error(`Failed to fetch messages for conversation ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Close a support conversation
   */
  closeConversation: async (conversationId: string): Promise<SupportConversation> => {
    try {
      const res = await api.post<ApiResponse<SupportConversation>>(
        `/customer-support/conversations/${conversationId}/close`,
        {}
      );
      return extractData(res);
    } catch (error) {
      console.error(`Failed to close conversation ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Rate a support conversation
   */
  rateConversation: async (
    conversationId: string,
    rating: number,
    feedback?: string
  ): Promise<ConversationRating> => {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }
      const res = await api.post<ApiResponse<ConversationRating>>(
        `/customer-support/conversations/${conversationId}/rate`,
        {
          rating,
          feedback,
        }
      );
      return extractData(res);
    } catch (error) {
      console.error(`Failed to rate conversation ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Get support statistics
   */
  getStats: async (): Promise<SupportStats> => {
    try {
      const res = await api.get<ApiResponse<SupportStats>>('/support/stats');
      return res.data.data || {
        totalConversations: 0,
        activeConversations: 0,
        resolvedConversations: 0,
        averageResponseTime: 0,
        satisfactionRating: 0,
      };
    } catch (error) {
      console.error('Failed to fetch support stats:', error);
      throw error;
    }
  },

  /**
   * Get FAQ categories
   */
  getFAQCategories: async (): Promise<FAQCategory[]> => {
    try {
      const res = await api.get<ApiResponse<FAQCategory[]>>('/customer-support/faq/categories');
      return res.data.data || [];
    } catch (error) {
      console.error('Failed to fetch FAQ categories:', error);
      throw error;
    }
  },

  /**
   * Get FAQ items by category
   */
  getFAQByCategory: async (category: string): Promise<FAQItem[]> => {
    try {
      if (!category || category.trim() === '') {
        throw new Error('Category is required');
      }
      const res = await api.get<ApiResponse<FAQItem[]>>(
        `/customer-support/faq/categories/${encodeURIComponent(category)}`
      );
      return res.data.data || [];
    } catch (error) {
      console.error(`Failed to fetch FAQ items for category ${category}:`, error);
      throw error;
    }
  },

  /**
   * Search FAQ
   */
  searchFAQ: async (query: string): Promise<FAQItem[]> => {
    try {
      if (!query || query.trim() === '') {
        throw new Error('Search query is required');
      }
      const res = await api.get<ApiResponse<FAQItem[]>>('/customer-support/faq/search', {
        params: { q: query.trim() },
      });
      return res.data.data || [];
    } catch (error) {
      console.error(`Failed to search FAQ with query "${query}":`, error);
      throw error;
    }
  },
};

export default customerSupportService;


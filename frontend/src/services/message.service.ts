import api from './api';
import { ApiResponse, User } from '@/types';

export interface Contact {
  id: string; // contact user id
  firstName: string;
  lastName: string;
  avatar?: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  lastMessageAt?: string;
  unreadCount?: number;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
  readAt?: string;
  sender?: User;
}

export interface Thread {
  id: string;
  participantIds: string[]; // includes current user id
  participants?: User[];
  updatedAt: string;
  lastMessage?: Message;
  unreadCount?: number;
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

const messageService = {
  /**
   * List contacts for current user
   */
  async getContacts(query?: string): Promise<Contact[]> {
    try {
      const res = await api.get<ApiResponse<Contact[]>>('/messages/contacts', {
        params: query ? { q: query.trim() } : undefined,
      });
      return res.data.data || [];
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      throw error;
    }
  },

  /**
   * List threads for current user
   */
  async getThreads(): Promise<Thread[]> {
    try {
      const res = await api.get<ApiResponse<Thread[]>>('/messages/threads');
      return res.data.data || [];
    } catch (error) {
      console.error('Failed to fetch threads:', error);
      throw error;
    }
  },

  /**
   * Get or create thread with a user
   */
  async getOrCreateThread(contactId: string): Promise<Thread> {
    try {
      if (!contactId || contactId.trim() === '') {
        throw new Error('Contact ID is required');
      }
      const res = await api.post<ApiResponse<Thread>>('/messages/threads', { contactId });
      return extractData(res);
    } catch (error) {
      console.error(`Failed to get or create thread with contact ${contactId}:`, error);
      throw error;
    }
  },

  /**
   * Load messages in a thread
   */
  async getMessages(threadId: string, cursor?: string): Promise<{ items: Message[]; nextCursor?: string }> {
    try {
      if (!threadId || threadId.trim() === '') {
        throw new Error('Thread ID is required');
      }
      const res = await api.get<ApiResponse<{ items: Message[]; nextCursor?: string }>>(
        `/messages/threads/${threadId}/messages`,
        {
          params: cursor ? { cursor } : undefined,
        }
      );
      return res.data.data || { items: [] };
    } catch (error) {
      console.error(`Failed to fetch messages for thread ${threadId}:`, error);
      throw error;
    }
  },

  /**
   * Send a message
   */
  async sendMessage(threadId: string, content: string): Promise<Message> {
    try {
      if (!threadId || threadId.trim() === '') {
        throw new Error('Thread ID is required');
      }
      if (!content || content.trim() === '') {
        throw new Error('Message content cannot be empty');
      }
      const res = await api.post<ApiResponse<Message>>(`/messages/threads/${threadId}/messages`, {
        content: content.trim(),
      });
      return extractData(res);
    } catch (error) {
      console.error(`Failed to send message to thread ${threadId}:`, error);
      throw error;
    }
  },

  /**
   * Get total unread message count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const res = await api.get<ApiResponse<{ unreadCount: number }>>('/messages/unread-count');
      return res.data.data?.unreadCount || 0;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      throw error;
    }
  },

  /**
   * Get unread count for a specific contact
   */
  async getContactUnreadCount(contactId: string): Promise<number> {
    try {
      if (!contactId || contactId.trim() === '') {
        throw new Error('Contact ID is required');
      }
      const res = await api.get<ApiResponse<{ unreadCount: number }>>(
        `/messages/contacts/${contactId}/unread-count`
      );
      return res.data.data?.unreadCount || 0;
    } catch (error) {
      console.error(`Failed to fetch unread count for contact ${contactId}:`, error);
      throw error;
    }
  },

  /**
   * Mark messages as read in a thread
   */
  async markMessagesAsRead(threadId: string): Promise<{ updatedCount: number }> {
    try {
      if (!threadId || threadId.trim() === '') {
        throw new Error('Thread ID is required');
      }
      const res = await api.put<ApiResponse<{ updatedCount: number }>>(
        `/messages/threads/${threadId}/mark-as-read`
      );
      return extractData(res);
    } catch (error) {
      console.error(`Failed to mark messages as read for thread ${threadId}:`, error);
      throw error;
    }
  },
};

export default messageService;

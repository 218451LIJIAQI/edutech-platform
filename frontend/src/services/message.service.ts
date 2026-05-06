import api from './api';
import clientLogger from '@/utils/logger';
import { ApiResponse, User } from '@/types';
import { extractData } from './response-utils';
import { normalizeAssetUrl, normalizeUserAssets } from '@/utils/asset-normalizers';

export interface Contact {
  id: string; // contact user id
  firstName: string;
  lastName: string;
  avatar?: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
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
}

export interface ContactMessagesResult {
  threadId: string | null;
  items: Message[];
  nextCursor?: string | null;
}

const messageService = {
  /**
   * List contacts for current user
   */
  async getContacts(): Promise<Contact[]> {
    try {
      const res = await api.get<ApiResponse<Contact[]>>('/messages/contacts');
      return (res.data.data || []).map((contact) => ({
        ...contact,
        avatar: normalizeAssetUrl(contact.avatar),
      }));
    } catch (error) {
      clientLogger.error('Failed to fetch contacts:', error);
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
      clientLogger.error(`Failed to get or create thread with contact ${contactId}:`, error);
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
      const data = res.data.data || { items: [] };
      return {
        ...data,
        items: data.items.map((message) => ({
          ...message,
          sender: normalizeUserAssets(message.sender as User | undefined),
        })),
      };
    } catch (error) {
      clientLogger.error(`Failed to fetch messages for thread ${threadId}:`, error);
      throw error;
    }
  },

  /**
   * Load messages with a contact without forcing creation of an empty thread.
   */
  async getMessagesWithContact(contactId: string, cursor?: string): Promise<ContactMessagesResult> {
    try {
      if (!contactId || contactId.trim() === '') {
        throw new Error('Contact ID is required');
      }
      const res = await api.get<ApiResponse<ContactMessagesResult>>(
        `/messages/contacts/${contactId}/messages`,
        {
          params: cursor ? { cursor } : undefined,
        }
      );
      const data = extractData(res);
      return {
        ...data,
        items: data.items.map((message) => ({
          ...message,
          sender: normalizeUserAssets(message.sender as User | undefined),
        })),
      };
    } catch (error) {
      clientLogger.error(`Failed to fetch messages for contact ${contactId}:`, error);
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
      const message = extractData(res);
      return {
        ...message,
        sender: normalizeUserAssets(message.sender as User | undefined),
      };
    } catch (error) {
      clientLogger.error(`Failed to send message to thread ${threadId}:`, error);
      throw error;
    }
  },

  /**
   * Send a message to a contact, creating the thread on first message if needed.
   */
  async sendMessageToContact(contactId: string, content: string): Promise<Message> {
    try {
      if (!contactId || contactId.trim() === '') {
        throw new Error('Contact ID is required');
      }
      if (!content || content.trim() === '') {
        throw new Error('Message content cannot be empty');
      }
      const res = await api.post<ApiResponse<Message>>(
        `/messages/contacts/${contactId}/messages`,
        {
          content: content.trim(),
        }
      );
      const message = extractData(res);
      return {
        ...message,
        sender: normalizeUserAssets(message.sender as User | undefined),
      };
    } catch (error) {
      clientLogger.error(`Failed to send message to contact ${contactId}:`, error);
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
      clientLogger.error('Failed to fetch unread count:', error);
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
      clientLogger.error(`Failed to fetch unread count for contact ${contactId}:`, error);
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
      clientLogger.error(`Failed to mark messages as read for thread ${threadId}:`, error);
      throw error;
    }
  },
};

export default messageService;

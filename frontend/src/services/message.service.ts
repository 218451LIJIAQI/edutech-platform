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

const messageService = {
  // List contacts for current user
  async getContacts(query?: string): Promise<Contact[]> {
    const res = await api.get<ApiResponse<Contact[]>>('/messages/contacts', {
      params: { q: query },
    });
    return res.data.data || [];
  },

  // List threads for current user
  async getThreads(): Promise<Thread[]> {
    const res = await api.get<ApiResponse<Thread[]>>('/messages/threads');
    return res.data.data || [];
  },

  // Get or create thread with a user
  async getOrCreateThread(contactId: string): Promise<Thread> {
    const res = await api.post<ApiResponse<Thread>>('/messages/threads', { contactId });
    return res.data.data!;
  },

  // Load messages in a thread
  async getMessages(threadId: string, cursor?: string): Promise<{ items: Message[]; nextCursor?: string; }>{
    const res = await api.get<ApiResponse<{ items: Message[]; nextCursor?: string }>>(`/messages/threads/${threadId}/messages`, {
      params: { cursor },
    });
    return res.data.data || { items: [] };
  },

  // Send a message
  async sendMessage(threadId: string, content: string): Promise<Message> {
    const res = await api.post<ApiResponse<Message>>(`/messages/threads/${threadId}/messages`, {
      content,
    });
    return res.data.data!;
  },

  // Get total unread message count
  async getUnreadCount(): Promise<number> {
    const res = await api.get<ApiResponse<{ unreadCount: number }>>('/messages/unread-count');
    return res.data.data?.unreadCount || 0;
  },

  // Get unread count for a specific contact
  async getContactUnreadCount(contactId: string): Promise<number> {
    const res = await api.get<ApiResponse<{ unreadCount: number }>>(`/messages/contacts/${contactId}/unread-count`);
    return res.data.data?.unreadCount || 0;
  },

  // Mark messages as read in a thread
  async markMessagesAsRead(threadId: string): Promise<{ updatedCount: number }> {
    const res = await api.put<ApiResponse<{ updatedCount: number }>>(`/messages/threads/${threadId}/mark-as-read`);
    return res.data.data!;
  },
};

export default messageService;


import api from './api';
import { ApiResponse, User } from '@/types';
import { extractData } from './response-utils';
import { normalizeAssetUrl, normalizeUserAssets } from '@/utils/asset-normalizers';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  unreadCount?: number;
}

export interface Thread {
  id: string;
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

export interface ContactMessagesResult {
  threadId: string | null;
  items: Message[];
  nextCursor?: string | null;
}

const requireNonEmpty = (value: string, message: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(message);
  }
  return trimmed;
};

const normalizeMessage = (message: Message): Message => ({
  ...message,
  sender: normalizeUserAssets(message.sender),
});

const messageService = {
  async getContacts(): Promise<Contact[]> {
    const res = await api.get<ApiResponse<Contact[]>>('/messages/contacts');
    return (res.data.data || []).map((contact) => ({
      ...contact,
      avatar: normalizeAssetUrl(contact.avatar),
    }));
  },

  async getMessagesWithContact(contactId: string, cursor?: string): Promise<ContactMessagesResult> {
    const validContactId = requireNonEmpty(contactId, 'Contact ID is required');
    const res = await api.get<ApiResponse<ContactMessagesResult>>(
      `/messages/contacts/${validContactId}/messages`,
      { params: cursor ? { cursor } : undefined }
    );
    const data = extractData(res);
    return {
      ...data,
      items: data.items.map(normalizeMessage),
    };
  },

  async sendMessageToContact(contactId: string, content: string): Promise<Message> {
    const validContactId = requireNonEmpty(contactId, 'Contact ID is required');
    const trimmedContent = requireNonEmpty(content, 'Message content cannot be empty');
    const res = await api.post<ApiResponse<Message>>(
      `/messages/contacts/${validContactId}/messages`,
      { content: trimmedContent }
    );
    return normalizeMessage(extractData(res));
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get<ApiResponse<{ unreadCount: number }>>('/messages/unread-count');
    return res.data.data?.unreadCount || 0;
  },

  async markMessagesAsRead(threadId: string): Promise<{ updatedCount: number }> {
    const validThreadId = requireNonEmpty(threadId, 'Thread ID is required');
    const res = await api.put<ApiResponse<{ updatedCount: number }>>(
      `/messages/threads/${validThreadId}/mark-as-read`
    );
    return extractData(res);
  },
};

export default messageService;

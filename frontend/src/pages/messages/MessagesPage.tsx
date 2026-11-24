import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clientLogger from '@/utils/logger';
import { useSearchParams } from 'react-router-dom';
import { Send, Search, Pin, User, ShieldCheck, MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import messageService, { Contact, Message } from '@/services/message.service';
import { resolveBackendAssetUrl } from '@/utils/runtime';
import { UserRole } from '@/types';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/hooks';
import { extractErrorMessage } from '@/utils/error-handler';

const CONVERSATION_TIMEOUT_MS = 8000;

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const MessagesPage = () => {
  usePageTitle('Messages');
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const requestedContactId = searchParams.get('contactId');

  const listRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  const conversationRequestRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const appliedUrlContactIdRef = useRef<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  const scheduleScrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current?.scrollHeight ?? 0,
        behavior,
      });
      scrollFrameRef.current = null;
    });
  }, []);

  const filteredContacts = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) {
      return contacts;
    }
    return contacts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q));
  }, [contacts, searchText]);

  const openConversation = useCallback(async (contact: Contact) => {
    const requestId = conversationRequestRef.current + 1;
    conversationRequestRef.current = requestId;
    setActiveContact(contact);
    setThreadId(null);
    setThreadError(null);
    setMessages([]);
    setLoadingThread(true);

    try {
      const data = await withTimeout(
        messageService.getMessagesWithContact(contact.id),
        CONVERSATION_TIMEOUT_MS,
        'Conversation history timed out'
      );
      if (!isMountedRef.current || requestId !== conversationRequestRef.current) {
        return;
      }
      setThreadId(data.threadId ?? null);
      setMessages(data.items);

      // Mark messages as read and clear the contact badge locally without an extra HTTP round-trip
      if (data.threadId) {
        await messageService.markMessagesAsRead(data.threadId);
        if (!isMountedRef.current || requestId !== conversationRequestRef.current) {
          return;
        }

        setContacts((prev) =>
          prev.map((c) => (c.id === contact.id ? { ...c, unreadCount: 0 } : c))
        );
        window.dispatchEvent(new CustomEvent('messages:unread-updated'));
      }

      scheduleScrollToBottom();
    } catch (error) {
      if (isMountedRef.current && requestId === conversationRequestRef.current) {
        clientLogger.error('Failed to open conversation:', error);
        const message = extractErrorMessage(error, 'Failed to open conversation');
        setThreadError(message);
        toast.error(message);
      }
    } finally {
      if (isMountedRef.current && requestId === conversationRequestRef.current) {
        setLoadingThread(false);
      }
    }
  }, [scheduleScrollToBottom]);

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    setContactsError(null);
    try {
      let list = await messageService.getContacts();

      if (user?.role === UserRole.STUDENT || user?.role === UserRole.TEACHER) {
        const adminContactIndex = list.findIndex((c) => c.role === 'ADMIN');
        if (adminContactIndex > 0) {
          const [adminContact] = list.splice(adminContactIndex, 1);
          list = [adminContact, ...list];
        }
      }

      if (!isMountedRef.current) {
        return;
      }

      setContacts(list);
    } catch (error) {
      if (isMountedRef.current) {
        clientLogger.error('Failed to load contacts:', error);
        const message = extractErrorMessage(error, 'Failed to load contacts');
        setContactsError(message);
        toast.error(message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingContacts(false);
      }
    }
  }, [user?.role]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const handleSelectContact = useCallback(
    (contact: Contact) => {
      appliedUrlContactIdRef.current = contact.id;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('contactId', contact.id);
          return next;
        },
        { replace: true }
      );
      void openConversation(contact);
    },
    [openConversation, setSearchParams]
  );

  useEffect(() => {
    if (!requestedContactId) {
      appliedUrlContactIdRef.current = null;
      return;
    }
    if (contacts.length === 0 || appliedUrlContactIdRef.current === requestedContactId) {
      return;
    }
    const matched = contacts.find((item) => item.id === requestedContactId);
    if (matched) {
      appliedUrlContactIdRef.current = requestedContactId;
      void openConversation(matched);
    }
  }, [contacts, openConversation, requestedContactId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeContact || !user || isSending) return;
    setIsSending(true);

    const optimisticId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      threadId: threadId || `contact-${activeContact.id}`,
      senderId: user.id,
      content: text,
      createdAt: new Date().toISOString(),
      isRead: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput('');
    scheduleScrollToBottom('smooth');

    void withTimeout(
      messageService.sendMessageToContact(activeContact.id, text),
      CONVERSATION_TIMEOUT_MS,
      'Message sending timed out'
    )
      .then((msg) => {
        if (!isMountedRef.current) {
          return;
        }
        if (!threadId && msg.threadId) {
          setThreadId(msg.threadId);
        }
        setMessages((prev) =>
          prev.map((item) => (item.id === optimisticId ? msg : item))
        );
      })
      .catch((error) => {
        if (isMountedRef.current) {
          clientLogger.error('Failed to send message:', error);
          toast.error(extractErrorMessage(error, 'Failed to send message'));
          setMessages((prev) => prev.filter((item) => item.id !== optimisticId));
          setInput(text);
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsSending(false);
        }
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-8 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      {/* Decorative Elements */}
      <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 left-[5%] w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Messages</span>
            </h1>
            <p className="text-gray-500 font-medium">Chat with teachers and students</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Contacts */}
          <div className="lg:col-span-4">
            <div className="card shadow-lg border border-gray-100 rounded-2xl">
              <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl border border-primary-200">
                <Search className="w-5 h-5 text-primary-600" />
                <input
                  aria-label="Search contacts"
                  className="input w-full bg-transparent border-0 focus:ring-0 placeholder-gray-500 font-medium"
                  placeholder="Search contacts..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              {loadingContacts ? (
                <div className="text-center text-gray-600 py-6">Loading contacts...</div>
              ) : contactsError ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-sm text-red-700">{contactsError}</p>
                  <button
                    type="button"
                    onClick={() => void loadContacts()}
                    className="btn-outline btn-sm"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center text-gray-600 py-6 text-sm">
                  {searchText.trim()
                    ? 'No contacts match your search.'
                    : 'No contacts yet.'}
                </div>
              ) : (
                <ul className="space-y-2 max-h-[65vh] overflow-auto pr-2">
                  {filteredContacts.map((c, idx) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        aria-current={activeContact?.id === c.id ? 'true' : undefined}
                        onClick={() => handleSelectContact(c)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border ${
                          activeContact?.id === c.id ? 'border-primary-200 bg-primary-50' : 'border-transparent'
                        }`}
                      >
                        <div className="relative">
                          {c.avatar ? (
                            <img
                              src={resolveBackendAssetUrl(c.avatar)}
                              alt={`${c.firstName} ${c.lastName}`}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          {c.unreadCount && c.unreadCount > 0 ? (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                              {c.unreadCount > 9 ? '9+' : c.unreadCount}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {c.firstName} {c.lastName}
                            {c.role === 'ADMIN' && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                <ShieldCheck className="w-3 h-3" /> Admin
                              </span>
                            )}
                          </div>
                          {idx === 0 && (user?.role === UserRole.TEACHER || user?.role === UserRole.STUDENT) && c.role === 'ADMIN' && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Pin className="w-3 h-3" /> Pinned
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Conversation */}
          <div className="lg:col-span-8">
            <div className="card h-[70vh] flex flex-col shadow-lg border border-gray-100 rounded-2xl">
              {!activeContact ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">Select a contact to start chatting</div>
              ) : (
                <>
                  <div className="border-b pb-3 mb-3 flex items-center gap-3">
                    {activeContact.avatar ? (
                      <img
                        src={resolveBackendAssetUrl(activeContact.avatar)}
                        alt={`${activeContact.firstName} ${activeContact.lastName}`}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                    <div className="font-semibold text-gray-900">{activeContact.firstName} {activeContact.lastName}</div>
                  </div>

                  <div ref={listRef} className="flex-1 overflow-auto space-y-2 pr-1">
                    {loadingThread ? (
                      <div className="text-center text-gray-600 py-6">Loading conversation...</div>
                    ) : threadError ? (
                      <div role="alert" className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                        <p className="text-sm font-medium text-danger-700">{threadError}</p>
                        <button
                          type="button"
                          onClick={() => void openConversation(activeContact)}
                          className="btn-outline btn-sm"
                        >
                          Retry
                        </button>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center text-gray-600 py-6">No messages yet</div>
                    ) : (
                      messages.map((m) => {
                        const isMe = m.senderId === user?.id;
                        return (
                          <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] px-3 py-2 rounded-lg shadow ${isMe ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                              <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                              <div className={`text-[10px] mt-1 ${isMe ? 'text-primary-100' : 'text-gray-500'}`}>{new Date(m.createdAt).toLocaleString()}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t flex items-center gap-2">
                    <input
                      aria-label="Message content"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type a message..."
                      maxLength={2000}
                      className="input flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => void handleSend()}
                      disabled={!activeContact || !input.trim() || isSending}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      {isSending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;

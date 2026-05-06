import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clientLogger from '@/utils/logger';
import { useLocation } from 'react-router-dom';
import { Send, Search, Pin, User, ShieldCheck, MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import messageService, { Contact, Message, Thread } from '@/services/message.service';
import { UserRole } from '@/types';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/hooks';
import { extractErrorMessage } from '@/utils/error-handler';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

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
  const query = useQuery();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filtered, setFiltered] = useState<Contact[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  const conversationRequestRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);

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

  const refreshContactUnreadCount = useCallback(async (contactId: string) => {
    try {
      const unreadCount = await messageService.getContactUnreadCount(contactId);
      if (!isMountedRef.current) {
        return;
      }
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId ? { ...c, unreadCount } : c
        )
      );
      setFiltered((prev) =>
        prev.map((c) =>
          c.id === contactId ? { ...c, unreadCount } : c
        )
      );
    } catch (error) {
      clientLogger.error(`Failed to refresh unread count for ${contactId}`, error);
    }
  }, []);

  const openConversation = useCallback(async (contact: Contact) => {
    const requestId = conversationRequestRef.current + 1;
    conversationRequestRef.current = requestId;
    setActiveContact(contact);
    setThread(null);
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
      const t = data.threadId ? { id: data.threadId } : null;
      setThread(t);
      setMessages(data.items);

      // Mark messages as read
      if (t?.id) {
        await messageService.markMessagesAsRead(t.id);
        if (!isMountedRef.current || requestId !== conversationRequestRef.current) {
          return;
        }

        // Refresh the contact's unread count from server
        await refreshContactUnreadCount(contact.id);

        // Notify global listeners (e.g., Navbar) to refresh unread badge immediately
        window.dispatchEvent(new CustomEvent('messages:unread-updated'));
      }

      // scroll to bottom
      scheduleScrollToBottom();
    } catch (error) {
      if (isMountedRef.current && requestId === conversationRequestRef.current) {
        clientLogger.error('Failed to open conversation:', error);
        toast.error(extractErrorMessage(error, 'Failed to open conversation'));
      }
    } finally {
      if (isMountedRef.current && requestId === conversationRequestRef.current) {
        setLoadingThread(false);
      }
    }
  }, [refreshContactUnreadCount, scheduleScrollToBottom]);

  // Load contacts
  useEffect(() => {
    let isActive = true;

    const init = async () => {
      setLoadingContacts(true);
      try {
        let list = await messageService.getContacts();

        // Ensure admin pinned at top for students and teachers
        if (user?.role === UserRole.STUDENT || user?.role === UserRole.TEACHER) {
          const adminContactIndex = list.findIndex((c) => c.role === 'ADMIN');
          if (adminContactIndex > -1) {
            const adminContact = list.splice(adminContactIndex, 1)[0];
            list = [adminContact, ...list];
          }
        }

        // Load unread counts for each contact
        const listWithUnread = await Promise.all(
          list.map(async (contact) => {
            try {
              const unreadCount = await messageService.getContactUnreadCount(contact.id);
              return { ...contact, unreadCount };
            } catch (e) {
              clientLogger.error(`Failed to load unread count for ${contact.id}`, e);
              return contact;
            }
          })
        );

        if (!isActive) {
          return;
        }

        setContacts(listWithUnread);
        setFiltered(listWithUnread);

        // If query has contactId, open it
        const contactId = query.get('contactId');
        if (contactId) {
          const contact = listWithUnread.find((item) => item.id === contactId);
          if (contact) {
            await openConversation(contact);
          }
        }
      } catch (error) {
        if (isActive) {
          clientLogger.error('Failed to load contacts:', error);
          toast.error(extractErrorMessage(error, 'Failed to load contacts'));
        }
      } finally {
        if (isActive) {
          setLoadingContacts(false);
        }
      }
    };

    void init();

    return () => {
      isActive = false;
    };
  }, [openConversation, query, user?.role]);

  // Filter contacts
  useEffect(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return setFiltered(contacts);
    setFiltered(
      contacts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q))
    );
  }, [searchText, contacts]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeContact || !user) return;

    const optimisticId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      threadId: thread?.id || `contact-${activeContact.id}`,
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
        if (!thread?.id && msg.threadId) {
          setThread({ id: msg.threadId });
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
                  className="input w-full bg-transparent border-0 focus:ring-0 placeholder-gray-500 font-medium"
                  placeholder="Search contacts..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              {loadingContacts ? (
                <div className="text-center text-gray-600 py-6">Loading contacts...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-gray-600 py-6">No contacts yet</div>
              ) : (
                <ul className="space-y-2 max-h-[65vh] overflow-auto pr-2">
                  {filtered.map((c, idx) => (
                    <li key={`${c.id}-${idx}`}>
                      <button
                        type="button"
                        onClick={() => openConversation(c)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border ${
                          activeContact?.id === c.id ? 'border-primary-200 bg-primary-50' : 'border-transparent'
                        }`}
                      >
                        <div className="relative">
                          {c.avatar ? (
                            <img src={c.avatar} alt={`${c.firstName} ${c.lastName}`} className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          {c.unreadCount && c.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                              {c.unreadCount > 9 ? '9+' : c.unreadCount}
                            </div>
                          )}
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
                      <img src={activeContact.avatar} alt={`${activeContact.firstName} ${activeContact.lastName}`} className="w-8 h-8 rounded-full" />
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
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type a message"
                      className="input flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                    />
                    <button type="button" className="btn-primary" onClick={handleSend} disabled={!activeContact || !input.trim()}>
                      <Send className="w-4 h-4 mr-1" />
                      Send
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

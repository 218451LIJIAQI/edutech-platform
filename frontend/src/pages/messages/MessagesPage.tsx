import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Search, Pin, User, ShieldCheck, MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import messageService, { Contact, Message, Thread } from '@/services/message.service';
import { UserRole } from '@/types';
import toast from 'react-hot-toast';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const MessagesPage = () => {
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

  // Load contacts
  useEffect(() => {
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
          } else {
            // Fallback pseudo admin contact (until backend provides it)
            list = [
              { id: 'admin', firstName: 'Platform', lastName: 'Admin', role: 'ADMIN', avatar: undefined, lastMessageAt: undefined, unreadCount: 0 },
              ...list,
            ];
          }
        }

        // Load unread counts for each contact
        const listWithUnread = await Promise.all(
          list.map(async (contact) => {
            try {
              const unreadCount = await messageService.getContactUnreadCount(contact.id);
              return { ...contact, unreadCount };
            } catch (e) {
              console.error(`Failed to load unread count for ${contact.id}`, e);
              return contact;
            }
          })
        );

        setContacts(listWithUnread);
        setFiltered(listWithUnread);

        // If query has contactId, open it
        const contactId = query.get('contactId');
        if (contactId) {
          const c = listWithUnread.find((x) => x.id === contactId);
          if (c) {
            openConversation(c);
          }
        }
      } catch (e) {
        console.error(e);
        toast.error('Failed to load contacts');
      } finally {
        setLoadingContacts(false);
      }
    };
    init();
  }, []);

  // Filter contacts
  useEffect(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return setFiltered(contacts);
    setFiltered(
      contacts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q))
    );
  }, [searchText, contacts]);

  const refreshContactUnreadCount = async (contactId: string) => {
    try {
      const unreadCount = await messageService.getContactUnreadCount(contactId);
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
    } catch (e) {
      console.error(`Failed to refresh unread count for ${contactId}`, e);
    }
  };

  const openConversation = async (contact: Contact) => {
    setActiveContact(contact);
    setLoadingThread(true);

    // Guard: if this is a pseudo contact (e.g., fallback admin without a real user id), inform the user
    const looksLikeUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(contact.id);
    if (!looksLikeUUID) {
      toast.error('This contact is not available yet. Please try another contact.');
      setLoadingThread(false);
      return;
    }

    try {
      const t = await messageService.getOrCreateThread(contact.id);
      setThread(t);
      const data = await messageService.getMessages(t.id);
      setMessages(data.items);
      
      // Mark messages as read
      if (t.id) {
        await messageService.markMessagesAsRead(t.id);
        
        // Refresh the contact's unread count from server
        await refreshContactUnreadCount(contact.id);
        
        // Notify global listeners (e.g., Navbar) to refresh unread badge immediately
        window.dispatchEvent(new CustomEvent('messages:unread-updated'));
      }
      
      // scroll to bottom
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 0);
    } catch (e) {
      console.error(e);
      toast.error('Failed to open conversation');
    } finally {
      setLoadingThread(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !thread) return;
    try {
      const msg = await messageService.sendMessage(thread.id, input.trim());
      setMessages((prev) => [...prev, msg]);
      setInput('');
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 0);
    } catch (e) {
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex items-center gap-3">
          <MessageSquare className="w-7 h-7 text-primary-600" />
          <h1 className="section-title m-0">Messages</h1>
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
                        onClick={() => openConversation(c)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border ${
                          activeContact?.id === c.id ? 'border-primary-200 bg-primary-50' : 'border-transparent'
                        }`}
                      >
                        <div className="relative">
                          {c.avatar ? (
                            <img src={c.avatar} className="w-10 h-10 rounded-full" />
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
                          {idx === 0 && user?.role === UserRole.TEACHER && c.role === 'ADMIN' && (
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
                      <img src={activeContact.avatar} className="w-8 h-8 rounded-full" />
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
                        if (e.key === 'Enter') handleSend();
                      }}
                    />
                    <button className="btn-primary" onClick={handleSend} disabled={!thread || !input.trim()}>
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


import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import clientLogger from '@/utils/logger';
import {
  ExternalLink,
  Loader2,
  MessageCircle,
  Paperclip,
  Plus,
  Send,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { useOverlayAccessibility } from '@/hooks';
import supportService from '@/services/support.service';
import uploadService from '@/services/upload.service';
import {
  SupportTicket,
  SupportTicketMessage,
  SupportTicketPriority,
  SupportTicketStatus,
} from '@/types';
import { useAuthStore } from '@/store/auth-store';
import { extractErrorMessage } from '@/utils/error-handler';
import { openProtectedAsset } from '@/utils/protected-assets';
import {
  buildSupportConversationEntries,
  getSupportAttachmentLabel,
  getSupportConversationPreview,
} from '@/utils/support-thread';

/**
 * CustomerSupportChat provides a floating support inbox experience.
 * Users can review tickets, send replies, create new support tickets,
 * upload attachments, and close tickets safely.
 */
type CustomerSupportChatProps = {
  open: boolean;
  onClose: () => void;
  showFloatingLauncher?: boolean;
};

type PendingAttachment = {
  readonly name: string;
  readonly url: string;
};

type SupportCategoryOption = {
  readonly value: string;
  readonly label: string;
};

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

const ACCEPTED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const SUPPORT_CATEGORIES: SupportCategoryOption[] = [
  { value: 'GENERAL', label: 'General Inquiry' },
  { value: 'TECHNICAL', label: 'Technical Issue' },
  { value: 'PAYMENT', label: 'Billing & Payment' },
  { value: 'COURSE_CONTENT', label: 'Course Related' },
  { value: 'ACCOUNT', label: 'Account & Profile' },
  { value: 'REFUND', label: 'Refund Request' },
  { value: 'OTHER', label: 'Other' },
];

const sortTicketsByUpdatedAt = (ticketList: SupportTicket[]) =>
  [...ticketList].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );

const upsertTicket = (ticketList: SupportTicket[], nextTicket: SupportTicket) =>
  sortTicketsByUpdatedAt([
    nextTicket,
    ...ticketList.filter((ticket) => ticket.id !== nextTicket.id),
  ]);

const getStatusBadgeClass = (status: SupportTicketStatus) => {
  const statusMap: Record<SupportTicketStatus, string> = {
    [SupportTicketStatus.OPEN]: 'bg-green-100 text-green-800',
    [SupportTicketStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
    [SupportTicketStatus.RESOLVED]: 'bg-purple-100 text-purple-800',
    [SupportTicketStatus.CLOSED]: 'bg-gray-100 text-gray-800',
  };

  return statusMap[status] || 'bg-gray-100 text-gray-800';
};

const getPriorityBadgeClass = (priority: SupportTicketPriority) => {
  const priorityMap: Record<SupportTicketPriority, string> = {
    [SupportTicketPriority.URGENT]: 'bg-red-100 text-red-800',
    [SupportTicketPriority.HIGH]: 'bg-orange-100 text-orange-800',
    [SupportTicketPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800',
    [SupportTicketPriority.LOW]: 'bg-green-100 text-green-800',
  };

  return priorityMap[priority] || 'bg-gray-100 text-gray-800';
};

const formatTicketTime = (value: string | Date) =>
  new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

const validateAttachment = (file: File) => {
  if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
    toast.error('Only JPG, PNG, WebP, and PDF files are supported.');
    return false;
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    toast.error('Attachment must be 10MB or smaller.');
    return false;
  }

  return true;
};

const CustomerSupportChat = ({
  open,
  onClose,
  showFloatingLauncher = true,
}: CustomerSupportChatProps) => {
  const { user } = useAuthStore();

  const newChatTitleId = useId();
  const newChatDescriptionId = useId();
  const categorySelectId = useId();
  const prioritySelectId = useId();
  const subjectInputId = useId();
  const messageTextareaId = useId();

  const [isOpen, setIsOpen] = useState(Boolean(open));
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const [newMessage, setNewMessage] = useState('');
  const [newMessageAttachment, setNewMessageAttachment] =
    useState<PendingAttachment | null>(null);

  const [showNewChat, setShowNewChat] = useState(false);
  const [showCloseTicketModal, setShowCloseTicketModal] = useState(false);

  const [newChatSubject, setNewChatSubject] = useState('');
  const [newChatCategory, setNewChatCategory] = useState('GENERAL');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [newChatAttachment, setNewChatAttachment] =
    useState<PendingAttachment | null>(null);
  const [newChatPriority, setNewChatPriority] = useState<SupportTicketPriority>(
    SupportTicketPriority.MEDIUM
  );

  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isUploadingMessageAttachment, setIsUploadingMessageAttachment] =
    useState(false);
  const [isUploadingNewChatAttachment, setIsUploadingNewChatAttachment] =
    useState(false);
  const [isClosingTicket, setIsClosingTicket] = useState(false);

  const isMountedRef = useRef(true);
  const ticketsRequestRef = useRef(0);
  const selectedTicketIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const newChatAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const newChatModalRef = useRef<HTMLDivElement | null>(null);
  const newChatSubjectInputRef = useRef<HTMLInputElement | null>(null);

  const isInboxBusy =
    isSendingMessage || isUploadingMessageAttachment || isClosingTicket;
  const isNewChatBusy = isCreating || isUploadingNewChatAttachment;

  const conversationEntries = useMemo(
    () => buildSupportConversationEntries(selectedTicket),
    [selectedTicket]
  );

  const applySelectedTicket = useCallback((ticket: SupportTicket | null) => {
    const normalizedTicket = ticket
      ? {
          ...ticket,
          messages: ticket.messages || [],
        }
      : null;

    selectedTicketIdRef.current = normalizedTicket?.id ?? null;
    setSelectedTicket(normalizedTicket);
  }, []);

  const resetNewChatForm = useCallback(() => {
    setNewChatSubject('');
    setNewChatMessage('');
    setNewChatAttachment(null);
    setNewChatCategory('GENERAL');
    setNewChatPriority(SupportTicketPriority.MEDIUM);
  }, []);

  const handleCloseNewChat = useCallback(() => {
    if (isNewChatBusy) {
      return;
    }

    setShowNewChat(false);
    resetNewChatForm();
  }, [isNewChatBusy, resetNewChatForm]);

  useOverlayAccessibility({
    isOpen: showNewChat,
    containerRef: newChatModalRef,
    initialFocusRef: newChatSubjectInputRef,
    onClose: isNewChatBusy ? undefined : handleCloseNewChat,
    trapFocus: true,
    lockBodyScroll: true,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversationEntries.length, scrollToBottom]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setIsOpen(Boolean(open));
  }, [open]);

  const loadTickets = useCallback(
    async (preferredTicketId?: string) => {
      const requestId = ++ticketsRequestRef.current;

      setIsLoadingTickets(true);

      try {
        const ticketList = sortTicketsByUpdatedAt(
          await supportService.getUserTickets()
        );

        if (!isMountedRef.current || requestId !== ticketsRequestRef.current) {
          return;
        }

        setTickets(ticketList);

        if (ticketList.length === 0) {
          applySelectedTicket(null);
          return;
        }

        const nextTicket =
          ticketList.find((ticket) => ticket.id === preferredTicketId) ||
          ticketList.find((ticket) => ticket.id === selectedTicketIdRef.current) ||
          ticketList.find(
            (ticket) =>
              ticket.status === SupportTicketStatus.OPEN ||
              ticket.status === SupportTicketStatus.IN_PROGRESS
          ) ||
          ticketList[0];

        applySelectedTicket(nextTicket);
      } catch (error) {
        if (!isMountedRef.current || requestId !== ticketsRequestRef.current) {
          return;
        }

        clientLogger.error('Failed to load support tickets:', error);
        toast.error(extractErrorMessage(error, 'Failed to load conversations'));
      } finally {
        if (isMountedRef.current && requestId === ticketsRequestRef.current) {
          setIsLoadingTickets(false);
        }
      }
    },
    [applySelectedTicket]
  );

  useEffect(() => {
    if (isOpen) {
      void loadTickets();
    }
  }, [isOpen, loadTickets]);

  useEffect(() => {
    setNewMessage('');
    setNewMessageAttachment(null);
  }, [selectedTicket?.id]);

  const uploadAttachment = useCallback(
    async (
      file: File,
      setUploading: (value: boolean) => void,
      setAttachment: (attachment: PendingAttachment | null) => void
    ) => {
      if (!validateAttachment(file)) {
        return;
      }

      setUploading(true);

      try {
        const result = await uploadService.uploadFile(file, 'support-attachments');

        if (!isMountedRef.current) {
          return;
        }

        setAttachment({
          name: result.filename || file.name,
          url: result.url,
        });

        toast.success('Attachment uploaded');
      } catch (error) {
        if (!isMountedRef.current) {
          return;
        }

        clientLogger.error('Failed to upload support attachment:', error);
        toast.error(extractErrorMessage(error, 'Failed to upload attachment'));
      } finally {
        if (isMountedRef.current) {
          setUploading(false);
        }
      }
    },
    []
  );

  const handleMessageAttachmentChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await uploadAttachment(
      file,
      setIsUploadingMessageAttachment,
      setNewMessageAttachment
    );

    event.target.value = '';
  };

  const handleNewChatAttachmentChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await uploadAttachment(
      file,
      setIsUploadingNewChatAttachment,
      setNewChatAttachment
    );

    event.target.value = '';
  };

  const handleOpenAttachment = async (assetUrl: string) => {
    try {
      await openProtectedAsset(assetUrl);
    } catch (error) {
      clientLogger.error('Failed to open support attachment:', error);
      toast.error(extractErrorMessage(error, 'Failed to open attachment'));
    }
  };

  const handleSendMessage = async () => {
    const body = newMessage.trim();
    const currentTicket = selectedTicket;
    const currentAttachment = newMessageAttachment;

    if (!body || !currentTicket || isInboxBusy) {
      return;
    }

    if (currentTicket.status === SupportTicketStatus.CLOSED) {
      toast.error('This ticket is closed and no longer accepts new messages.');
      return;
    }

    setNewMessage('');
    setNewMessageAttachment(null);
    setIsSendingMessage(true);

    try {
      const createdMessage: SupportTicketMessage = await supportService.addMessage(
        currentTicket.id,
        body,
        currentAttachment?.url
      );

      if (!isMountedRef.current) {
        return;
      }

      const updatedMessages = [
        ...(currentTicket.messages || []),
        createdMessage,
      ];

      const nextStatus =
        currentTicket.status === SupportTicketStatus.RESOLVED
          ? SupportTicketStatus.OPEN
          : currentTicket.status;

      const updatedTicket: SupportTicket = {
        ...currentTicket,
        status: nextStatus,
        resolution:
          nextStatus === SupportTicketStatus.OPEN
            ? undefined
            : currentTicket.resolution,
        resolvedAt:
          nextStatus === SupportTicketStatus.OPEN
            ? undefined
            : currentTicket.resolvedAt,
        updatedAt: createdMessage.createdAt,
        messages: updatedMessages,
      };

      setTickets((current) => upsertTicket(current, updatedTicket));

      if (selectedTicketIdRef.current === currentTicket.id) {
        applySelectedTicket(updatedTicket);
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      clientLogger.error('Failed to send support message:', error);
      toast.error(extractErrorMessage(error, 'Failed to send message'));
      setNewMessage(body);
      setNewMessageAttachment(currentAttachment);
    } finally {
      if (isMountedRef.current) {
        setIsSendingMessage(false);
      }
    }
  };

  const handleCreateNewChat = async () => {
    const subject = newChatSubject.trim();
    const message = newChatMessage.trim();

    if (!subject || !message) {
      toast.error('Please fill in subject and message');
      return;
    }

    if (isNewChatBusy) {
      return;
    }

    setIsCreating(true);

    try {
      const createdTicket = await supportService.createTicket(
        subject,
        message,
        newChatCategory,
        undefined,
        newChatPriority,
        newChatAttachment?.url
      );

      if (!isMountedRef.current) {
        return;
      }

      const normalizedTicket: SupportTicket = {
        ...createdTicket,
        messages: createdTicket.messages || [],
      };

      toast.success('Support ticket created');
      resetNewChatForm();
      setShowNewChat(false);
      applySelectedTicket(normalizedTicket);
      setTickets((current) => upsertTicket(current, normalizedTicket));
      setIsOpen(true);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      clientLogger.error('Failed to create support ticket:', error);
      toast.error(extractErrorMessage(error, 'Failed to create ticket'));
    } finally {
      if (isMountedRef.current) {
        setIsCreating(false);
      }
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket || isClosingTicket) {
      return;
    }

    setIsClosingTicket(true);

    try {
      const updatedTicket = await supportService.closeTicket(selectedTicket.id);

      if (!isMountedRef.current) {
        return;
      }

      const normalizedTicket: SupportTicket = {
        ...updatedTicket,
        messages: updatedTicket.messages || selectedTicket.messages || [],
      };

      toast.success('Ticket closed');
      setShowCloseTicketModal(false);
      applySelectedTicket(normalizedTicket);
      setTickets((current) => upsertTicket(current, normalizedTicket));
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      clientLogger.error('Failed to close support ticket:', error);
      toast.error(extractErrorMessage(error, 'Failed to close ticket'));
    } finally {
      if (isMountedRef.current) {
        setIsClosingTicket(false);
      }
    }
  };

  const handleCloseInbox = () => {
    if (isInboxBusy) {
      return;
    }

    setIsOpen(false);
    onClose();
  };

  return (
    <>
      {isOpen ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="customer-support-chat-title"
          className="fixed bottom-4 right-4 z-40 flex h-[600px] w-96 flex-col rounded-lg border border-gray-200 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-r from-primary-600 to-primary-700 p-4 text-white">
            <div className="flex items-center space-x-3">
              <div className="rounded-lg bg-white/20 p-2">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 id="customer-support-chat-title" className="text-lg font-bold">
                  Customer Support
                </h3>
                <p className="text-xs text-white/80">
                  Replies are handled through support tickets
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseInbox}
              disabled={isInboxBusy}
              className="rounded p-1 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close support inbox"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-1/3 overflow-y-auto border-r border-gray-200 bg-gray-50">
              <div className="border-b border-gray-200 p-3">
                <button
                  type="button"
                  onClick={() => setShowNewChat(true)}
                  disabled={isInboxBusy}
                  className="flex w-full items-center justify-center space-x-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Ticket</span>
                </button>
              </div>

              {isLoadingTickets && tickets.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  <MessageCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p>No tickets yet</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => applySelectedTicket(ticket)}
                      disabled={isInboxBusy}
                      className={`w-full rounded-lg p-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        selectedTicket?.id === ticket.id
                          ? 'border-l-4 border-primary-600 bg-primary-100'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <p className="truncate font-medium text-gray-900">
                        {ticket.subject}
                      </p>
                      <p className="truncate text-xs text-gray-600">
                        {getSupportConversationPreview(ticket, 56) || ticket.category}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${getStatusBadgeClass(
                            ticket.status
                          )}`}
                        >
                          {ticket.status.replace(/_/g, ' ')}
                        </span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${getPriorityBadgeClass(
                            ticket.priority
                          )}`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col">
              {selectedTicket ? (
                <>
                  <div className="border-b border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate font-bold text-gray-900">
                          {selectedTicket.subject}
                        </h4>
                        <p className="text-xs text-gray-600">
                          Ticket No: {selectedTicket.ticketNo}
                        </p>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${getPriorityBadgeClass(
                            selectedTicket.priority
                          )}`}
                        >
                          {selectedTicket.priority}
                        </span>

                        {selectedTicket.status !== SupportTicketStatus.CLOSED ? (
                          <button
                            type="button"
                            onClick={() => setShowCloseTicketModal(true)}
                            disabled={isInboxBusy}
                            className="rounded bg-gray-200 px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Close
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
                    {conversationEntries.length === 0 ? (
                      <div className="py-8 text-center text-gray-500">
                        <MessageCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                        <p className="text-sm">No conversation history yet</p>
                      </div>
                    ) : (
                      conversationEntries.map((entry) => {
                        const isCurrentUser = entry.senderId === user?.id;

                        return (
                          <div
                            key={entry.id}
                            className={`flex ${
                              isCurrentUser ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-xs rounded-lg px-4 py-2 ${
                                isCurrentUser
                                  ? 'rounded-br-none bg-primary-600 text-white'
                                  : 'rounded-bl-none border border-gray-200 bg-white text-gray-900'
                              }`}
                            >
                              <div className="mb-1 flex items-center gap-2">
                                {!isCurrentUser ? (
                                  <p className="text-xs font-semibold text-gray-600">
                                    {entry.sender?.firstName && entry.sender?.lastName
                                      ? `${entry.sender.firstName} ${entry.sender.lastName}`
                                      : 'Support'}
                                  </p>
                                ) : null}

                                {entry.kind === 'initial_request' ? (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      isCurrentUser
                                        ? 'bg-white/20 text-white'
                                        : 'bg-primary-50 text-primary-700'
                                    }`}
                                  >
                                    Initial request
                                  </span>
                                ) : null}
                              </div>

                              <p className="whitespace-pre-wrap break-words text-sm">
                                {entry.message}
                              </p>

                              {(() => {
                                const attachment = entry.attachment;

                                return attachment ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleOpenAttachment(attachment)}
                                    className={`mt-2 inline-flex max-w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                      isCurrentUser
                                        ? 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                                        : 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
                                    }`}
                                  >
                                    <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="truncate">
                                      {getSupportAttachmentLabel(attachment)}
                                    </span>
                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                  </button>
                                ) : null;
                              })()}

                              <p
                                className={`mt-1 text-xs ${
                                  isCurrentUser ? 'text-white/70' : 'text-gray-500'
                                }`}
                              >
                                {formatTicketTime(entry.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {selectedTicket.status !== SupportTicketStatus.CLOSED ? (
                    <div className="space-y-2 border-t border-gray-200 bg-white p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(event) => setNewMessage(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault();
                              void handleSendMessage();
                            }
                          }}
                          placeholder="Reply to this ticket..."
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          disabled={isInboxBusy}
                          maxLength={1000}
                        />

                        <input
                          ref={messageAttachmentInputRef}
                          type="file"
                          accept={ACCEPTED_ATTACHMENT_TYPES.join(',')}
                          className="hidden"
                          onChange={(event) => void handleMessageAttachmentChange(event)}
                        />

                        <button
                          type="button"
                          onClick={() => messageAttachmentInputRef.current?.click()}
                          disabled={isInboxBusy}
                          className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Attach file"
                        >
                          {isUploadingMessageAttachment ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Paperclip className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleSendMessage()}
                          disabled={isInboxBusy || !newMessage.trim()}
                          className="rounded-lg bg-primary-600 p-2 text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Send message"
                        >
                          {isSendingMessage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {newMessageAttachment ? (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                          <div className="inline-flex min-w-0 items-center gap-2 text-primary-700">
                            <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">
                              {newMessageAttachment.name}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setNewMessageAttachment(null)}
                            disabled={isInboxBusy}
                            className="font-medium text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}

                      <p className="text-xs text-gray-500">
                        Ticket replies are stored in your support history. JPG, PNG,
                        WebP, and PDF files up to 10MB are supported.
                      </p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageCircle className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                    <p className="text-sm">Select a ticket to review messages</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : showFloatingLauncher ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group fixed bottom-4 right-4 z-40 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 p-4 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
          aria-label="Open support inbox"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100">
            Open support inbox
          </span>
        </button>
      ) : null}

      {showNewChat ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            ref={newChatModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={newChatTitleId}
            aria-describedby={newChatDescriptionId}
            className="w-full max-w-md rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
              <h3 id={newChatTitleId} className="text-lg font-bold">
                Create Support Ticket
              </h3>

              <button
                type="button"
                onClick={handleCloseNewChat}
                disabled={isNewChatBusy}
                className="rounded p-1 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close new support ticket dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <p id={newChatDescriptionId} className="sr-only">
                Create a new support ticket by choosing a category, priority,
                subject, message, and optional attachment.
              </p>

              <div>
                <label
                  htmlFor={categorySelectId}
                  className="mb-2 block text-sm font-medium text-gray-900"
                >
                  Category
                </label>
                <select
                  id={categorySelectId}
                  value={newChatCategory}
                  onChange={(event) => setNewChatCategory(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={isNewChatBusy}
                >
                  {SUPPORT_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={prioritySelectId}
                  className="mb-2 block text-sm font-medium text-gray-900"
                >
                  Priority
                </label>
                <select
                  id={prioritySelectId}
                  value={newChatPriority}
                  onChange={(event) =>
                    setNewChatPriority(event.target.value as SupportTicketPriority)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={isNewChatBusy}
                >
                  <option value={SupportTicketPriority.LOW}>Low</option>
                  <option value={SupportTicketPriority.MEDIUM}>Medium</option>
                  <option value={SupportTicketPriority.HIGH}>High</option>
                  <option value={SupportTicketPriority.URGENT}>Urgent</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor={subjectInputId}
                  className="mb-2 block text-sm font-medium text-gray-900"
                >
                  Subject *
                </label>
                <input
                  id={subjectInputId}
                  ref={newChatSubjectInputRef}
                  type="text"
                  value={newChatSubject}
                  onChange={(event) => setNewChatSubject(event.target.value)}
                  placeholder="Brief subject of your issue"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={isNewChatBusy}
                  maxLength={120}
                />
              </div>

              <div>
                <label
                  htmlFor={messageTextareaId}
                  className="mb-2 block text-sm font-medium text-gray-900"
                >
                  Message *
                </label>
                <textarea
                  id={messageTextareaId}
                  value={newChatMessage}
                  onChange={(event) => setNewChatMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                      event.preventDefault();
                      void handleCreateNewChat();
                    }
                  }}
                  placeholder="Describe your issue in detail"
                  rows={4}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={isNewChatBusy}
                  maxLength={2000}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Attachment
                </label>

                <input
                  ref={newChatAttachmentInputRef}
                  type="file"
                  accept={ACCEPTED_ATTACHMENT_TYPES.join(',')}
                  className="hidden"
                  onChange={(event) => void handleNewChatAttachmentChange(event)}
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => newChatAttachmentInputRef.current?.click()}
                    disabled={isNewChatBusy}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploadingNewChatAttachment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                    {isUploadingNewChatAttachment ? 'Uploading...' : 'Attach file'}
                  </button>

                  {newChatAttachment ? (
                    <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-xs text-primary-700">
                      <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{newChatAttachment.name}</span>
                      <button
                        type="button"
                        onClick={() => setNewChatAttachment(null)}
                        disabled={isNewChatBusy}
                        className="font-semibold text-primary-500 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Optional. JPG, PNG, WebP, and PDF files up to 10MB are supported.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseNewChat}
                  disabled={isNewChatBusy}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void handleCreateNewChat()}
                  disabled={
                    isNewChatBusy ||
                    !newChatSubject.trim() ||
                    !newChatMessage.trim()
                  }
                  className="flex-1 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmationModal
        isOpen={showCloseTicketModal}
        title="Close support ticket"
        description={
          selectedTicket
            ? `Close ticket ${selectedTicket.ticketNo}. You can still review the conversation later, but it will no longer accept new messages.`
            : 'Close this support ticket. It will no longer accept new messages.'
        }
        confirmLabel="Close Ticket"
        tone="warning"
        isLoading={isClosingTicket}
        onClose={() => {
          if (!isClosingTicket) {
            setShowCloseTicketModal(false);
          }
        }}
        onConfirm={handleCloseTicket}
      />
    </>
  );
};

export default CustomerSupportChat;

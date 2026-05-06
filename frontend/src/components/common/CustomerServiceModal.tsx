import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Headphones,
  Loader2,
  Paperclip,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { useOverlayAccessibility } from '@/hooks';
import supportService from '@/services/support.service';
import uploadService from '@/services/upload.service';
import {
  SupportTicket,
  SupportTicketPriority,
  SupportTicketStatus,
} from '@/types';
import { extractErrorMessage } from '@/utils/error-handler';
import { openProtectedAsset } from '@/utils/protected-assets';
import {
  buildSupportConversationEntries,
  getSupportAttachmentLabel,
} from '@/utils/support-thread';

interface CustomerServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
}

type ActiveTab = 'create' | 'tickets';

type PendingAttachment = {
  readonly name: string;
  readonly url: string;
};

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

const ACCEPTED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const getTicketStatusClass = (status: SupportTicketStatus) => {
  switch (status) {
    case SupportTicketStatus.OPEN:
      return 'bg-blue-100 text-blue-700';
    case SupportTicketStatus.IN_PROGRESS:
      return 'bg-yellow-100 text-yellow-700';
    case SupportTicketStatus.RESOLVED:
      return 'bg-green-100 text-green-700';
    case SupportTicketStatus.CLOSED:
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const formatDateTime = (value: string | Date) => {
  return new Date(value).toLocaleString();
};

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

/**
 * CustomerServiceModal allows users to create support tickets,
 * review existing tickets, reply to conversations, upload attachments,
 * and close tickets safely.
 */
const CustomerServiceModal = ({
  isOpen,
  onClose,
  orderId,
}: CustomerServiceModalProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const subjectInputId = useId();
  const categorySelectId = useId();
  const prioritySelectId = useId();
  const descriptionInputId = useId();

  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const subjectInputRef = useRef<HTMLInputElement | null>(null);
  const createAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const messageAttachmentInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [isUploadingCreateAttachment, setIsUploadingCreateAttachment] = useState(false);
  const [isUploadingMessageAttachment, setIsUploadingMessageAttachment] = useState(false);
  const [showCloseTicketModal, setShowCloseTicketModal] = useState(false);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [priority, setPriority] = useState<SupportTicketPriority>(
    SupportTicketPriority.MEDIUM
  );
  const [newMessage, setNewMessage] = useState('');
  const [newTicketAttachment, setNewTicketAttachment] =
    useState<PendingAttachment | null>(null);
  const [messageAttachment, setMessageAttachment] =
    useState<PendingAttachment | null>(null);

  const isBusy =
    working || isUploadingCreateAttachment || isUploadingMessageAttachment;

  const conversationEntries = useMemo(
    () => buildSupportConversationEntries(selectedTicket),
    [selectedTicket]
  );

  const resetCreateForm = useCallback(() => {
    setSubject('');
    setDescription('');
    setCategory('OTHER');
    setPriority(SupportTicketPriority.MEDIUM);
    setNewTicketAttachment(null);
  }, []);

  const handleClose = useCallback(() => {
    if (!isBusy && !showCloseTicketModal) {
      onClose();
    }
  }, [isBusy, showCloseTicketModal, onClose]);

  useOverlayAccessibility({
    isOpen,
    containerRef: modalRef,
    initialFocusRef: activeTab === 'create' ? subjectInputRef : closeButtonRef,
    onClose: isBusy || showCloseTicketModal ? undefined : handleClose,
    trapFocus: !showCloseTicketModal,
    lockBodyScroll: true,
  });

  const loadTickets = useCallback(async () => {
    setLoading(true);

    try {
      const data = await supportService.getUserTickets();
      setTickets(data);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to load tickets'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTicketDetails = useCallback(async (ticketId: string) => {
    setLoading(true);

    try {
      const data = await supportService.getTicketById(ticketId);
      setSelectedTicket(data);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to load ticket'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('tickets');
      setSelectedTicket(null);
      setMessageAttachment(null);
      void loadTickets();
    }
  }, [isOpen, loadTickets]);

  useEffect(() => {
    setMessageAttachment(null);
    setNewMessage('');
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

        setAttachment({
          name: result.filename || file.name,
          url: result.url,
        });

        toast.success('Attachment uploaded');
      } catch (error) {
        toast.error(extractErrorMessage(error, 'Failed to upload attachment'));
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const handleCreateAttachmentChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await uploadAttachment(
      file,
      setIsUploadingCreateAttachment,
      setNewTicketAttachment
    );

    event.target.value = '';
  };

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
      setMessageAttachment
    );

    event.target.value = '';
  };

  const handleCreateTicket = async () => {
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();

    if (!trimmedSubject || !trimmedDescription) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isBusy) {
      return;
    }

    setWorking(true);

    try {
      await supportService.createTicket(
        trimmedSubject,
        trimmedDescription,
        category,
        orderId,
        priority,
        newTicketAttachment?.url
      );

      toast.success('Support ticket created successfully');
      resetCreateForm();
      setActiveTab('tickets');
      await loadTickets();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to create ticket'));
    } finally {
      setWorking(false);
    }
  };

  const handleSendMessage = async () => {
    const trimmedMessage = newMessage.trim();

    if (!selectedTicket) {
      toast.error('No ticket selected');
      return;
    }

    if (!trimmedMessage) {
      toast.error('Please enter a message');
      return;
    }

    if (isBusy) {
      return;
    }

    setWorking(true);

    try {
      await supportService.addMessage(
        selectedTicket.id,
        trimmedMessage,
        messageAttachment?.url
      );

      toast.success('Message sent');
      setNewMessage('');
      setMessageAttachment(null);
      await loadTicketDetails(selectedTicket.id);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to send message'));
    } finally {
      setWorking(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket || isBusy) {
      return;
    }

    setWorking(true);

    try {
      await supportService.closeTicket(selectedTicket.id);
      toast.success('Ticket closed');
      setSelectedTicket(null);
      setShowCloseTicketModal(false);
      await loadTickets();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to close ticket'));
    } finally {
      setWorking(false);
    }
  };

  const handleOpenAttachment = async (assetUrl: string) => {
    try {
      await openProtectedAsset(assetUrl);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to open attachment'));
    }
  };

  const handleChangeTab = (tab: ActiveTab) => {
    if (isBusy) {
      return;
    }

    setActiveTab(tab);

    if (tab === 'create') {
      setSelectedTicket(null);
      setMessageAttachment(null);
      setNewMessage('');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <Headphones className="h-7 w-7 text-primary-100" aria-hidden="true" />
            <div>
              <h2 id={titleId} className="text-2xl font-bold">
                Customer Service
              </h2>
              <p className="text-sm text-primary-100">Get help with your orders</p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            className="rounded-full p-2 text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close customer service modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p id={descriptionId} className="sr-only">
          Review your support tickets, open a new ticket, and reply to existing
          conversations.
        </p>

        <div className="flex border-b bg-gray-50" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tickets'}
            onClick={() => handleChangeTab('tickets')}
            disabled={isBusy}
            className={`flex-1 px-6 py-4 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              activeTab === 'tickets'
                ? 'border-b-2 border-primary-600 bg-white text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Tickets ({tickets.length})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'create'}
            onClick={() => handleChangeTab('create')}
            disabled={isBusy}
            className={`flex-1 px-6 py-4 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              activeTab === 'create'
                ? 'border-b-2 border-primary-600 bg-white text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Create Ticket
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'tickets' ? (
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                </div>
              ) : selectedTicket ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    disabled={isBusy}
                    className="flex items-center gap-2 font-semibold text-primary-600 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Tickets</span>
                  </button>

                  <div className="rounded-lg bg-gradient-to-r from-primary-50 to-primary-100 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-gray-900">
                        {selectedTicket.ticketNo}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${getTicketStatusClass(
                          selectedTicket.status
                        )}`}
                      >
                        {selectedTicket.status}
                      </span>
                    </div>

                    <p className="mb-1 font-semibold text-gray-700">
                      {selectedTicket.subject}
                    </p>
                    <p className="text-sm text-gray-600">
                      Last updated: {formatDateTime(selectedTicket.updatedAt)}
                    </p>
                  </div>

                  <div className="max-h-64 space-y-3 overflow-y-auto">
                    <h4 className="font-bold text-gray-900">Conversation</h4>

                    {conversationEntries.length > 0 ? (
                      conversationEntries.map((entry) => {
                        const isCustomerMessage =
                          entry.senderId === selectedTicket.userId;

                        return (
                          <div
                            key={entry.id}
                            className={`rounded-lg border-l-4 p-3 ${
                              isCustomerMessage
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-400 bg-gray-100'
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">
                                  {isCustomerMessage
                                    ? 'You'
                                    : entry.sender?.firstName &&
                                        entry.sender?.lastName
                                      ? `${entry.sender.firstName} ${entry.sender.lastName}`
                                      : 'Support'}
                                </span>

                                {entry.kind === 'initial_request' ? (
                                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                    Initial request
                                  </span>
                                ) : null}
                              </div>

                              <span className="text-xs text-gray-500">
                                {formatDateTime(entry.createdAt)}
                              </span>
                            </div>

                            <p className="whitespace-pre-wrap text-sm text-gray-700">
                              {entry.message}
                            </p>

                            {(() => {
                              const attachment = entry.attachment;

                              return attachment ? (
                                <button
                                  type="button"
                                  onClick={() => void handleOpenAttachment(attachment)}
                                  className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-primary-200 bg-white px-3 py-2 text-xs font-medium text-primary-700 hover:bg-primary-50"
                                >
                                  <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="truncate">
                                    {getSupportAttachmentLabel(attachment)}
                                  </span>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                </button>
                              ) : null;
                            })()}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500">
                        No conversation history yet
                      </p>
                    )}
                  </div>

                  {selectedTicket.status !== SupportTicketStatus.CLOSED ? (
                    <div className="space-y-3">
                      <textarea
                        value={newMessage}
                        onChange={(event) => setNewMessage(event.target.value)}
                        placeholder="Type your message..."
                        className="input min-h-[60px] w-full resize-none"
                        disabled={isBusy}
                        rows={3}
                      />

                      <input
                        ref={messageAttachmentInputRef}
                        type="file"
                        accept={ACCEPTED_ATTACHMENT_TYPES.join(',')}
                        className="hidden"
                        onChange={(event) => void handleMessageAttachmentChange(event)}
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => messageAttachmentInputRef.current?.click()}
                          disabled={isBusy}
                          className="btn-outline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isUploadingMessageAttachment ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Paperclip className="mr-2 h-4 w-4" />
                              Attach file
                            </>
                          )}
                        </button>

                        {messageAttachment ? (
                          <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-xs text-primary-700">
                            <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{messageAttachment.name}</span>
                            <button
                              type="button"
                              onClick={() => setMessageAttachment(null)}
                              disabled={isBusy}
                              className="font-semibold text-primary-500 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => void handleSendMessage()}
                          disabled={isBusy || !newMessage.trim()}
                          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {working ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {selectedTicket.status !== SupportTicketStatus.CLOSED ? (
                    <button
                      type="button"
                      onClick={() => setShowCloseTicketModal(true)}
                      disabled={isBusy}
                      className="btn-outline w-full disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Close Ticket
                    </button>
                  ) : null}
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="mb-4 text-gray-500">No support tickets yet</p>
                  <button
                    type="button"
                    onClick={() => handleChangeTab('create')}
                    className="btn-primary"
                  >
                    Create Your First Ticket
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => void loadTicketDetails(ticket.id)}
                      disabled={isBusy}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 text-left transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="font-bold text-gray-900">
                          {ticket.ticketNo}
                        </span>
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${getTicketStatusClass(
                            ticket.status
                          )}`}
                        >
                          {ticket.status}
                        </span>
                      </div>

                      <p className="mb-1 text-sm font-semibold text-gray-700">
                        {ticket.subject}
                      </p>
                      <p className="text-xs text-gray-500">
                        Last updated: {formatDateTime(ticket.updatedAt)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 p-6">
              <div>
                <label
                  htmlFor={subjectInputId}
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Subject *
                </label>
                <input
                  id={subjectInputId}
                  ref={subjectInputRef}
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Brief description of your issue"
                  className="input w-full"
                  disabled={isBusy}
                  maxLength={120}
                />
              </div>

              <div>
                <label
                  htmlFor={categorySelectId}
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Category *
                </label>
                <select
                  id={categorySelectId}
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="input w-full"
                  disabled={isBusy}
                >
                  <option value="REFUND">Refund Request</option>
                  <option value="QUALITY">Quality Issue</option>
                  <option value="TECHNICAL">Technical Issue</option>
                  <option value="COURSE_CONTENT">Course Content</option>
                  <option value="PAYMENT">Payment Issue</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor={prioritySelectId}
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Priority
                </label>
                <select
                  id={prioritySelectId}
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as SupportTicketPriority)
                  }
                  className="input w-full"
                  disabled={isBusy}
                >
                  <option value={SupportTicketPriority.LOW}>Low</option>
                  <option value={SupportTicketPriority.MEDIUM}>Medium</option>
                  <option value={SupportTicketPriority.HIGH}>High</option>
                  <option value={SupportTicketPriority.URGENT}>Urgent</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor={descriptionInputId}
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Description *
                </label>
                <textarea
                  id={descriptionInputId}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Please provide detailed information about your issue..."
                  className="input h-32 w-full resize-none"
                  disabled={isBusy}
                  maxLength={2000}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">
                  Attachment
                </label>

                <input
                  ref={createAttachmentInputRef}
                  type="file"
                  accept={ACCEPTED_ATTACHMENT_TYPES.join(',')}
                  className="hidden"
                  onChange={(event) => void handleCreateAttachmentChange(event)}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => createAttachmentInputRef.current?.click()}
                    disabled={isBusy}
                    className="btn-outline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploadingCreateAttachment ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Paperclip className="mr-2 h-4 w-4" />
                        Attach file
                      </>
                    )}
                  </button>

                  {newTicketAttachment ? (
                    <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-xs text-primary-700">
                      <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{newTicketAttachment.name}</span>
                      <button
                        type="button"
                        onClick={() => setNewTicketAttachment(null)}
                        disabled={isBusy}
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

              <button
                type="button"
                onClick={() => void handleCreateTicket()}
                disabled={isBusy || !subject.trim() || !description.trim()}
                className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {working ? 'Creating...' : 'Create Support Ticket'}
              </button>
            </div>
          )}
        </div>
      </div>

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
        isLoading={working}
        onClose={() => {
          if (!working) {
            setShowCloseTicketModal(false);
          }
        }}
        onConfirm={handleCloseTicket}
      />
    </div>
  );
};

export default CustomerServiceModal;

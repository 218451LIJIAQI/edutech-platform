import type { SupportTicket } from '@/types';

export interface SupportConversationEntry {
  readonly id: string;
  readonly kind: 'initial_request' | 'message';
  readonly senderId: string;
  readonly sender?: SupportTicket['user'];
  readonly message: string;
  readonly attachment?: string;
  readonly createdAt: string;
}

const trimText = (value?: string | null) => (value ?? '').trim();

export const getSupportAttachmentLabel = (attachment?: string | null): string => {
  const normalizedAttachment = trimText(attachment);
  if (!normalizedAttachment) {
    return 'attachment';
  }

  try {
    const parsed = new URL(normalizedAttachment, 'https://local.invalid');
    const filename = parsed.searchParams.get('filename')?.trim();
    if (filename) {
      return filename;
    }
  } catch {
    // Fall back to path parsing.
  }

  const withoutQuery = normalizedAttachment.split(/[?#]/, 1)[0] ?? normalizedAttachment;
  const lastSegment = withoutQuery.split('/').filter(Boolean).at(-1);

  return lastSegment || 'attachment';
};

export const buildSupportConversationEntries = (
  ticket: SupportTicket | null | undefined
): SupportConversationEntry[] => {
  if (!ticket) {
    return [];
  }

  const messages = ticket.messages ?? [];
  const normalizedDescription = trimText(ticket.description);

  let initialRequestResolvedFromMessage = false;

  const messageEntries: SupportConversationEntry[] = messages.map((message) => {
    const isMirroredInitialRequest =
      !initialRequestResolvedFromMessage &&
      normalizedDescription.length > 0 &&
      message.senderId === ticket.userId &&
      trimText(message.message) === normalizedDescription;

    if (isMirroredInitialRequest) {
      initialRequestResolvedFromMessage = true;
    }

    return {
      id: message.id,
      kind: isMirroredInitialRequest ? 'initial_request' : 'message',
      senderId: message.senderId,
      sender: message.sender,
      message: message.message,
      attachment: message.attachment,
      createdAt: message.createdAt,
    };
  });

  const initialRequestEntry: SupportConversationEntry[] =
    normalizedDescription.length > 0 && !initialRequestResolvedFromMessage
      ? [
          {
            id: `${ticket.id}-initial-request`,
            kind: 'initial_request',
            senderId: ticket.userId,
            sender: ticket.user,
            message: ticket.description,
            attachment: undefined,
            createdAt: ticket.createdAt,
          },
        ]
      : [];

  return [...initialRequestEntry, ...messageEntries].sort((left, right) => {
    const timestampDifference =
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();

    if (timestampDifference !== 0) {
      return timestampDifference;
    }

    if (left.kind === right.kind) {
      return 0;
    }

    return left.kind === 'initial_request' ? -1 : 1;
  });
};

export const getSupportConversationPreview = (
  ticket: SupportTicket,
  maxLength = 80
): string => {
  const entries = buildSupportConversationEntries(ticket);
  const latestEntry = entries.at(-1);
  const sourceText =
    trimText(latestEntry?.message) ||
    (latestEntry?.attachment ? 'Attachment' : '') ||
    trimText(ticket.subject);

  if (sourceText.length <= maxLength) {
    return sourceText;
  }

  return `${sourceText.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

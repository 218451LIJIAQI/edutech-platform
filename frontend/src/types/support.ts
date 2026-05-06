import {
  ReportStatus,
  ReportType,
  SupportTicketPriority,
  SupportTicketStatus,
} from './enums';
import type { User } from './user';

export interface SupportTicketMessage {
  readonly id: string;
  readonly ticketId: string;
  readonly senderId: string;
  readonly message: string;
  readonly attachment?: string;
  readonly createdAt: string;
  readonly sender?: User;
}

export interface SupportTicket {
  readonly id: string;
  readonly ticketNo: string;
  readonly userId: string;
  readonly orderId?: string;
  readonly subject: string;
  readonly description: string;
  readonly category: string;
  readonly priority: SupportTicketPriority;
  readonly status: SupportTicketStatus;
  readonly assignedTo?: string;
  readonly resolution?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly resolvedAt?: string;
  readonly messages?: SupportTicketMessage[];
  readonly user?: User;
}

export interface Report {
  readonly id: string;
  readonly reporterId: string;
  readonly reportedId: string;
  readonly type: ReportType;
  readonly description: string;
  readonly status: ReportStatus;
  readonly resolution?: string;
  readonly createdAt: string;
  readonly resolvedAt?: string;
  readonly reporter?: User;
  readonly reported?: User;
}

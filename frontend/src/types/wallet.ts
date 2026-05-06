import {
  PayoutMethodType,
  PayoutRequestStatus,
  WalletTransactionSource,
  WalletTransactionType,
} from './enums';

export interface WalletSummary {
  readonly id: string;
  readonly userId: string;
  readonly availableBalance: number;
  readonly pendingPayout: number;
  readonly currency: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WalletTransaction {
  readonly id: string;
  readonly walletId: string;
  readonly amount: number;
  readonly type: WalletTransactionType;
  readonly source: WalletTransactionSource;
  readonly referenceId?: string;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: string;
}

export interface PayoutMethod {
  readonly id: string;
  readonly walletId: string;
  readonly type: PayoutMethodType;
  readonly label: string;
  readonly details: Record<string, string | number | boolean>;
  readonly isDefault: boolean;
  readonly isVerified: boolean;
  readonly createdAt: string;
}

export interface PayoutRequest {
  readonly id: string;
  readonly walletId: string;
  readonly methodId?: string;
  readonly amount: number;
  readonly status: PayoutRequestStatus;
  readonly note?: string;
  readonly adminNote?: string;
  readonly externalReference?: string;
  readonly requestedAt: string;
  readonly processedAt?: string;
}

import api from './api';
import { ApiResponse, PayoutMethod, PayoutMethodType, PayoutRequest, WalletSummary, WalletTransaction, WalletTransactionSource, WalletTransactionType } from '@/types';
import { extractErrorMessage } from '@/utils/error-handler';
import { toFiniteNumber } from '@/utils/asset-normalizers';

/**
 * Wallet Service
 * Manages wallet operations, transactions, and payouts
 */

/**
 * Transaction list response interface
 */
export interface WalletTransactionListResponse {
  /** Array of wallet transactions */
  items: WalletTransaction[];
  /** Total number of transactions */
  total: number;
  /** Number of items per page */
  limit: number;
  /** Offset for pagination */
  offset: number;
}

/**
 * Payout list response interface
 */
export interface WalletPayoutListResponse {
  /** Array of payout requests */
  items: PayoutRequest[];
  /** Total number of payout requests */
  total: number;
  /** Number of items per page */
  limit: number;
  /** Offset for pagination */
  offset: number;
}

/**
 * Input interface for creating a new payout method
 */
export type PayoutMethodDetails = PayoutMethod['details'];

interface PayoutMethodInput {
  /** Type of payout method (e.g., bank, alipay, wechat) */
  type: PayoutMethodType;
  /** Display label for the payout method */
  label: string;
  /** Method-specific details (account number, etc.) */
  details: PayoutMethodDetails;
  /** Whether this is the default payout method */
  isDefault?: boolean;
}

interface UpdatePayoutMethodInput {
  /** Display label for the payout method */
  label?: string;
  /** Method-specific details (account number, etc.) */
  details?: PayoutMethodDetails;
  /** Whether this is the default payout method */
  isDefault?: boolean;
}

/**
 * Input interface for requesting a payout
 */
interface PayoutRequestInput {
  /** Amount to withdraw (must be positive) */
  amount: number;
  /** ID of the payout method to use (optional, uses default if not specified) */
  methodId?: string;
  /** Optional note for the payout request */
  note?: string;
}

function wrapWalletError(action: string, error: unknown): never {
  throw new Error(`${action}: ${extractErrorMessage(error, 'Unknown error')}`);
}

const normalizeWalletSummary = (summary: WalletSummary): WalletSummary => ({
  ...summary,
  availableBalance: toFiniteNumber(summary.availableBalance),
  pendingPayout: toFiniteNumber(summary.pendingPayout),
});

const normalizeWalletTransaction = (
  transaction: WalletTransaction
): WalletTransaction => ({
  ...transaction,
  amount: toFiniteNumber(transaction.amount),
});

const normalizePayoutRequest = (request: PayoutRequest): PayoutRequest => ({
  ...request,
  amount: toFiniteNumber(request.amount),
});

const walletService = {
  /**
   * Get wallet summary for current user
   */
  async getMySummary(): Promise<WalletSummary> {
    try {
      const { data } = await api.get<ApiResponse<WalletSummary>>('/wallet/me');
      if (!data.data) {
        throw new Error('No wallet summary data received');
      }
      return normalizeWalletSummary(data.data);
    } catch (error) {
      wrapWalletError('Failed to fetch wallet summary', error);
    }
  },

  /**
   * Get transaction history for current user
   */
  async getMyTransactions(params?: { limit?: number; offset?: number; type?: WalletTransactionType; source?: WalletTransactionSource }): Promise<WalletTransactionListResponse> {
    try {
      const { data } = await api.get<ApiResponse<WalletTransactionListResponse>>('/wallet/me/transactions', { params });
      if (!data.data) {
        throw new Error('No transaction data received');
      }
      return {
        ...data.data,
        items: data.data.items.map(normalizeWalletTransaction),
      };
    } catch (error) {
      wrapWalletError('Failed to fetch transactions', error);
    }
  },

  /**
   * List all payout methods for current user
   */
  async listPayoutMethods(): Promise<PayoutMethod[]> {
    try {
      const { data } = await api.get<ApiResponse<PayoutMethod[]>>('/wallet/me/payout-methods');
      if (!data.data) {
        throw new Error('No payout methods data received');
      }
      return data.data;
    } catch (error) {
      wrapWalletError('Failed to fetch payout methods', error);
    }
  },

  /**
   * Add a new payout method
   */
  async addPayoutMethod(input: PayoutMethodInput): Promise<PayoutMethod> {
    try {
      if (!input.type || !input.label || !input.details) {
        throw new Error('Missing required fields: type, label, details');
      }
      const { data } = await api.post<ApiResponse<PayoutMethod>>('/wallet/me/payout-methods', input);
      if (!data.data) {
        throw new Error('No payout method data received');
      }
      return data.data;
    } catch (error) {
      wrapWalletError('Failed to add payout method', error);
    }
  },

  /**
   * Update an existing payout method
   */
  async updatePayoutMethod(methodId: string, input: UpdatePayoutMethodInput): Promise<PayoutMethod> {
    try {
      if (!methodId || methodId.trim() === '') {
        throw new Error('Payout method ID is required');
      }
      const { data } = await api.put<ApiResponse<PayoutMethod>>(
        `/wallet/me/payout-methods/${methodId}`,
        input
      );
      if (!data.data) {
        throw new Error('No payout method data received');
      }
      return data.data;
    } catch (error) {
      wrapWalletError('Failed to update payout method', error);
    }
  },

  /**
   * Delete an existing payout method
   */
  async deletePayoutMethod(methodId: string): Promise<void> {
    try {
      if (!methodId || methodId.trim() === '') {
        throw new Error('Payout method ID is required');
      }
      await api.delete(`/wallet/me/payout-methods/${methodId}`);
    } catch (error) {
      wrapWalletError('Failed to delete payout method', error);
    }
  },

  /**
   * Request a payout
   */
  async requestPayout(input: PayoutRequestInput): Promise<PayoutRequest> {
    try {
      if (!input.amount || input.amount <= 0) {
        throw new Error('Payout amount must be greater than 0');
      }
      const { data } = await api.post<ApiResponse<PayoutRequest>>('/wallet/me/payouts', input);
      if (!data.data) {
        throw new Error('No payout request data received');
      }
      return normalizePayoutRequest(data.data);
    } catch (error) {
      wrapWalletError('Failed to request payout', error);
    }
  },

  /**
   * List all payout requests for current user
   */
  async listMyPayouts(params?: { limit?: number; offset?: number }): Promise<WalletPayoutListResponse> {
    try {
      const { data } = await api.get<ApiResponse<WalletPayoutListResponse>>('/wallet/me/payouts', { params });
      if (!data.data) {
        throw new Error('No payout data received');
      }
      return {
        ...data.data,
        items: data.data.items.map(normalizePayoutRequest),
      };
    } catch (error) {
      wrapWalletError('Failed to fetch payouts', error);
    }
  },
};

export default walletService;

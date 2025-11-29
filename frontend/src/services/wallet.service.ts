import api from './api';
import { ApiResponse, PayoutMethod, PayoutMethodType, PayoutRequest, WalletSummary, WalletTransaction, WalletTransactionSource, WalletTransactionType } from '@/types';

/**
 * Wallet Service
 * Manages wallet operations, transactions, and payouts
 */

/**
 * Transaction list response interface
 */
interface TransactionResponse {
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
interface PayoutListResponse {
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
interface PayoutMethodInput {
  /** Type of payout method (e.g., bank, alipay, wechat) */
  type: PayoutMethodType;
  /** Display label for the payout method */
  label: string;
  /** Method-specific details (account number, etc.) */
  details: Record<string, string | number | boolean>;
  /** Whether this is the default payout method */
  isDefault?: boolean;
}

/**
 * Input interface for updating an existing payout method
 */
interface PayoutMethodUpdateInput {
  /** Updated display label */
  label?: string;
  /** Updated method-specific details */
  details?: Record<string, string | number | boolean>;
  /** Whether this should be the default payout method */
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
      return data.data;
    } catch (error) {
      throw new Error(`Failed to fetch wallet summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Get transaction history for current user
   */
  async getMyTransactions(params?: { limit?: number; offset?: number; type?: WalletTransactionType; source?: WalletTransactionSource }): Promise<TransactionResponse> {
    try {
      const { data } = await api.get<ApiResponse<TransactionResponse>>('/wallet/me/transactions', { params });
      if (!data.data) {
        throw new Error('No transaction data received');
      }
      return data.data;
    } catch (error) {
      throw new Error(`Failed to fetch transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      throw new Error(`Failed to fetch payout methods: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      throw new Error(`Failed to add payout method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Update an existing payout method
   */
  async updatePayoutMethod(id: string, input: PayoutMethodUpdateInput): Promise<PayoutMethod> {
    try {
      if (!id) {
        throw new Error('Payout method ID is required');
      }
      const { data } = await api.put<ApiResponse<PayoutMethod>>(`/wallet/me/payout-methods/${id}`, input);
      if (!data.data) {
        throw new Error('No payout method data received');
      }
      return data.data;
    } catch (error) {
      throw new Error(`Failed to update payout method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Delete a payout method
   */
  async deletePayoutMethod(id: string): Promise<void> {
    try {
      if (!id) {
        throw new Error('Payout method ID is required');
      }
      await api.delete(`/wallet/me/payout-methods/${id}`);
    } catch (error) {
      throw new Error(`Failed to delete payout method: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      return data.data;
    } catch (error) {
      throw new Error(`Failed to request payout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * List all payout requests for current user
   */
  async listMyPayouts(params?: { limit?: number; offset?: number }): Promise<PayoutListResponse> {
    try {
      const { data } = await api.get<ApiResponse<PayoutListResponse>>('/wallet/me/payouts', { params });
      if (!data.data) {
        throw new Error('No payout data received');
      }
      return data.data;
    } catch (error) {
      throw new Error(`Failed to fetch payouts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

export default walletService;


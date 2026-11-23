import api from './api';
import {
  ApiResponse,
  PayoutMethod,
  PayoutMethodType,
  PayoutRequest,
  PayoutRequestStatus,
  WalletSummary,
  WalletTransaction,
  WalletTransactionSource,
  WalletTransactionType,
} from '@/types';
import { extractErrorMessage } from '@/utils/error-handler';
import { toFiniteNumber, toOptionalFiniteNumber } from '@/utils/asset-normalizers';

export interface WalletTransactionListResponse {
  items: WalletTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface WalletPayoutListResponse {
  items: PayoutRequest[];
  total: number;
  limit: number;
  offset: number;
}

export type PayoutMethodDetails = PayoutMethod['details'];
export type AdminPayoutReviewAction = 'approve' | 'processing' | 'paid' | 'reject';

interface PayoutMethodInput {
  type: PayoutMethodType;
  label: string;
  details: PayoutMethodDetails;
  isDefault?: boolean;
}

interface UpdatePayoutMethodInput {
  label?: string;
  details?: PayoutMethodDetails;
  isDefault?: boolean;
}

interface PayoutRequestInput {
  amount: number;
  methodId?: string;
  note?: string;
}

function wrapWalletError(action: string, error: unknown): never {
  throw new Error(`${action}: ${extractErrorMessage(error, 'Unknown error')}`);
}

const normalizeWalletSummary = (summary: WalletSummary): WalletSummary => ({
  ...summary,
  availableBalance: toFiniteNumber(summary.availableBalance),
  pendingPayout: toFiniteNumber(summary.pendingPayout),
  activeRefundHold: toOptionalFiniteNumber(summary.activeRefundHold),
  withdrawableBalance: toOptionalFiniteNumber(summary.withdrawableBalance),
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

  async getMyTransactions(params?: {
    limit?: number;
    offset?: number;
    type?: WalletTransactionType;
    source?: WalletTransactionSource;
  }): Promise<WalletTransactionListResponse> {
    try {
      const { data } = await api.get<ApiResponse<WalletTransactionListResponse>>(
        '/wallet/me/transactions',
        { params }
      );
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

  async addPayoutMethod(input: PayoutMethodInput): Promise<PayoutMethod> {
    try {
      if (!input.type || !input.label || !input.details) {
        throw new Error('Missing required fields: type, label, details');
      }
      const { data } = await api.post<ApiResponse<PayoutMethod>>(
        '/wallet/me/payout-methods',
        input
      );
      if (!data.data) {
        throw new Error('No payout method data received');
      }
      return data.data;
    } catch (error) {
      wrapWalletError('Failed to add payout method', error);
    }
  },

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

  async listMyPayouts(params?: {
    limit?: number;
    offset?: number;
    status?: PayoutRequestStatus;
  }): Promise<WalletPayoutListResponse> {
    try {
      const { data } = await api.get<ApiResponse<WalletPayoutListResponse>>('/wallet/me/payouts', {
        params,
      });
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

  async listAdminPayouts(params?: {
    status?: PayoutRequestStatus | string;
    limit?: number;
    offset?: number;
  }): Promise<WalletPayoutListResponse> {
    try {
      const { data } = await api.get<ApiResponse<WalletPayoutListResponse>>(
        '/admin/wallet/payouts',
        { params }
      );
      if (!data.data) {
        throw new Error('No admin payout data received');
      }
      return {
        ...data.data,
        items: data.data.items.map(normalizePayoutRequest),
      };
    } catch (error) {
      wrapWalletError('Failed to fetch payout requests', error);
    }
  },

  async reviewAdminPayout(
    payoutId: string,
    payload: {
      action: AdminPayoutReviewAction;
      adminNote?: string;
      externalReference?: string;
    }
  ): Promise<PayoutRequest> {
    try {
      if (!payoutId.trim()) {
        throw new Error('Payout ID is required');
      }
      const { data } = await api.post<ApiResponse<PayoutRequest>>(
        `/admin/wallet/payouts/${payoutId}/review`,
        payload
      );
      if (!data.data) {
        throw new Error('No payout review response received');
      }
      return normalizePayoutRequest(data.data);
    } catch (error) {
      wrapWalletError('Failed to review payout request', error);
    }
  },
};

export default walletService;

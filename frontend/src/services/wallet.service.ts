import api from './api';
import { ApiResponse, PayoutMethod, PayoutMethodType, PayoutRequest, WalletSummary, WalletTransaction, WalletTransactionSource, WalletTransactionType } from '@/types';

const walletService = {
  // Summary
  async getMySummary(): Promise<WalletSummary> {
    const { data } = await api.get<ApiResponse<WalletSummary>>('/wallet/me');
    return data.data!;
  },

  // Transactions
  async getMyTransactions(params?: { limit?: number; offset?: number; type?: WalletTransactionType; source?: WalletTransactionSource }) {
    const { data } = await api.get<ApiResponse<{ items: WalletTransaction[]; total: number; limit: number; offset: number }>>('/wallet/me/transactions', { params });
    return data.data!;
  },

  // Payout methods
  async listPayoutMethods(): Promise<PayoutMethod[]> {
    const { data } = await api.get<ApiResponse<PayoutMethod[]>>('/wallet/me/payout-methods');
    return data.data!;
  },
  async addPayoutMethod(input: { type: PayoutMethodType; label: string; details: any; isDefault?: boolean }): Promise<PayoutMethod> {
    const { data } = await api.post<ApiResponse<PayoutMethod>>('/wallet/me/payout-methods', input);
    return data.data!;
  },
  async updatePayoutMethod(id: string, input: { label?: string; details?: any; isDefault?: boolean }): Promise<PayoutMethod> {
    const { data } = await api.put<ApiResponse<PayoutMethod>>(`/wallet/me/payout-methods/${id}`, input);
    return data.data!;
  },
  async deletePayoutMethod(id: string) {
    await api.delete(`/wallet/me/payout-methods/${id}`);
  },

  // Payout requests
  async requestPayout(input: { amount: number; methodId?: string; note?: string }) {
    const { data } = await api.post<ApiResponse<any>>('/wallet/me/payouts', input);
    return data.data;
  },
  async listMyPayouts(params?: { limit?: number; offset?: number }) {
    const { data } = await api.get<ApiResponse<{ items: PayoutRequest[]; total: number; limit: number; offset: number }>>('/wallet/me/payouts', { params });
    return data.data!;
  },
};

export default walletService;


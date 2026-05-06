import api from './api';
import {
  AdCampaign,
  AdDestinationType,
  AdStatus,
  AdPlacement,
  AdTheme,
  UserRole,
  ApiResponse,
} from '@/types';
import { extractData } from './response-utils';
import { normalizeAdAssets } from '@/utils/asset-normalizers';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AdminAdListResponse {
  items: AdCampaign[];
  pagination: PaginationMeta;
}

interface AdCampaignPayload {
  name: string;
  title: string;
  badge?: string | null;
  description: string;
  supportingText?: string | null;
  sponsorName?: string | null;
  imageUrl?: string | null;
  ctaLabel: string;
  ctaUrl: string;
  destinationType: AdDestinationType;
  openInNewTab: boolean;
  placement: AdPlacement;
  status: AdStatus;
  theme: AdTheme;
  targetRoles: UserRole[];
  startsAt?: string | null;
  endsAt?: string | null;
}

const normalizeAdList = (items: AdCampaign[]) => items.map(normalizeAdAssets);

const adsService = {
  getLoginPromotions: async (): Promise<AdCampaign[]> => {
    const response = await api.get<ApiResponse<AdCampaign[]>>('/ads/login-promotions');
    return normalizeAdList(extractData(response) || []);
  },

  getAdminAds: async (params?: {
    search?: string;
    status?: AdStatus | '';
    role?: UserRole | '';
    placement?: AdPlacement | '';
    page?: number;
    limit?: number;
  }): Promise<AdminAdListResponse> => {
    const response = await api.get<ApiResponse<AdminAdListResponse>>('/admin/ads', {
      params,
    });
    const data = extractData(response);
    return {
      ...data,
      items: normalizeAdList(data.items || []),
    };
  },

  createAd: async (payload: AdCampaignPayload): Promise<AdCampaign> => {
    const response = await api.post<ApiResponse<AdCampaign>>('/admin/ads', payload);
    return normalizeAdAssets(extractData(response));
  },

  updateAd: async (id: string, payload: AdCampaignPayload): Promise<AdCampaign> => {
    const response = await api.put<ApiResponse<AdCampaign>>(`/admin/ads/${id}`, payload);
    return normalizeAdAssets(extractData(response));
  },

  moveAd: async (id: string, direction: 'up' | 'down'): Promise<AdCampaign> => {
    const response = await api.post<ApiResponse<AdCampaign>>(`/admin/ads/${id}/move`, {
      direction,
    });
    return normalizeAdAssets(extractData(response));
  },

  deleteAd: async (id: string): Promise<void> => {
    await api.delete(`/admin/ads/${id}`);
  },
};

export default adsService;
export type { AdCampaignPayload, AdminAdListResponse, PaginationMeta };

import { useEffect, useMemo, useRef, useState } from 'react';
import clientLogger from '@/utils/logger';
import {
  AdCampaign,
  AdDestinationType,
  AdPlacement,
  AdStatus,
  UserRole,
} from '@/types';
import adsService, { AdCampaignPayload } from '@/services/ads.service';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import AdEditorModal from '@/components/admin/AdEditorModal';
import { extractErrorMessage } from '@/utils/error-handler';
import { useDebounce } from '@/hooks';
import toast from 'react-hot-toast';
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  Megaphone,
  PauseCircle,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { usePageTitle } from '@/hooks';

const themePreviewClasses = {
  MIDNIGHT: 'from-slate-950 via-slate-900 to-indigo-950 text-white',
  SUNSET: 'from-rose-700 via-orange-500 to-amber-300 text-white',
  AURORA: 'from-emerald-700 via-teal-600 to-cyan-700 text-white',
  OCEAN: 'from-sky-700 via-blue-700 to-indigo-900 text-white',
  FOREST: 'from-emerald-900 via-green-800 to-lime-700 text-white',
  ROSE: 'from-fuchsia-800 via-pink-700 to-rose-700 text-white',
} as const;

const statusOptions = [
  { label: 'All', value: '' },
  { label: 'Draft', value: AdStatus.DRAFT },
  { label: 'Active', value: AdStatus.ACTIVE },
  { label: 'Paused', value: AdStatus.PAUSED },
  { label: 'Archived', value: AdStatus.ARCHIVED },
];

const roleOptions = [
  { label: 'All', value: '' },
  { label: 'Students', value: UserRole.STUDENT },
  { label: 'Teachers', value: UserRole.TEACHER },
  { label: 'Admins', value: UserRole.ADMIN },
];

const buildPayloadFromAd = (
  ad: AdCampaign,
  overrides?: Partial<AdCampaignPayload>
): AdCampaignPayload => ({
  name: ad.name,
  title: ad.title,
  badge: ad.badge || null,
  description: ad.description,
  supportingText: ad.supportingText || null,
  sponsorName: ad.sponsorName || null,
  imageUrl: ad.imageUrl || null,
  ctaLabel: ad.ctaLabel,
  ctaUrl: ad.ctaUrl,
  destinationType: ad.destinationType,
  openInNewTab: ad.openInNewTab,
  placement: ad.placement,
  status: ad.status,
  theme: ad.theme,
  targetRoles: ad.targetRoles || [],
  startsAt: ad.startsAt || null,
  endsAt: ad.endsAt || null,
  ...overrides,
});

export default function AdsManagement() {
  usePageTitle('Ads Management');
  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdStatus | ''>('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAd, setSelectedAd] = useState<AdCampaign | null>(null);
  const [adToDelete, setAdToDelete] = useState<AdCampaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const latestFetchIdRef = useRef(0);
  const debouncedSearch = useDebounce(search.trim(), 300);
  const hasActiveScopedFilters = Boolean(search.trim() || statusFilter || roleFilter);

  const fetchAds = async () => {
    const fetchId = latestFetchIdRef.current + 1;
    latestFetchIdRef.current = fetchId;
    setIsLoading(true);
    try {
      const data = await adsService.getAdminAds({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
        placement: AdPlacement.LOGIN_MODAL,
        page: 1,
        limit: 100,
      });
      if (latestFetchIdRef.current !== fetchId) {
        return;
      }

      setAds(data.items || []);
    } catch (error) {
      if (latestFetchIdRef.current !== fetchId) {
        return;
      }

      clientLogger.error('Failed to fetch ads:', error);
      toast.error(extractErrorMessage(error, 'Failed to load ads'));
    } finally {
      if (latestFetchIdRef.current === fetchId) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchAds();
  }, [debouncedSearch, statusFilter, roleFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const live = ads.filter((ad) => {
      const startsAt = ad.startsAt ? new Date(ad.startsAt) : null;
      const endsAt = ad.endsAt ? new Date(ad.endsAt) : null;
      return (
        ad.status === AdStatus.ACTIVE &&
        (!startsAt || startsAt <= now) &&
        (!endsAt || endsAt >= now)
      );
    }).length;

    return {
      total: ads.length,
      active: ads.filter((ad) => ad.status === AdStatus.ACTIVE).length,
      live,
      external: ads.filter((ad) => ad.destinationType === AdDestinationType.EXTERNAL)
        .length,
    };
  }, [ads]);

  const handleSave = async (payload: AdCampaignPayload, id?: string) => {
    setIsSaving(true);
    try {
      if (id) {
        await adsService.updateAd(id, payload);
        toast.success('Ad updated successfully');
      } else {
        await adsService.createAd(payload);
        toast.success('Ad created successfully');
      }
      setIsEditorOpen(false);
      setSelectedAd(null);
      await fetchAds();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to save ad'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!adToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await adsService.deleteAd(adToDelete.id);
      toast.success('Ad deleted successfully');
      setAdToDelete(null);
      await fetchAds();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to delete ad'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMove = async (adId: string, direction: 'up' | 'down') => {
    try {
      await adsService.moveAd(adId, direction);
      await fetchAds();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to reorder ad'));
    }
  };

  const handleToggleStatus = async (ad: AdCampaign) => {
    const nextStatus =
      ad.status === AdStatus.ACTIVE ? AdStatus.PAUSED : AdStatus.ACTIVE;

    try {
      await adsService.updateAd(
        ad.id,
        buildPayloadFromAd(ad, { status: nextStatus })
      );
      toast.success(
        nextStatus === AdStatus.ACTIVE ? 'Ad activated' : 'Ad paused'
      );
      await fetchAds();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to update ad status'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                Ads <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Management</span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">
                Manage login popup campaigns, redirect targets, and display order.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedAd(null);
              setIsEditorOpen(true);
            }}
            className="btn-primary"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Ad
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="card shadow-xl border border-gray-100 rounded-2xl">
            <p className="text-sm font-medium text-gray-500">Loaded ads</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="card shadow-xl border border-gray-100 rounded-2xl">
            <p className="text-sm font-medium text-gray-500">Active ads</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.active}</p>
          </div>
          <div className="card shadow-xl border border-gray-100 rounded-2xl">
            <p className="text-sm font-medium text-gray-500">Live now</p>
            <p className="mt-2 text-3xl font-bold text-primary-600">{stats.live}</p>
          </div>
          <div className="card shadow-xl border border-gray-100 rounded-2xl">
            <p className="text-sm font-medium text-gray-500">External redirects</p>
            <p className="mt-2 text-3xl font-bold text-violet-600">{stats.external}</p>
          </div>
        </div>

        <div className="card mb-6 shadow-xl border border-gray-100 rounded-2xl">
          <div className="grid gap-4 lg:grid-cols-[2fr,1fr,1fr]">
            <input
              type="text"
              className="input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, title, sponsor, or description"
            />
            <select
              className="input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AdStatus | '')}
            >
              {statusOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as UserRole | '')}
            >
              {roleOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {hasActiveScopedFilters ? (
            <p className="mt-3 text-sm text-amber-700">
              Reordering is disabled while search or filters are active so the visible list cannot drift from the true display order.
            </p>
          ) : null}
        </div>

        <div className="card shadow-xl border border-gray-100 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center text-gray-600">Loading ads...</div>
          ) : ads.length === 0 ? (
            <div className="py-16 text-center">
              <Megaphone className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 text-xl font-bold text-gray-900">No ads yet</h3>
              <p className="mt-2 text-gray-600">Create the first campaign to power the login popup.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {ads.map((ad, index) => (
                <div key={ad.id} className="grid gap-4 p-5 lg:grid-cols-[1.35fr,0.8fr,0.95fr] lg:items-center">
                  <div className="flex items-start gap-4">
                    <div className={`relative h-28 w-40 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${themePreviewClasses[ad.theme]}`}>
                      {ad.imageUrl ? (
                        <>
                          <img src={ad.imageUrl} alt={ad.title} className="absolute inset-0 h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-slate-950/40" />
                        </>
                      ) : null}
                      <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/15 px-2.5 py-1 text-[10px] font-semibold uppercase text-white">
                        {ad.badge || 'Ad'}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{ad.title}</h3>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">#{ad.displayOrder}</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          ad.status === AdStatus.ACTIVE
                            ? 'bg-emerald-100 text-emerald-700'
                            : ad.status === AdStatus.PAUSED
                              ? 'bg-amber-100 text-amber-700'
                              : ad.status === AdStatus.ARCHIVED
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-blue-100 text-blue-700'
                        }`}>
                          {ad.status}
                        </span>
                        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                          {ad.destinationType === AdDestinationType.EXTERNAL ? 'External' : 'Internal'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-600">{ad.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-gray-200 px-2.5 py-1 text-gray-700">{ad.name}</span>
                        <span className="rounded-full border border-gray-200 px-2.5 py-1 text-gray-700">
                          {ad.targetRoles.length > 0 ? ad.targetRoles.join(', ') : 'All roles'}
                        </span>
                        {ad.sponsorName ? (
                          <span className="rounded-full border border-gray-200 px-2.5 py-1 text-gray-700">
                            Sponsor: {ad.sponsorName}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">Redirect</p>
                    <p className="mt-2 break-all">{ad.ctaUrl}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      {ad.openInNewTab ? <ExternalLink className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {ad.openInNewTab ? 'Opens in new tab' : 'Opens in same tab'}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <button type="button" onClick={() => { setSelectedAd(ad); setIsEditorOpen(true); }} className="btn-outline">
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </button>
                    <button type="button" onClick={() => handleToggleStatus(ad)} className="btn-outline">
                      <PauseCircle className="mr-2 h-4 w-4" />
                      {ad.status === AdStatus.ACTIVE ? 'Pause' : 'Activate'}
                    </button>
                    <button type="button" onClick={() => handleMove(ad.id, 'up')} disabled={hasActiveScopedFilters || index === 0} className="btn-outline disabled:opacity-50">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => handleMove(ad.id, 'down')} disabled={hasActiveScopedFilters || index === ads.length - 1} className="btn-outline disabled:opacity-50">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setAdToDelete(ad)} className="inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AdEditorModal
        ad={selectedAd}
        isOpen={isEditorOpen}
        isSaving={isSaving}
        onClose={() => {
          if (!isSaving) {
            setIsEditorOpen(false);
            setSelectedAd(null);
          }
        }}
        onSave={handleSave}
      />

      <ConfirmationModal
        isOpen={Boolean(adToDelete)}
        title="Delete ad campaign"
        description={adToDelete ? `Delete "${adToDelete.title}" permanently. This cannot be undone.` : ''}
        confirmLabel="Delete Ad"
        tone="danger"
        isLoading={isDeleting}
        onClose={() => {
          if (!isDeleting) {
            setAdToDelete(null);
          }
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';

import { useOverlayAccessibility } from '@/hooks';
import type { AdCampaignPayload } from '@/services/ads.service';
import uploadService from '@/services/upload.service';
import {
  AdCampaign,
  AdDestinationType,
  AdPlacement,
  AdStatus,
  AdTheme,
  UserRole,
} from '@/types';
import { extractErrorMessage } from '@/utils/error-handler';
import { toStorableBackendAssetPath } from '@/utils/runtime';

interface AdFormState {
  name: string;
  title: string;
  badge: string;
  description: string;
  supportingText: string;
  sponsorName: string;
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  destinationType: AdDestinationType;
  openInNewTab: boolean;
  placement: AdPlacement;
  status: AdStatus;
  theme: AdTheme;
  targetRoles: UserRole[];
  startsAt: string;
  endsAt: string;
}

interface AdEditorModalProps {
  ad?: AdCampaign | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: AdCampaignPayload, id?: string) => Promise<void>;
}

const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_INTERNAL_AD_IMAGE_PREFIX = '/uploads/thumbnails/';

const roleOptions: ReadonlyArray<{ label: string; value: UserRole }> = [
  { label: 'Students', value: UserRole.STUDENT },
  { label: 'Teachers', value: UserRole.TEACHER },
  { label: 'Admins', value: UserRole.ADMIN },
];

const statusOptions: ReadonlyArray<{ label: string; value: AdStatus }> = [
  { label: 'Draft', value: AdStatus.DRAFT },
  { label: 'Active', value: AdStatus.ACTIVE },
  { label: 'Paused', value: AdStatus.PAUSED },
  { label: 'Archived', value: AdStatus.ARCHIVED },
];

const themeOptions: ReadonlyArray<{ label: string; value: AdTheme }> = [
  { label: 'Midnight', value: AdTheme.MIDNIGHT },
  { label: 'Sunset', value: AdTheme.SUNSET },
  { label: 'Aurora', value: AdTheme.AURORA },
  { label: 'Ocean', value: AdTheme.OCEAN },
  { label: 'Forest', value: AdTheme.FOREST },
  { label: 'Rose', value: AdTheme.ROSE },
];

const defaultFormState: AdFormState = {
  name: '',
  title: '',
  badge: '',
  description: '',
  supportingText: '',
  sponsorName: '',
  imageUrl: '',
  ctaLabel: '',
  ctaUrl: '',
  destinationType: AdDestinationType.INTERNAL,
  openInNewTab: false,
  placement: AdPlacement.LOGIN_MODAL,
  status: AdStatus.DRAFT,
  theme: AdTheme.MIDNIGHT,
  targetRoles: [],
  startsAt: '',
  endsAt: '',
};

const themePreviewClasses: Record<AdTheme, string> = {
  [AdTheme.MIDNIGHT]: 'from-slate-950 via-slate-900 to-indigo-950 text-white',
  [AdTheme.SUNSET]: 'from-rose-700 via-orange-500 to-amber-300 text-white',
  [AdTheme.AURORA]: 'from-emerald-700 via-teal-600 to-cyan-700 text-white',
  [AdTheme.OCEAN]: 'from-sky-700 via-blue-700 to-indigo-900 text-white',
  [AdTheme.FOREST]: 'from-emerald-900 via-green-800 to-lime-700 text-white',
  [AdTheme.ROSE]: 'from-fuchsia-800 via-pink-700 to-rose-700 text-white',
};

const trimToNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeInternalName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const uniqueRoles = (roles: UserRole[]) => Array.from(new Set(roles));

const formatDateTimeLocal = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (part: number) => String(part).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const isSafeUrlScheme = (value: string) => !/^(javascript|data):/i.test(value.trim());

const isValidHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidInternalPath = (value: string) =>
  value.startsWith('/') && !value.startsWith('//');

const getSafeImagePreviewUrl = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed || !isSafeUrlScheme(trimmed)) {
    return '';
  }

  const storableImageUrl = toStorableBackendAssetPath(trimmed);

  if (storableImageUrl.startsWith('/')) {
    return storableImageUrl.startsWith(ALLOWED_INTERNAL_AD_IMAGE_PREFIX)
      ? storableImageUrl
      : '';
  }

  return isValidHttpUrl(storableImageUrl) ? storableImageUrl : '';
};

const requireTrimmedText = (value: string, fieldName: string) => {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
};

const createFormStateFromAd = (ad?: AdCampaign | null): AdFormState => {
  if (!ad) {
    return { ...defaultFormState };
  }

  return {
    name: ad.name ?? '',
    title: ad.title ?? '',
    badge: ad.badge ?? '',
    description: ad.description ?? '',
    supportingText: ad.supportingText ?? '',
    sponsorName: ad.sponsorName ?? '',
    imageUrl: ad.imageUrl ?? '',
    ctaLabel: ad.ctaLabel ?? '',
    ctaUrl: ad.ctaUrl ?? '',
    destinationType: ad.destinationType ?? AdDestinationType.INTERNAL,
    openInNewTab: Boolean(ad.openInNewTab),
    placement: ad.placement ?? AdPlacement.LOGIN_MODAL,
    status: ad.status ?? AdStatus.DRAFT,
    theme: ad.theme ?? AdTheme.MIDNIGHT,
    targetRoles: uniqueRoles(ad.targetRoles ?? []),
    startsAt: formatDateTimeLocal(ad.startsAt),
    endsAt: formatDateTimeLocal(ad.endsAt),
  };
};

const buildPayloadFromForm = (form: AdFormState): AdCampaignPayload => {
  const imageUrl = trimToNull(form.imageUrl);
  const storableImageUrl = imageUrl ? toStorableBackendAssetPath(imageUrl) : null;

  return {
    name: normalizeInternalName(form.name),
    title: form.title.trim(),
    badge: trimToNull(form.badge),
    description: form.description.trim(),
    supportingText: trimToNull(form.supportingText),
    sponsorName: trimToNull(form.sponsorName),
    imageUrl: storableImageUrl || null,
    ctaLabel: form.ctaLabel.trim(),
    ctaUrl: form.ctaUrl.trim(),
    destinationType: form.destinationType,
    openInNewTab: form.openInNewTab,
    placement: form.placement,
    status: form.status,
    theme: form.theme,
    targetRoles: uniqueRoles(form.targetRoles),
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
  };
};

const validateInternalName = (value: string) => {
  const normalized = normalizeInternalName(value);

  if (!normalized) {
    throw new Error('Internal name must contain letters or numbers');
  }
};

const validateFormState = (form: AdFormState) => {
  validateInternalName(form.name);
  requireTrimmedText(form.title, 'Title');
  requireTrimmedText(form.description, 'Description');
  requireTrimmedText(form.ctaLabel, 'CTA label');

  const ctaUrl = form.ctaUrl.trim();

  if (!ctaUrl) {
    throw new Error('Destination URL is required');
  }

  if (!isSafeUrlScheme(ctaUrl)) {
    throw new Error('Destination URL uses an unsafe scheme');
  }

  if (form.destinationType === AdDestinationType.INTERNAL) {
    if (!isValidInternalPath(ctaUrl)) {
      throw new Error('Internal ads must use an in-app path starting with /');
    }
  } else if (!isValidHttpUrl(ctaUrl)) {
    throw new Error('External ads must use a valid absolute http or https URL');
  }

  const imageUrl = form.imageUrl.trim();

  if (imageUrl && !getSafeImagePreviewUrl(imageUrl)) {
    throw new Error(
      'Image URL must be an absolute http(s) URL or a /uploads/thumbnails/... asset path'
    );
  }

  if (form.startsAt || form.endsAt) {
    const startsAt = form.startsAt ? new Date(form.startsAt) : null;
    const endsAt = form.endsAt ? new Date(form.endsAt) : null;

    if (
      (startsAt && Number.isNaN(startsAt.getTime())) ||
      (endsAt && Number.isNaN(endsAt.getTime()))
    ) {
      throw new Error('Invalid ad schedule date');
    }

    if (startsAt && endsAt && startsAt >= endsAt) {
      throw new Error('Start date must be before end date');
    }
  }
};

const validateImageFile = (file: File) => {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Only PNG, JPG, JPEG, or WebP images are allowed');
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Image size must not exceed ${MAX_IMAGE_SIZE_MB}MB`);
  }
};

export default function AdEditorModal({
  ad,
  isOpen,
  isSaving,
  onClose,
  onSave,
}: AdEditorModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const initialFocusRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<AdFormState>(() => ({ ...defaultFormState }));
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const isBusy = isSaving || isUploadingImage;

  const safePreviewImageUrl = useMemo(
    () => getSafeImagePreviewUrl(form.imageUrl),
    [form.imageUrl]
  );

  useEffect(() => {
    if (isOpen) {
      setForm(createFormStateFromAd(ad));
    }
  }, [ad, isOpen]);

  useOverlayAccessibility({
    isOpen,
    containerRef: panelRef,
    initialFocusRef,
    onClose: isBusy ? undefined : onClose,
    trapFocus: true,
    lockBodyScroll: true,
  });

  if (!isOpen) {
    return null;
  }

  const updateForm = <Key extends keyof AdFormState>(
    key: Key,
    value: AdFormState[Key]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleRoleToggle = (role: UserRole) => {
    setForm((current) => ({
      ...current,
      targetRoles: current.targetRoles.includes(role)
        ? current.targetRoles.filter((item) => item !== role)
        : [...current.targetRoles, role],
    }));
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || isUploadingImage) {
      return;
    }

    setIsUploadingImage(true);

    try {
      validateImageFile(file);
      const imageUrl = await uploadService.uploadThumbnail(file);
      updateForm('imageUrl', imageUrl);
      toast.success('Ad image uploaded');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to upload image'));
    } finally {
      setIsUploadingImage(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    try {
      validateFormState(form);
      await onSave(buildPayloadFromForm(form), ad?.id);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to save ad campaign'));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-editor-modal-title"
        tabIndex={-1}
        className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="grid lg:grid-cols-[1.05fr,1.25fr]">
          <div
            className={`relative min-h-[280px] bg-gradient-to-br ${
              themePreviewClasses[form.theme]
            } p-6`}
          >
            {safePreviewImageUrl ? (
              <>
                <img
                  src={safePreviewImageUrl}
                  alt={form.title.trim() || 'Ad preview'}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/45" />
              </>
            ) : null}

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  {form.badge.trim() || 'Login modal ad'}
                </span>
                <span className="inline-flex rounded-full border border-white/20 bg-black/15 px-3 py-1 text-xs font-medium text-white/85">
                  {form.destinationType === AdDestinationType.EXTERNAL
                    ? 'External redirect'
                    : 'Internal redirect'}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-white/70">
                  Live preview
                </p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  {form.title.trim() || 'Ad title goes here'}
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/85">
                  {form.description.trim() ||
                    'Write a clear message so users understand what the ad is promoting.'}
                </p>

                {form.supportingText.trim() ? (
                  <div className="mt-4 rounded-2xl border border-white/15 bg-black/15 px-4 py-3 text-sm text-white/85">
                    {form.supportingText.trim()}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="max-h-[90vh] overflow-y-auto p-6 sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 id="ad-editor-modal-title" className="text-2xl font-bold text-gray-900">
                  {ad ? 'Edit ad campaign' : 'Create ad campaign'}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  This campaign will appear in the login modal when its status is active and
                  its schedule is live.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="btn-outline"
              >
                Close
              </button>
            </div>

            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Internal name
                  </label>
                  <input
                    ref={initialFocusRef}
                    type="text"
                    className="input"
                    value={form.name}
                    onChange={(event) => updateForm('name', event.target.value)}
                    placeholder="partner-spring-launch"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    It will be saved as a lowercase system name, for example partner-spring-launch.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Badge
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={form.badge}
                    onChange={(event) => updateForm('badge', event.target.value)}
                    placeholder="Featured"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  className="input"
                  value={form.title}
                  onChange={(event) => updateForm('title', event.target.value)}
                  placeholder="Promote a package, course, or partner campaign"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Description
                </label>
                <textarea
                  rows={4}
                  className="input"
                  value={form.description}
                  onChange={(event) => updateForm('description', event.target.value)}
                  placeholder="Explain what the user gets when they click the ad."
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Supporting text
                </label>
                <textarea
                  rows={3}
                  className="input"
                  value={form.supportingText}
                  onChange={(event) => updateForm('supportingText', event.target.value)}
                  placeholder="Optional short callout shown in the popup."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Sponsor name
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={form.sponsorName}
                    onChange={(event) => updateForm('sponsorName', event.target.value)}
                    placeholder="Optional advertiser name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Theme
                  </label>
                  <select
                    className="input"
                    value={form.theme}
                    onChange={(event) => updateForm('theme', event.target.value as AdTheme)}
                  >
                    {themeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">Ad artwork</h4>
                    <p className="text-sm text-gray-600">
                      Paste an image URL or upload a PNG, JPG, JPEG, or WebP image.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleImageUpload}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isBusy}
                      className="btn-outline"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isUploadingImage ? 'Uploading...' : 'Upload image'}
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  className="input mt-4"
                  value={form.imageUrl}
                  onChange={(event) => updateForm('imageUrl', event.target.value)}
                  placeholder="https://example.com/ad-image.jpg or /uploads/thumbnails/..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    CTA label
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={form.ctaLabel}
                    onChange={(event) => updateForm('ctaLabel', event.target.value)}
                    placeholder="Open offer"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Destination type
                  </label>
                  <select
                    className="input"
                    value={form.destinationType}
                    onChange={(event) =>
                      updateForm('destinationType', event.target.value as AdDestinationType)
                    }
                  >
                    <option value={AdDestinationType.INTERNAL}>Internal page</option>
                    <option value={AdDestinationType.EXTERNAL}>External website</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Destination URL
                </label>
                <input
                  type="text"
                  className="input"
                  value={form.ctaUrl}
                  onChange={(event) => updateForm('ctaUrl', event.target.value)}
                  placeholder={
                    form.destinationType === AdDestinationType.EXTERNAL
                      ? 'https://partner-site.com/campaign'
                      : '/courses/123'
                  }
                  required
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 p-4">
                <input
                  type="checkbox"
                  checked={form.openInNewTab}
                  onChange={(event) => updateForm('openInNewTab', event.target.checked)}
                />
                <div>
                  <p className="font-medium text-gray-900">Open in a new tab</p>
                  <p className="text-sm text-gray-600">
                    Useful for partner ads or external campaigns you do not want to replace
                    the current tab.
                  </p>
                </div>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Status
                  </label>
                  <select
                    className="input"
                    value={form.status}
                    onChange={(event) => updateForm('status', event.target.value as AdStatus)}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Placement
                  </label>
                  <select
                    className="input"
                    value={form.placement}
                    onChange={(event) =>
                      updateForm('placement', event.target.value as AdPlacement)
                    }
                  >
                    <option value={AdPlacement.LOGIN_MODAL}>Login modal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Target roles
                </label>

                <div className="flex flex-wrap gap-3 rounded-2xl border border-gray-200 p-4">
                  {roleOptions.map((role) => (
                    <label
                      key={role.value}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.targetRoles.includes(role.value)}
                        onChange={() => handleRoleToggle(role.value)}
                      />
                      {role.label}
                    </label>
                  ))}
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Leave everything unchecked to show the ad to all logged-in roles.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Starts at
                  </label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.startsAt}
                    onChange={(event) => updateForm('startsAt', event.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Ends at
                  </label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.endsAt}
                    onChange={(event) => updateForm('endsAt', event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="btn-outline"
              >
                Cancel
              </button>

              <button type="submit" disabled={isBusy} className="btn-primary">
                {isSaving ? 'Saving...' : ad ? 'Update ad' : 'Create ad'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

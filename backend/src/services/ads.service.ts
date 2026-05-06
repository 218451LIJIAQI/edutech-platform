import {
  AdCampaign,
  AdDestinationType,
  AdPlacement,
  AdStatus,
  AdTheme,
  Prisma,
  UserRole,
} from "@prisma/client";
import prisma from "../config/database";
import { ConflictError, NotFoundError, ValidationError } from "../utils/errors";
import { extractUploadPathFromUrlOrPath } from "../utils/url-or-path";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";
import { buildPaginationMeta, normalizePagination } from "./shared/pagination";

export interface CreateAdCampaignInput {
  name: string;
  title: string;
  badge?: string | null;
  description: string;
  supportingText?: string | null;
  sponsorName?: string | null;
  imageUrl?: string | null;
  ctaLabel: string;
  ctaUrl: string;
  destinationType?: AdDestinationType;
  openInNewTab?: boolean;
  placement?: AdPlacement;
  status?: AdStatus;
  theme?: AdTheme;
  targetRoles?: UserRole[];
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
}

export type UpdateAdCampaignInput = Partial<CreateAdCampaignInput>;

const ALLOWED_INTERNAL_AD_IMAGE_FOLDERS = new Set(["thumbnails"]);
const MAX_URL_LENGTH = 2048;

const hasOwn = <T extends object, K extends PropertyKey>(
  value: T,
  key: K,
): value is T & Record<K, unknown> =>
  Object.prototype.hasOwnProperty.call(value, key);

const trimNullableText = (value?: string | null) => {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = sanitizeUserPlainText(value);
  return trimmed || null;
};

const requireText = (value: string | undefined, fieldName: string) => {
  const trimmed =
    value === undefined ? undefined : sanitizeUserPlainText(value);

  if (!trimmed) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return trimmed;
};

const validateMaxLength = (
  value: string,
  fieldName: string,
  maxLength: number,
) => {
  if (value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return value;
};

const sanitizeSlugLikeName = (value: string) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    throw new ValidationError(
      "Name must contain letters or numbers after normalization",
    );
  }

  return validateMaxLength(normalized, "Name", 120);
};

const ensureSafeUrlText = (value: string, fieldName: string) => {
  const trimmed = validateMaxLength(value.trim(), fieldName, MAX_URL_LENGTH);

  if (!trimmed) {
    throw new ValidationError(`${fieldName} is required`);
  }

  if (/[\r\n]/.test(trimmed)) {
    throw new ValidationError(`${fieldName} must not contain line breaks`);
  }

  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    throw new ValidationError(`${fieldName} uses an unsafe URL scheme`);
  }

  return trimmed;
};

const validateImageUrl = (imageUrl: string | null) => {
  if (!imageUrl) {
    return null;
  }

  const normalizedImageUrl = ensureSafeUrlText(imageUrl, "Image URL");
  const uploadPath = extractUploadPathFromUrlOrPath(normalizedImageUrl);
  const hasAllowedInternalUploadPath = Boolean(
    uploadPath &&
      ALLOWED_INTERNAL_AD_IMAGE_FOLDERS.has(uploadPath.split("/")[0]),
  );

  if (normalizedImageUrl.startsWith("/")) {
    if (normalizedImageUrl.startsWith("//") || !hasAllowedInternalUploadPath) {
      throw new ValidationError(
        "Ad image URL must be an absolute http(s) URL or a /uploads/thumbnails asset path",
      );
    }

    return normalizedImageUrl;
  }

  try {
    const parsed = new URL(normalizedImageUrl);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new ValidationError("Image URL must use http or https");
    }

    if (uploadPath && !hasAllowedInternalUploadPath) {
      throw new ValidationError(
        "Ad image URL must be an absolute http(s) URL or a /uploads/thumbnails asset path",
      );
    }

    return normalizedImageUrl;
  } catch {
    throw new ValidationError(
      "Image URL must be an absolute http(s) URL or a /uploads/thumbnails asset path",
    );
  }
};

const validateCtaUrl = (ctaUrl: string, destinationType: AdDestinationType) => {
  const normalizedUrl = ensureSafeUrlText(ctaUrl, "Call-to-action URL");

  if (destinationType === AdDestinationType.INTERNAL) {
    if (
      !normalizedUrl.startsWith("/") ||
      normalizedUrl.startsWith("//") ||
      normalizedUrl.includes("\\")
    ) {
      throw new ValidationError(
        "Internal ads must use a safe in-app path starting with /",
      );
    }

    return normalizedUrl;
  }

  try {
    const parsed = new URL(normalizedUrl);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new ValidationError(
        "External ads must use an http or https destination URL",
      );
    }

    return normalizedUrl;
  } catch {
    throw new ValidationError(
      "External ads must use an absolute http or https destination URL",
    );
  }
};

const normalizeTargetRoles = (targetRoles?: UserRole[]) => {
  const validRoles = new Set(Object.values(UserRole));
  const uniqueRoles = Array.from(new Set((targetRoles || []).filter(Boolean)));

  for (const role of uniqueRoles) {
    if (!validRoles.has(role)) {
      throw new ValidationError(`Invalid target role: ${role}`);
    }
  }

  return uniqueRoles;
};

const normalizeWindowDate = (value?: Date | string | null) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const nextValue = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(nextValue.getTime())) {
    throw new ValidationError("Invalid ad schedule date");
  }

  return nextValue;
};

const validateScheduleWindow = (startsAt: Date | null, endsAt: Date | null) => {
  if (startsAt && endsAt && startsAt > endsAt) {
    throw new ValidationError("Start date must be before or equal to end date");
  }
};

const buildCreateData = (
  payload: CreateAdCampaignInput,
  adminId: string,
  displayOrder: number,
): Prisma.AdCampaignUncheckedCreateInput => {
  const destinationType = payload.destinationType ?? AdDestinationType.INTERNAL;
  const startsAt = normalizeWindowDate(payload.startsAt);
  const endsAt = normalizeWindowDate(payload.endsAt);

  validateScheduleWindow(startsAt, endsAt);

  return {
    name: sanitizeSlugLikeName(requireText(payload.name, "Name")),
    title: validateMaxLength(requireText(payload.title, "Title"), "Title", 160),
    badge: trimNullableText(payload.badge),
    description: validateMaxLength(
      requireText(payload.description, "Description"),
      "Description",
      1000,
    ),
    supportingText: trimNullableText(payload.supportingText),
    sponsorName: trimNullableText(payload.sponsorName),
    imageUrl: validateImageUrl(trimNullableText(payload.imageUrl)),
    ctaLabel: validateMaxLength(
      requireText(payload.ctaLabel, "Call-to-action label"),
      "Call-to-action label",
      80,
    ),
    ctaUrl: validateCtaUrl(payload.ctaUrl, destinationType),
    destinationType,
    openInNewTab:
      payload.openInNewTab ?? destinationType === AdDestinationType.EXTERNAL,
    placement: payload.placement ?? AdPlacement.LOGIN_MODAL,
    status: payload.status ?? AdStatus.DRAFT,
    theme: payload.theme ?? AdTheme.MIDNIGHT,
    targetRoles: normalizeTargetRoles(payload.targetRoles),
    displayOrder,
    startsAt,
    endsAt,
    createdBy: adminId,
    updatedBy: adminId,
  };
};

const buildUpdateData = (
  payload: UpdateAdCampaignInput,
  existing: AdCampaign,
  adminId: string,
): Prisma.AdCampaignUncheckedUpdateInput => {
  const data: Prisma.AdCampaignUncheckedUpdateInput = {};
  const destinationType = payload.destinationType ?? existing.destinationType;

  if (hasOwn(payload, "name") && payload.name !== undefined) {
    data.name = sanitizeSlugLikeName(requireText(payload.name, "Name"));
  }

  if (hasOwn(payload, "title") && payload.title !== undefined) {
    data.title = validateMaxLength(
      requireText(payload.title, "Title"),
      "Title",
      160,
    );
  }

  if (hasOwn(payload, "badge")) {
    data.badge = trimNullableText(payload.badge);
  }

  if (hasOwn(payload, "description") && payload.description !== undefined) {
    data.description = validateMaxLength(
      requireText(payload.description, "Description"),
      "Description",
      1000,
    );
  }

  if (hasOwn(payload, "supportingText")) {
    data.supportingText = trimNullableText(payload.supportingText);
  }

  if (hasOwn(payload, "sponsorName")) {
    data.sponsorName = trimNullableText(payload.sponsorName);
  }

  if (hasOwn(payload, "imageUrl")) {
    data.imageUrl = validateImageUrl(trimNullableText(payload.imageUrl));
  }

  if (hasOwn(payload, "ctaLabel") && payload.ctaLabel !== undefined) {
    data.ctaLabel = validateMaxLength(
      requireText(payload.ctaLabel, "Call-to-action label"),
      "Call-to-action label",
      80,
    );
  }

  if (hasOwn(payload, "destinationType")) {
    data.destinationType = destinationType;
  }

  if (hasOwn(payload, "ctaUrl") && payload.ctaUrl !== undefined) {
    data.ctaUrl = validateCtaUrl(payload.ctaUrl, destinationType);
  } else if (hasOwn(payload, "destinationType")) {
    data.ctaUrl = validateCtaUrl(existing.ctaUrl, destinationType);
  }

  if (hasOwn(payload, "openInNewTab")) {
    data.openInNewTab = Boolean(payload.openInNewTab);
  }

  if (hasOwn(payload, "placement") && payload.placement !== undefined) {
    data.placement = payload.placement;
  }

  if (hasOwn(payload, "status") && payload.status !== undefined) {
    data.status = payload.status;
  }

  if (hasOwn(payload, "theme") && payload.theme !== undefined) {
    data.theme = payload.theme;
  }

  if (hasOwn(payload, "targetRoles")) {
    data.targetRoles = { set: normalizeTargetRoles(payload.targetRoles) };
  }

  const nextStartsAt = hasOwn(payload, "startsAt")
    ? normalizeWindowDate(payload.startsAt)
    : existing.startsAt;
  const nextEndsAt = hasOwn(payload, "endsAt")
    ? normalizeWindowDate(payload.endsAt)
    : existing.endsAt;

  validateScheduleWindow(nextStartsAt, nextEndsAt);

  if (hasOwn(payload, "startsAt")) {
    data.startsAt = nextStartsAt;
  }

  if (hasOwn(payload, "endsAt")) {
    data.endsAt = nextEndsAt;
  }

  data.updatedBy = adminId;

  return data;
};

const buildRoleScopedWhere = (role?: UserRole): Prisma.AdCampaignWhereInput =>
  role
    ? {
        OR: [
          { targetRoles: { isEmpty: true } },
          { targetRoles: { has: role } },
        ],
      }
    : { targetRoles: { isEmpty: true } };

class AdsService {
  private async normalizeDisplayOrderForPlacement(
    placement: AdPlacement,
    updatedBy: string | null,
  ) {
    const orderedAds = await prisma.adCampaign.findMany({
      where: { placement },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        displayOrder: true,
      },
    });

    const updates = orderedAds
      .map((ad, index) => ({ ...ad, nextDisplayOrder: index }))
      .filter((ad) => ad.displayOrder !== ad.nextDisplayOrder)
      .map((ad) =>
        prisma.adCampaign.update({
          where: { id: ad.id },
          data: {
            displayOrder: ad.nextDisplayOrder,
            updatedBy,
          },
        }),
      );

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }
  }

  async getLoginPromotions(userRole?: UserRole) {
    const now = new Date();

    return prisma.adCampaign.findMany({
      where: {
        placement: AdPlacement.LOGIN_MODAL,
        status: AdStatus.ACTIVE,
        AND: [
          buildRoleScopedWhere(userRole),
          {
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          },
          {
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
        ],
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });
  }

  async getAdminAds(filters: {
    search?: string;
    status?: AdStatus;
    role?: UserRole;
    placement?: AdPlacement;
    page?: number;
    limit?: number;
  }) {
    const pagination = normalizePagination(filters.page, filters.limit, {
      defaultLimit: 20,
      maxLimit: 100,
    });
    const search = filters.search?.trim();
    const roleWhere = filters.role ? buildRoleScopedWhere(filters.role) : null;
    const searchWhere: Prisma.AdCampaignWhereInput | null = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { title: { contains: search, mode: "insensitive" } },
            { sponsorName: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : null;

    const where: Prisma.AdCampaignWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.placement ? { placement: filters.placement } : {}),
      ...(roleWhere || searchWhere
        ? {
            AND: [roleWhere, searchWhere].filter(
              (clause): clause is Prisma.AdCampaignWhereInput =>
                Boolean(clause),
            ),
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.adCampaign.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      }),
      prisma.adCampaign.count({ where }),
    ]);

    return {
      items,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async createAd(payload: CreateAdCampaignInput, adminId: string) {
    try {
      return await prisma.$transaction(async (tx) => {
        const dataPlacement = payload.placement ?? AdPlacement.LOGIN_MODAL;

        const maxDisplayOrder = await tx.adCampaign.aggregate({
          where: { placement: dataPlacement },
          _max: { displayOrder: true },
        });

        return tx.adCampaign.create({
          data: buildCreateData(
            payload,
            adminId,
            (maxDisplayOrder._max.displayOrder ?? -1) + 1,
          ),
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictError("An ad with this name already exists");
      }

      throw error;
    }
  }

  async updateAd(
    adId: string,
    payload: UpdateAdCampaignInput,
    adminId: string,
  ) {
    const existing = await prisma.adCampaign.findUnique({
      where: { id: adId },
    });

    if (!existing) {
      throw new NotFoundError("Ad not found");
    }

    const data = buildUpdateData(payload, existing, adminId);
    const nextPlacement =
      (data.placement as AdPlacement | undefined) ?? existing.placement;
    const placementChanged = nextPlacement !== existing.placement;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        let updateData = data;

        if (placementChanged) {
          const maxDisplayOrder = await tx.adCampaign.aggregate({
            where: { placement: nextPlacement },
            _max: { displayOrder: true },
          });

          updateData = {
            ...data,
            displayOrder: (maxDisplayOrder._max.displayOrder ?? -1) + 1,
          };
        }

        return tx.adCampaign.update({
          where: { id: adId },
          data: updateData,
        });
      });

      if (placementChanged) {
        await this.normalizeDisplayOrderForPlacement(
          existing.placement,
          adminId,
        );
        await this.normalizeDisplayOrderForPlacement(nextPlacement, adminId);
      }

      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictError("An ad with this name already exists");
      }

      throw error;
    }
  }

  async deleteAd(adId: string, adminId?: string) {
    const existing = await prisma.adCampaign.findUnique({
      where: { id: adId },
      select: {
        id: true,
        placement: true,
      },
    });

    if (!existing) {
      throw new NotFoundError("Ad not found");
    }

    await prisma.adCampaign.delete({
      where: { id: adId },
    });

    await this.normalizeDisplayOrderForPlacement(
      existing.placement,
      adminId ?? null,
    );

    return { deleted: true };
  }

  async moveAd(adId: string, direction: "up" | "down", adminId: string) {
    const existing = await prisma.adCampaign.findUnique({
      where: { id: adId },
      select: {
        id: true,
        placement: true,
      },
    });

    if (!existing) {
      throw new NotFoundError("Ad not found");
    }

    const orderedAds = await prisma.adCampaign.findMany({
      where: {
        placement: existing.placement,
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
      },
    });

    const currentIndex = orderedAds.findIndex((item) => item.id === adId);

    if (currentIndex === -1) {
      throw new NotFoundError("Ad not found");
    }

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= orderedAds.length) {
      const unchanged = await prisma.adCampaign.findUnique({
        where: { id: adId },
      });

      if (!unchanged) {
        throw new NotFoundError("Ad not found");
      }

      return unchanged;
    }

    const nextOrder = [...orderedAds];
    [nextOrder[currentIndex], nextOrder[targetIndex]] = [
      nextOrder[targetIndex],
      nextOrder[currentIndex],
    ];

    await prisma.$transaction(
      nextOrder.map((ad, index) =>
        prisma.adCampaign.update({
          where: { id: ad.id },
          data: {
            displayOrder: index,
            updatedBy: adminId,
          },
        }),
      ),
    );

    const updated = await prisma.adCampaign.findUnique({
      where: { id: adId },
    });

    if (!updated) {
      throw new NotFoundError("Ad not found after move");
    }

    return updated;
  }
}

export default new AdsService();

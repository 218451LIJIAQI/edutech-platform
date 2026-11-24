import { Request, Response } from "express";
import {
  AdDestinationType,
  AdPlacement,
  AdStatus,
  AdTheme,
  UserRole,
} from "@prisma/client";
import adsService, {
  type CreateAdCampaignInput,
  type UpdateAdCampaignInput,
} from "../services/ads.service";
import asyncHandler from "../utils/async-handler";
import { ValidationError } from "../utils/errors";
import { isHttpUrl } from "../utils/url-or-path";
import {
  parseNullableString,
  parseOptionalBoolean,
  parseOptionalDate,
  parseOptionalEnum,
  parseOptionalString,
  parseQueryPositiveInt,
  parseRequiredEnum,
  parseRequiredString,
  requireAuthUserId,
  sendCreated,
  sendSuccess,
} from "../utils/http";

type AdMoveDirection = "up" | "down";
const MOVE_DIRECTIONS: readonly AdMoveDirection[] = ["up", "down"] as const;

type AdPayloadOptions = {
  requireRequiredFields?: boolean;
};

const hasOwn = (target: unknown, key: string): boolean =>
  Boolean(
    target &&
      typeof target === "object" &&
      Object.prototype.hasOwnProperty.call(target, key),
  );

const parseNullableDate = (
  value: unknown,
  fieldName: string,
): Date | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  return parseOptionalDate(value, fieldName) ?? null;
};

const resolvePromotionRole = (req: Request): UserRole | undefined => {
  if (req.user?.role) {
    return req.user.role;
  }

  const requestedRole = parseOptionalEnum(req.query.role, UserRole, "role");
  return requestedRole === UserRole.ADMIN ? undefined : requestedRole;
};

const parseTargetRoles = (
  value: unknown,
  options: AdPayloadOptions,
): UserRole[] | undefined => {
  if (value === undefined) {
    return options.requireRequiredFields ? [] : undefined;
  }

  if (value === null || value === "") {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ValidationError("targetRoles must be an array");
  }

  const allowedRoles = Object.values(UserRole);
  const invalidRole = value.find(
    (role) => typeof role !== "string" || !allowedRoles.includes(role as UserRole),
  );

  if (invalidRole !== undefined) {
    throw new ValidationError(`Invalid target role: ${String(invalidRole)}`);
  }

  return value as UserRole[];
};

function parseAdPayload(
  body: Request["body"],
  options: { requireRequiredFields: true },
): CreateAdCampaignInput;
function parseAdPayload(
  body: Request["body"],
  options?: AdPayloadOptions,
): UpdateAdCampaignInput;
function parseAdPayload(
  body: Request["body"],
  options: AdPayloadOptions = {},
): CreateAdCampaignInput | UpdateAdCampaignInput {
  const destinationType = parseOptionalEnum(
    body?.destinationType,
    AdDestinationType,
    "destinationType",
  );
  const startsAt = parseNullableDate(body?.startsAt, "startsAt");
  const endsAt = parseNullableDate(body?.endsAt, "endsAt");

  if (startsAt && endsAt && startsAt > endsAt) {
    throw new ValidationError("startsAt cannot be later than endsAt");
  }

  if (options.requireRequiredFields) {
    const ctaUrl = parseRequiredString(body?.ctaUrl, "ctaUrl");
    if (destinationType === AdDestinationType.EXTERNAL && !isHttpUrl(ctaUrl)) {
      throw new ValidationError(
        "ctaUrl must be a valid HTTP or HTTPS URL for external ads",
      );
    }

    return {
      name: parseRequiredString(body?.name, "name"),
      title: parseRequiredString(body?.title, "title"),
      badge: parseNullableString(body?.badge, "badge"),
      description: parseRequiredString(body?.description, "description"),
      supportingText: parseNullableString(
        body?.supportingText,
        "supportingText",
      ),
      sponsorName: parseNullableString(body?.sponsorName, "sponsorName"),
      imageUrl: parseNullableString(body?.imageUrl, "imageUrl"),
      ctaLabel: parseRequiredString(body?.ctaLabel, "ctaLabel"),
      ctaUrl,
      destinationType,
      openInNewTab: parseOptionalBoolean(body?.openInNewTab, "openInNewTab"),
      placement: parseOptionalEnum(body?.placement, AdPlacement, "placement"),
      status: parseOptionalEnum(body?.status, AdStatus, "status"),
      theme: parseOptionalEnum(body?.theme, AdTheme, "theme"),
      targetRoles: parseTargetRoles(body?.targetRoles, options),
      startsAt,
      endsAt,
    };
  }

  const updatePayload: UpdateAdCampaignInput = {};

  if (hasOwn(body, "name")) {
    updatePayload.name = parseOptionalString(body?.name, "name", {
      rejectBlank: true,
    });
  }
  if (hasOwn(body, "title")) {
    updatePayload.title = parseOptionalString(body?.title, "title", {
      rejectBlank: true,
    });
  }
  if (hasOwn(body, "badge")) {
    updatePayload.badge = parseNullableString(body?.badge, "badge");
  }
  if (hasOwn(body, "description")) {
    updatePayload.description = parseOptionalString(
      body?.description,
      "description",
      { rejectBlank: true },
    );
  }
  if (hasOwn(body, "supportingText")) {
    updatePayload.supportingText = parseNullableString(
      body?.supportingText,
      "supportingText",
    );
  }
  if (hasOwn(body, "sponsorName")) {
    updatePayload.sponsorName = parseNullableString(
      body?.sponsorName,
      "sponsorName",
    );
  }
  if (hasOwn(body, "imageUrl")) {
    updatePayload.imageUrl = parseNullableString(body?.imageUrl, "imageUrl");
  }
  if (hasOwn(body, "ctaLabel")) {
    updatePayload.ctaLabel = parseOptionalString(body?.ctaLabel, "ctaLabel", {
      rejectBlank: true,
    });
  }
  if (hasOwn(body, "ctaUrl")) {
    const ctaUrl = parseOptionalString(body?.ctaUrl, "ctaUrl", {
      rejectBlank: true,
    });
    if (
      ctaUrl &&
      destinationType === AdDestinationType.EXTERNAL &&
      !isHttpUrl(ctaUrl)
    ) {
      throw new ValidationError(
        "ctaUrl must be a valid HTTP or HTTPS URL for external ads",
      );
    }
    updatePayload.ctaUrl = ctaUrl;
  }
  if (hasOwn(body, "destinationType") && destinationType !== undefined) {
    updatePayload.destinationType = destinationType;
  }
  if (hasOwn(body, "openInNewTab")) {
    const openInNewTab = parseOptionalBoolean(
      body?.openInNewTab,
      "openInNewTab",
    );
    if (openInNewTab !== undefined) {
      updatePayload.openInNewTab = openInNewTab;
    }
  }
  if (hasOwn(body, "placement")) {
    const placement = parseOptionalEnum(
      body?.placement,
      AdPlacement,
      "placement",
    );
    if (placement !== undefined) {
      updatePayload.placement = placement;
    }
  }
  if (hasOwn(body, "status")) {
    const status = parseOptionalEnum(body?.status, AdStatus, "status");
    if (status !== undefined) {
      updatePayload.status = status;
    }
  }
  if (hasOwn(body, "theme")) {
    const theme = parseOptionalEnum(body?.theme, AdTheme, "theme");
    if (theme !== undefined) {
      updatePayload.theme = theme;
    }
  }
  if (hasOwn(body, "targetRoles")) {
    updatePayload.targetRoles = parseTargetRoles(body?.targetRoles, options);
  }
  if (hasOwn(body, "startsAt")) {
    updatePayload.startsAt = startsAt;
  }
  if (hasOwn(body, "endsAt")) {
    updatePayload.endsAt = endsAt;
  }

  return updatePayload;
}

class AdsController {
  getLoginPromotions = asyncHandler(async (req: Request, res: Response) => {
    const items = await adsService.getLoginPromotions(resolvePromotionRole(req));
    sendSuccess(res, items);
  });

  getAllAds = asyncHandler(async (req: Request, res: Response) => {
    const data = await adsService.getAdminAds({
      search: parseOptionalString(req.query.search),
      status: parseOptionalEnum(req.query.status, AdStatus, "status"),
      role: parseOptionalEnum(req.query.role, UserRole, "role"),
      placement: parseOptionalEnum(
        req.query.placement,
        AdPlacement,
        "placement",
      ),
      page: parseQueryPositiveInt(req.query.page, "page", { max: 100 }),
      limit: parseQueryPositiveInt(req.query.limit, "limit", { max: 100 }),
    });
    sendSuccess(res, data);
  });

  createAd = asyncHandler(async (req: Request, res: Response) => {
    const ad = await adsService.createAd(
      parseAdPayload(req.body, { requireRequiredFields: true }),
      requireAuthUserId(req),
    );
    sendCreated(res, ad, "Ad created successfully");
  });

  updateAd = asyncHandler(async (req: Request, res: Response) => {
    const ad = await adsService.updateAd(
      req.params.id,
      parseAdPayload(req.body),
      requireAuthUserId(req),
    );
    sendSuccess(res, ad, "Ad updated successfully");
  });

  deleteAd = asyncHandler(async (req: Request, res: Response) => {
    requireAuthUserId(req);
    await adsService.deleteAd(req.params.id);
    sendSuccess(res, undefined, "Ad deleted successfully");
  });

  moveAd = asyncHandler(async (req: Request, res: Response) => {
    const direction = parseRequiredEnum(
      req.body?.direction,
      MOVE_DIRECTIONS,
      "direction",
      'direction must be "up" or "down"',
    );
    const ad = await adsService.moveAd(
      req.params.id,
      direction,
      requireAuthUserId(req),
    );
    sendSuccess(res, ad, `Ad moved ${direction} successfully`);
  });
}

export default new AdsController();

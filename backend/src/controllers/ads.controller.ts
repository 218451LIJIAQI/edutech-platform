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
  if (value === undefined || value === null || value === "") {
    return options.requireRequiredFields ? [] : undefined;
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
  const parseField = (value: unknown, fieldName: string) =>
    options.requireRequiredFields
      ? parseRequiredString(value, fieldName)
      : parseOptionalString(value, fieldName, { rejectBlank: true });

  const destinationType = parseOptionalEnum(
    body?.destinationType,
    AdDestinationType,
    "destinationType",
  );
  const ctaUrl = parseField(body?.ctaUrl, "ctaUrl");
  const startsAt = parseOptionalDate(body?.startsAt, "startsAt");
  const endsAt = parseOptionalDate(body?.endsAt, "endsAt");

  if (startsAt && endsAt && startsAt > endsAt) {
    throw new ValidationError("startsAt cannot be later than endsAt");
  }

  if (ctaUrl && destinationType === AdDestinationType.EXTERNAL && !isHttpUrl(ctaUrl)) {
    throw new ValidationError(
      "ctaUrl must be a valid HTTP or HTTPS URL for external ads",
    );
  }

  return {
    name: parseField(body?.name, "name"),
    title: parseField(body?.title, "title"),
    badge: parseOptionalString(body?.badge, "badge"),
    description: parseField(body?.description, "description"),
    supportingText: parseOptionalString(body?.supportingText, "supportingText"),
    sponsorName: parseOptionalString(body?.sponsorName, "sponsorName"),
    imageUrl: parseOptionalString(body?.imageUrl, "imageUrl"),
    ctaLabel: parseField(body?.ctaLabel, "ctaLabel"),
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

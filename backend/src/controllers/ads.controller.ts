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
import { AuthenticationError, ValidationError } from "../utils/errors";

type OriginCallbackData = unknown;
type AdMoveDirection = "up" | "down";

type AdPayloadOptions = {
  requireRequiredFields?: boolean;
};

const sendSuccess = (
  res: Response,
  data?: unknown,
  message?: string,
  statusCode = 200,
) => {
  res.status(statusCode).json({
    status: "success",
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
  });
};

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AuthenticationError("Authentication required");
  }

  return req.user.id;
};

const getStringValue = (value: OriginCallbackData): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    const trimmed = value[0].trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
};

const parseOptionalString = (
  value: OriginCallbackData,
  fieldName: string,
): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = getStringValue(value);

  if (parsed === undefined) {
    throw new ValidationError(`${fieldName} must be a non-empty string`);
  }

  return parsed;
};

const parseRequiredString = (
  value: OriginCallbackData,
  fieldName: string,
): string => {
  const parsed = parseOptionalString(value, fieldName);

  if (!parsed) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return parsed;
};

const parseOptionalEnum = <T extends string>(
  value: OriginCallbackData,
  enumObject: Record<string, T>,
  fieldName: string,
): T | undefined => {
  const parsed = getStringValue(value);

  if (parsed === undefined) return undefined;

  const allowedValues = Object.values(enumObject);

  if (!allowedValues.includes(parsed as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(", ")}`,
    );
  }

  return parsed as T;
};

const resolvePromotionRole = (req: Request): UserRole | undefined => {
  if (req.user?.role) {
    return req.user.role;
  }

  const requestedRole = parseOptionalEnum(req.query.role, UserRole, "role");
  return requestedRole === UserRole.ADMIN ? undefined : requestedRole;
};

const parseOptionalPositiveInt = (
  value: OriginCallbackData,
  fieldName: string,
  max = 100,
): number | undefined => {
  const parsed = getStringValue(value);

  if (parsed === undefined) return undefined;

  const numberValue = Number(parsed);

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    throw new ValidationError(`${fieldName} must be a positive integer`);
  }

  return Math.min(numberValue, max);
};

const parseOptionalBoolean = (
  value: OriginCallbackData,
  fieldName: string,
): boolean | undefined => {
  if (value === undefined || value === null || value === "") return undefined;

  if (typeof value === "boolean") return value;

  const parsed = getStringValue(value)?.toLowerCase();

  if (parsed === "true") return true;
  if (parsed === "false") return false;

  throw new ValidationError(`${fieldName} must be true or false`);
};

const parseOptionalDate = (
  value: OriginCallbackData,
  fieldName: string,
): Date | undefined => {
  const parsed = getStringValue(value);

  if (parsed === undefined) return undefined;

  const date = new Date(parsed);

  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`);
  }

  return date;
};

const parseTargetRoles = (
  value: OriginCallbackData,
  options: AdPayloadOptions,
): UserRole[] | undefined => {
  if (value === undefined || value === null || value === "") {
    return options.requireRequiredFields ? [] : undefined;
  }

  if (!Array.isArray(value)) {
    throw new ValidationError("targetRoles must be an array");
  }

  const invalidRole = value.find(
    (role) =>
      typeof role !== "string" ||
      !Object.values(UserRole).includes(role as UserRole),
  );

  if (invalidRole !== undefined) {
    throw new ValidationError(`Invalid target role: ${String(invalidRole)}`);
  }

  return value as UserRole[];
};

const validateAdSchedule = (startsAt?: Date, endsAt?: Date): void => {
  if (startsAt && endsAt && startsAt > endsAt) {
    throw new ValidationError("startsAt cannot be later than endsAt");
  }
};

const validateCtaUrl = (
  ctaUrl: string | undefined,
  destinationType: AdDestinationType | undefined,
): void => {
  if (!ctaUrl) return;

  if (destinationType === AdDestinationType.EXTERNAL) {
    try {
      const parsedUrl = new URL(ctaUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Unsupported protocol");
      }
    } catch {
      throw new ValidationError(
        "ctaUrl must be a valid HTTP or HTTPS URL for external ads",
      );
    }
  }
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
    body.destinationType,
    AdDestinationType,
    "destinationType",
  );

  const ctaUrl = options.requireRequiredFields
    ? parseRequiredString(body.ctaUrl, "ctaUrl")
    : parseOptionalString(body.ctaUrl, "ctaUrl");

  const startsAt = parseOptionalDate(body.startsAt, "startsAt");
  const endsAt = parseOptionalDate(body.endsAt, "endsAt");

  validateAdSchedule(startsAt, endsAt);
  validateCtaUrl(ctaUrl, destinationType);

  return {
    name: options.requireRequiredFields
      ? parseRequiredString(body.name, "name")
      : parseOptionalString(body.name, "name"),
    title: options.requireRequiredFields
      ? parseRequiredString(body.title, "title")
      : parseOptionalString(body.title, "title"),
    badge: parseOptionalString(body.badge, "badge"),
    description: options.requireRequiredFields
      ? parseRequiredString(body.description, "description")
      : parseOptionalString(body.description, "description"),
    supportingText: parseOptionalString(body.supportingText, "supportingText"),
    sponsorName: parseOptionalString(body.sponsorName, "sponsorName"),
    imageUrl: parseOptionalString(body.imageUrl, "imageUrl"),
    ctaLabel: options.requireRequiredFields
      ? parseRequiredString(body.ctaLabel, "ctaLabel")
      : parseOptionalString(body.ctaLabel, "ctaLabel"),
    ctaUrl,
    destinationType,
    openInNewTab: parseOptionalBoolean(body.openInNewTab, "openInNewTab"),
    placement: parseOptionalEnum(body.placement, AdPlacement, "placement"),
    status: parseOptionalEnum(body.status, AdStatus, "status"),
    theme: parseOptionalEnum(body.theme, AdTheme, "theme"),
    targetRoles: parseTargetRoles(body.targetRoles, options),
    startsAt,
    endsAt,
  };
}

const parseMoveDirection = (value: OriginCallbackData): AdMoveDirection => {
  const parsed = getStringValue(value);

  if (parsed === "up" || parsed === "down") {
    return parsed;
  }

  throw new ValidationError('direction must be "up" or "down"');
};

class AdsController {
  /**
   * Get active login promotions for the authenticated user's role.
   * GET /api/ads/login-promotions
   */
  getLoginPromotions = asyncHandler(async (req: Request, res: Response) => {
    const role = resolvePromotionRole(req);
    const items = await adsService.getLoginPromotions(role);

    sendSuccess(res, items);
  });

  /**
   * Get all ads for admin management.
   * GET /api/admin/ads
   */
  getAllAds = asyncHandler(async (req: Request, res: Response) => {
    const data = await adsService.getAdminAds({
      search: parseOptionalString(req.query.search, "search"),
      status: parseOptionalEnum(req.query.status, AdStatus, "status"),
      role: parseOptionalEnum(req.query.role, UserRole, "role"),
      placement: parseOptionalEnum(
        req.query.placement,
        AdPlacement,
        "placement",
      ),
      page: parseOptionalPositiveInt(req.query.page, "page"),
      limit: parseOptionalPositiveInt(req.query.limit, "limit"),
    });

    sendSuccess(res, data);
  });

  /**
   * Create a new ad.
   * POST /api/admin/ads
   */
  createAd = asyncHandler(async (req: Request, res: Response) => {
    const adminId = getAuthenticatedUserId(req);

    const ad = await adsService.createAd(
      parseAdPayload(req.body, { requireRequiredFields: true }),
      adminId,
    );

    sendSuccess(res, ad, "Ad created successfully", 201);
  });

  /**
   * Update an existing ad.
   * PUT /api/admin/ads/:id
   */
  updateAd = asyncHandler(async (req: Request, res: Response) => {
    const adminId = getAuthenticatedUserId(req);

    const ad = await adsService.updateAd(
      req.params.id,
      parseAdPayload(req.body),
      adminId,
    );

    sendSuccess(res, ad, "Ad updated successfully");
  });

  /**
   * Delete an ad.
   * DELETE /api/admin/ads/:id
   */
  deleteAd = asyncHandler(async (req: Request, res: Response) => {
    getAuthenticatedUserId(req);

    await adsService.deleteAd(req.params.id);

    sendSuccess(res, undefined, "Ad deleted successfully");
  });

  /**
   * Move an ad up or down in display order.
   * PUT /api/admin/ads/:id/move
   */
  moveAd = asyncHandler(async (req: Request, res: Response) => {
    const adminId = getAuthenticatedUserId(req);
    const direction = parseMoveDirection(req.body?.direction);

    const ad = await adsService.moveAd(req.params.id, direction, adminId);

    sendSuccess(res, ad, `Ad moved ${direction} successfully`);
  });
}

export default new AdsController();

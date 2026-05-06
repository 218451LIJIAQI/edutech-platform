import { Request, Response } from "express";
import communityService from "../services/community.service";
import asyncHandler from "../utils/async-handler";
import { AuthenticationError, BadRequestError } from "../utils/errors";

type FeedTab = "hot" | "new" | "weekly";
type CommunityTagInput = { id?: string; name?: string };
type CommunityMediaInput = { type: "image" | "video"; url: string };

const FEED_TABS: FeedTab[] = ["hot", "new", "weekly"];
const MAX_TITLE_LENGTH = 200;
const MIN_POST_CONTENT_LENGTH = 10;
const MAX_COMMENT_LENGTH = 1000;
const MAX_MEDIA_ITEMS = 10;
const MAX_TAGS = 5;

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

const getStringValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
};

const parseRequiredString = (value: unknown, fieldName: string): string => {
  const parsed = getStringValue(value);

  if (!parsed) {
    throw new BadRequestError(`${fieldName} is required`);
  }

  return parsed;
};

const parseOptionalString = (
  value: unknown,
  fieldName: string,
): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = getStringValue(value);

  if (!parsed) {
    throw new BadRequestError(`${fieldName} must be a non-empty string`);
  }

  return parsed;
};

const parsePositiveInteger = (
  value: unknown,
  fallback: number,
  fieldName: string,
  max = 100,
): number => {
  if (value === undefined || value === null || value === "") return fallback;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestError(`${fieldName} must be a positive integer`);
  }

  return Math.min(parsed, max);
};

const parsePagination = (query: Request["query"]) => ({
  page: parsePositiveInteger(query.page, 1, "page"),
  limit: parsePositiveInteger(query.limit, 10, "limit", 100),
});

const parseFeedTab = (value: unknown): FeedTab => {
  if (value === undefined || value === null || value === "") return "hot";

  const parsed = getStringValue(value);

  if (parsed && FEED_TABS.includes(parsed as FeedTab)) {
    return parsed as FeedTab;
  }

  throw new BadRequestError(`tab must be one of: ${FEED_TABS.join(", ")}`);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

const isCommunityTagInput = (value: unknown): value is CommunityTagInput => {
  if (!isPlainObject(value)) return false;

  const hasId = typeof value.id === "string" && value.id.trim().length > 0;
  const hasName =
    typeof value.name === "string" && value.name.trim().length > 0;

  return hasId || hasName;
};

const isCommunityMediaInput = (
  value: unknown,
): value is CommunityMediaInput => {
  if (!isPlainObject(value)) return false;

  return (
    (value.type === "image" || value.type === "video") &&
    typeof value.url === "string" &&
    value.url.trim().length > 0
  );
};

const parseTags = (value: unknown): CommunityTagInput[] | undefined => {
  if (value === undefined || value === null || value === "") return undefined;

  if (!Array.isArray(value)) {
    throw new BadRequestError("tags must be an array of tag objects");
  }

  if (value.length > MAX_TAGS) {
    throw new BadRequestError(
      `tags must not contain more than ${MAX_TAGS} items`,
    );
  }

  if (!value.every(isCommunityTagInput)) {
    throw new BadRequestError(
      "tags must contain valid tag objects with non-empty id or name",
    );
  }

  const seen = new Set<string>();
  const normalizedTags: CommunityTagInput[] = [];

  for (const tag of value) {
    const id = getStringValue(tag.id);
    const name = getStringValue(tag.name);
    const dedupeKey = id ? `id:${id}` : `name:${name?.toLowerCase()}`;

    if (!dedupeKey || seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalizedTags.push(id ? { id } : { name });
  }

  return normalizedTags;
};

const parseMedia = (value: unknown): CommunityMediaInput[] | undefined => {
  if (value === undefined || value === null || value === "") return undefined;

  if (!Array.isArray(value)) {
    throw new BadRequestError("media must be an array of media objects");
  }

  if (value.length > MAX_MEDIA_ITEMS) {
    throw new BadRequestError(
      `media must not contain more than ${MAX_MEDIA_ITEMS} items`,
    );
  }

  if (!value.every(isCommunityMediaInput)) {
    throw new BadRequestError(
      'media must contain valid media objects with type "image" or "video" and non-empty url',
    );
  }

  return value.map((item) => ({
    type: item.type,
    url: item.url.trim(),
  }));
};

const validatePostContent = (content: string): string => {
  const parsed = content.trim();

  if (parsed.length < MIN_POST_CONTENT_LENGTH) {
    throw new BadRequestError(
      `content must be at least ${MIN_POST_CONTENT_LENGTH} characters`,
    );
  }

  return parsed;
};

const validatePostTitle = (title?: string): string | undefined => {
  if (!title) return undefined;

  if (title.length > MAX_TITLE_LENGTH) {
    throw new BadRequestError(
      `title must not exceed ${MAX_TITLE_LENGTH} characters`,
    );
  }

  return title;
};

const validateCommentContent = (content: string): string => {
  const parsed = content.trim();

  if (parsed.length === 0) {
    throw new BadRequestError("comment content is required");
  }

  if (parsed.length > MAX_COMMENT_LENGTH) {
    throw new BadRequestError(
      `comment content must not exceed ${MAX_COMMENT_LENGTH} characters`,
    );
  }

  return parsed;
};

const communityController = {
  // ==================== TAGS ====================

  getTags: asyncHandler(async (_req: Request, res: Response) => {
    const tags = await communityService.getTags();

    sendSuccess(res, tags);
  }),

  addTag: asyncHandler(async (req: Request, res: Response) => {
    getAuthenticatedUserId(req);

    const name = parseRequiredString(req.body?.name, "tag name");

    const tag = await communityService.addTag(name);

    sendSuccess(res, tag, "Tag created successfully", 201);
  }),

  // ==================== POSTS ====================

  getFeed: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query);

    const result = await communityService.getFeed(
      {
        tab: parseFeedTab(req.query.tab),
        tag: parseOptionalString(req.query.tag, "tag"),
        page,
        limit,
      },
      req.user?.id,
    );

    sendSuccess(res, result);
  }),

  createPost: asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const title = validatePostTitle(
      parseOptionalString(req.body?.title, "title"),
    );

    const content = validatePostContent(
      parseRequiredString(req.body?.content, "content"),
    );

    const post = await communityService.createPost(
      {
        authorId: userId,
        title,
        content,
        tags: parseTags(req.body?.tags),
        media: parseMedia(req.body?.media),
        courseId: parseOptionalString(req.body?.courseId, "courseId"),
        courseTitle: parseOptionalString(req.body?.courseTitle, "courseTitle"),
      },
      userId,
    );

    sendSuccess(res, post, "Post created successfully", 201);
  }),

  getPostById: asyncHandler(async (req: Request, res: Response) => {
    const postId = parseRequiredString(req.params.id, "postId");

    const post = await communityService.getPostById(postId, req.user?.id);

    sendSuccess(res, post);
  }),

  likePost: asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const postId = parseRequiredString(req.params.id, "postId");

    const result = await communityService.likePost(postId, userId);

    sendSuccess(res, result);
  }),

  bookmarkPost: asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const postId = parseRequiredString(req.params.id, "postId");

    const result = await communityService.bookmarkPost(postId, userId);

    sendSuccess(res, result);
  }),

  // ==================== COMMENTS ====================

  getComments: asyncHandler(async (req: Request, res: Response) => {
    const postId = parseRequiredString(req.params.postId, "postId");
    const { page, limit } = parsePagination(req.query);

    const comments = await communityService.getComments(postId, page, limit);

    sendSuccess(res, comments);
  }),

  addComment: asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const postId = parseRequiredString(req.params.postId, "postId");

    const content = validateCommentContent(
      parseRequiredString(req.body?.content, "comment content"),
    );

    const comment = await communityService.addComment(postId, userId, content);

    sendSuccess(res, comment, "Comment added successfully", 201);
  }),

  // ==================== USERS ====================

  getUserProfile: asyncHandler(async (req: Request, res: Response) => {
    const userId = parseRequiredString(req.params.userId, "userId");

    const profile = await communityService.getUserProfile(userId, req.user?.id);

    sendSuccess(res, profile);
  }),

  getUserPosts: asyncHandler(async (req: Request, res: Response) => {
    const userId = parseRequiredString(req.params.userId, "userId");
    const { page, limit } = parsePagination(req.query);

    const result = await communityService.getUserPosts(
      userId,
      page,
      limit,
      req.user?.id,
    );

    sendSuccess(res, result);
  }),

  followUser: asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const targetUserId = parseRequiredString(
      req.params.targetUserId,
      "targetUserId",
    );

    if (targetUserId === userId) {
      throw new BadRequestError("You cannot follow yourself");
    }

    const result = await communityService.followUser(targetUserId, userId);

    sendSuccess(res, result);
  }),
};

export default communityController;

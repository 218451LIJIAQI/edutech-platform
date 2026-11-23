import { Request, Response } from "express";
import communityService from "../services/community.service";
import asyncHandler from "../utils/async-handler";
import { BadRequestError } from "../utils/errors";
import {
  parseOptionalEnum,
  parseOptionalString,
  parseQueryPositiveInt,
  parseRequiredParam,
  parseRequiredString,
  requireAuthUserId,
  sendCreated,
  sendSuccess,
} from "../utils/http";

type FeedTab = "hot" | "new" | "weekly";
type CommunityTagInput = { id?: string; name?: string };
type CommunityMediaInput = { type: "image" | "video"; url: string };

const FEED_TABS: readonly FeedTab[] = ["hot", "new", "weekly"] as const;
const MAX_TITLE_LENGTH = 200;
const MIN_POST_CONTENT_LENGTH = 10;
const MAX_COMMENT_LENGTH = 1000;
const MAX_MEDIA_ITEMS = 10;
const MAX_TAGS = 5;

const parsePagination = (query: Request["query"]) => ({
  page: parseQueryPositiveInt(query.page, "page", {
    fallback: 1,
    max: 100,
  }) as number,
  limit: parseQueryPositiveInt(query.limit, "limit", {
    fallback: 10,
    max: 100,
  }) as number,
});

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

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

  const seen = new Set<string>();
  const normalizedTags: CommunityTagInput[] = [];

  for (const tag of value) {
    if (!isPlainObject(tag)) {
      throw new BadRequestError(
        "tags must contain valid tag objects with non-empty id or name",
      );
    }

    const id = parseOptionalString(tag.id);
    const name = parseOptionalString(tag.name);
    if (!id && !name) {
      throw new BadRequestError(
        "tags must contain valid tag objects with non-empty id or name",
      );
    }

    const dedupeKey = id ? `id:${id}` : `name:${name?.toLowerCase()}`;
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      normalizedTags.push(id ? { id } : { name });
    }
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

  return value.map((item) => {
    if (
      !isPlainObject(item) ||
      (item.type !== "image" && item.type !== "video") ||
      typeof item.url !== "string" ||
      !item.url.trim()
    ) {
      throw new BadRequestError(
        'media must contain valid media objects with type "image" or "video" and non-empty url',
      );
    }

    return {
      type: item.type,
      url: item.url.trim(),
    };
  });
};

const communityController = {
  getTags: asyncHandler(async (_req: Request, res: Response) => {
    const tags = await communityService.getTags();
    sendSuccess(res, tags);
  }),

  addTag: asyncHandler(async (req: Request, res: Response) => {
    requireAuthUserId(req);
    const tag = await communityService.addTag(
      parseRequiredString(req.body?.name, "tag name"),
    );
    sendCreated(res, tag, "Tag created successfully");
  }),

  getFeed: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query);
    const result = await communityService.getFeed(
      {
        tab:
          parseOptionalEnum(req.query.tab, FEED_TABS, "tab") ?? "hot",
        tag: parseOptionalString(req.query.tag, "tag", { rejectBlank: false }),
        page,
        limit,
      },
      req.user?.id,
    );
    sendSuccess(res, result);
  }),

  createPost: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuthUserId(req);
    const post = await communityService.createPost(
      {
        authorId: userId,
        title: parseOptionalString(req.body?.title, "title", {
          maxLength: MAX_TITLE_LENGTH,
          rejectBlank: true,
        }),
        content: parseRequiredString(req.body?.content, "content", {
          minLength: MIN_POST_CONTENT_LENGTH,
        }),
        tags: parseTags(req.body?.tags),
        media: parseMedia(req.body?.media),
        courseId: parseOptionalString(req.body?.courseId, "courseId", {
          rejectBlank: true,
        }),
        courseTitle: parseOptionalString(req.body?.courseTitle, "courseTitle", {
          rejectBlank: true,
        }),
      },
      userId,
    );
    sendCreated(res, post, "Post created successfully");
  }),

  getPostById: asyncHandler(async (req: Request, res: Response) => {
    const post = await communityService.getPostById(
      parseRequiredParam(req.params.id, "postId"),
      req.user?.id,
    );
    sendSuccess(res, post);
  }),

  likePost: asyncHandler(async (req: Request, res: Response) => {
    const result = await communityService.likePost(
      parseRequiredParam(req.params.id, "postId"),
      requireAuthUserId(req),
    );
    sendSuccess(res, result);
  }),

  bookmarkPost: asyncHandler(async (req: Request, res: Response) => {
    const result = await communityService.bookmarkPost(
      parseRequiredParam(req.params.id, "postId"),
      requireAuthUserId(req),
    );
    sendSuccess(res, result);
  }),

  getComments: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query);
    const comments = await communityService.getComments(
      parseRequiredParam(req.params.postId, "postId"),
      page,
      limit,
    );
    sendSuccess(res, comments);
  }),

  addComment: asyncHandler(async (req: Request, res: Response) => {
    const comment = await communityService.addComment(
      parseRequiredParam(req.params.postId, "postId"),
      requireAuthUserId(req),
      parseRequiredString(req.body?.content, "comment content", {
        maxLength: MAX_COMMENT_LENGTH,
      }),
    );
    sendCreated(res, comment, "Comment added successfully");
  }),

  getUserProfile: asyncHandler(async (req: Request, res: Response) => {
    const profile = await communityService.getUserProfile(
      parseRequiredParam(req.params.userId, "userId"),
      req.user?.id,
    );
    sendSuccess(res, profile);
  }),

  getUserPosts: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query);
    const result = await communityService.getUserPosts(
      parseRequiredParam(req.params.userId, "userId"),
      page,
      limit,
      req.user?.id,
    );
    sendSuccess(res, result);
  }),

  followUser: asyncHandler(async (req: Request, res: Response) => {
    const userId = requireAuthUserId(req);
    const targetUserId = parseRequiredParam(
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

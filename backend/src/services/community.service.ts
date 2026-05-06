import { Prisma } from "@prisma/client";

import prisma from "../config/database";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";

type CommunityFeedTab = "hot" | "new" | "weekly";
type CreatePostTagInput = { id?: string; name?: string };
type CreatePostMediaInput = { type: "image" | "video"; url: string };

const MIN_POST_CONTENT_LENGTH = 10;
const MAX_POST_TITLE_LENGTH = 200;
const MAX_POST_CONTENT_LENGTH = 2000;
const MAX_COMMENT_CONTENT_LENGTH = 1000;
const MAX_TAG_NAME_LENGTH = 50;
const MAX_TAGS_PER_POST = 5;
const MAX_MEDIA_ITEMS = 10;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const RESTRICTED_POST_TERMS = ["politics", "violence", "hate", "porn"] as const;
const IMAGE_URL_PATTERN =
  /\.(png|jpe?g|gif|webp|avif|bmp|svg|heic|heif)(\?.*)?$/i;
const DIRECT_VIDEO_URL_PATTERN = /\.(mp4|webm|m3u8|mov|ogg)(\?.*)?$/i;
const COMMUNITY_IMAGE_UPLOAD_PATH_PATTERN =
  /^\/uploads\/community-images\/[a-z0-9/_-]+\.[a-z0-9]+(?:\?.*)?$/i;
const COMMUNITY_VIDEO_UPLOAD_PATH_PATTERN =
  /^\/uploads\/videos\/[a-z0-9/_-]+\.[a-z0-9]+(?:\?.*)?$/i;
const TAG_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}-]*$/u;

const ALLOWED_VIDEO_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
  "vimeo.com",
  "player.vimeo.com",
  "dailymotion.com",
  "dai.ly",
]);

const normalizeText = (value?: string): string | undefined => {
  const normalized =
    value === undefined ? undefined : sanitizeUserPlainText(value);
  return normalized || undefined;
};

const normalizePagination = (
  page?: number,
  limit?: number,
): { page: number; limit: number; skip: number } => {
  const safePage = Math.max(
    DEFAULT_PAGE,
    Math.trunc(Number(page) || DEFAULT_PAGE),
  );
  const safeLimit = Math.min(
    Math.max(Math.trunc(Number(limit) || DEFAULT_LIMIT), 1),
    MAX_LIMIT,
  );

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const normalizeTagName = (name: string): string =>
  name.trim().replace(/^#+/, "").trim().replace(/\s+/g, "-").toLowerCase();

const validateTagName = (name: string): void => {
  if (!name) {
    throw new BadRequestError("Tag name is required");
  }

  if (name.length > MAX_TAG_NAME_LENGTH) {
    throw new BadRequestError(
      `Tag name must not exceed ${MAX_TAG_NAME_LENGTH} characters`,
    );
  }

  if (!TAG_NAME_PATTERN.test(name)) {
    throw new BadRequestError(
      "Tag name may contain only letters, numbers, and hyphens, and must start with a letter or number",
    );
  }
};

const containsRestrictedPostTerms = (
  ...values: Array<string | undefined>
): boolean => {
  const combined = values
    .map((value) => value?.trim().toLowerCase() || "")
    .filter(Boolean)
    .join(" ");

  return RESTRICTED_POST_TERMS.some((term) => {
    const pattern = new RegExp(`(^|\\W)${term}(\\W|$)`, "i");
    return pattern.test(combined);
  });
};

const isRelativeUploadPath = (
  type: CreatePostMediaInput["type"],
  value: string,
): boolean => {
  if (!value.startsWith("/")) {
    return false;
  }

  return type === "image"
    ? COMMUNITY_IMAGE_UPLOAD_PATH_PATTERN.test(value)
    : COMMUNITY_VIDEO_UPLOAD_PATH_PATTERN.test(value);
};

const normalizeHostname = (hostname: string): string =>
  hostname
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");

const hasEmbeddableYouTubeVideoId = (parsedUrl: URL): boolean => {
  const hostname = normalizeHostname(parsedUrl.hostname);
  const segments = parsedUrl.pathname.split("/").filter(Boolean);

  if (hostname === "youtu.be") {
    return Boolean(segments[0]);
  }

  if (parsedUrl.pathname === "/watch") {
    return Boolean(parsedUrl.searchParams.get("v"));
  }

  return (
    (segments[0] === "embed" || segments[0] === "shorts") &&
    Boolean(segments[1])
  );
};

const hasEmbeddableVimeoVideoId = (parsedUrl: URL): boolean => {
  const hostname = normalizeHostname(parsedUrl.hostname);
  const segments = parsedUrl.pathname.split("/").filter(Boolean);
  const candidate =
    hostname === "player.vimeo.com" && segments[0] === "video"
      ? segments[1]
      : segments[segments.length - 1];

  return Boolean(candidate && /^\d+$/.test(candidate));
};

const hasEmbeddableDailymotionVideoId = (parsedUrl: URL): boolean => {
  const hostname = normalizeHostname(parsedUrl.hostname);
  const segments = parsedUrl.pathname.split("/").filter(Boolean);
  const candidate =
    hostname === "dai.ly"
      ? segments[0]
      : segments[0] === "video"
        ? segments[1]?.split("_")[0]
        : "";

  return Boolean(candidate);
};

const isAllowedCommunityMediaUrl = (
  type: CreatePostMediaInput["type"],
  rawUrl: string,
): boolean => {
  const url = rawUrl.trim();
  if (!url) {
    return false;
  }

  if (isRelativeUploadPath(type, url)) {
    return type === "image"
      ? IMAGE_URL_PATTERN.test(url)
      : DIRECT_VIDEO_URL_PATTERN.test(url);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return false;
  }

  if (type === "image") {
    return IMAGE_URL_PATTERN.test(url);
  }

  const normalizedHostname = normalizeHostname(parsedUrl.hostname);
  if (
    ALLOWED_VIDEO_HOSTS.has(normalizedHostname) &&
    ((["youtube.com", "m.youtube.com", "youtu.be"].includes(
      normalizedHostname,
    ) &&
      hasEmbeddableYouTubeVideoId(parsedUrl)) ||
      (["vimeo.com", "player.vimeo.com"].includes(normalizedHostname) &&
        hasEmbeddableVimeoVideoId(parsedUrl)) ||
      (["dailymotion.com", "dai.ly"].includes(normalizedHostname) &&
        hasEmbeddableDailymotionVideoId(parsedUrl)))
  ) {
    return true;
  }

  return DIRECT_VIDEO_URL_PATTERN.test(url);
};

const normalizePostMedia = (
  media: CreatePostMediaInput[] | undefined,
): CreatePostMediaInput[] | undefined => {
  if (!media || media.length === 0) {
    return undefined;
  }

  if (!Array.isArray(media)) {
    throw new BadRequestError("Media must be provided as an array");
  }

  if (media.length > MAX_MEDIA_ITEMS) {
    throw new BadRequestError(
      `A post can include up to ${MAX_MEDIA_ITEMS} media items`,
    );
  }

  const seen = new Set<string>();
  const normalizedMedia: CreatePostMediaInput[] = [];

  for (const item of media) {
    if (
      !item ||
      !["image", "video"].includes(item.type) ||
      typeof item.url !== "string"
    ) {
      throw new BadRequestError(
        "Each media item must include a valid type and URL",
      );
    }

    const normalizedUrl = item.url.trim();
    if (!isAllowedCommunityMediaUrl(item.type, normalizedUrl)) {
      throw new BadRequestError(
        `Invalid ${item.type} URL provided for community post media`,
      );
    }

    const dedupeKey = `${item.type}:${normalizedUrl.toLowerCase()}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalizedMedia.push({
      type: item.type,
      url: normalizedUrl,
    });
  }

  return normalizedMedia.length > 0 ? normalizedMedia : undefined;
};

const normalizeTagInputs = (
  tags: CreatePostTagInput[] | undefined,
): Array<{ id?: string; name?: string }> => {
  if (!tags || tags.length === 0) {
    return [];
  }

  if (!Array.isArray(tags)) {
    throw new BadRequestError("Tags must be provided as an array");
  }

  const seen = new Set<string>();
  const normalizedTags: Array<{ id?: string; name?: string }> = [];

  for (const tag of tags) {
    if (!tag || typeof tag !== "object") {
      throw new BadRequestError("Each tag must include a valid ID or name");
    }

    const id = typeof tag.id === "string" ? tag.id.trim() : "";
    const name = typeof tag.name === "string" ? normalizeTagName(tag.name) : "";

    if (!id && !name) {
      throw new BadRequestError("Each tag must include a valid ID or name");
    }

    if (name) {
      validateTagName(name);
    }

    const dedupeKey = id ? `id:${id}` : `name:${name}`;

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalizedTags.push(id ? { id } : { name });
  }

  return normalizedTags;
};

const resolvePostTagIds = async (
  tags: CreatePostTagInput[] | undefined,
): Promise<string[]> => {
  const normalizedTags = normalizeTagInputs(tags);

  if (normalizedTags.length === 0) {
    return [];
  }

  if (normalizedTags.length > MAX_TAGS_PER_POST) {
    throw new BadRequestError(
      `A post can include up to ${MAX_TAGS_PER_POST} tags`,
    );
  }

  const resolvedTagIds: string[] = [];

  for (const tag of normalizedTags) {
    if (tag.id) {
      const existingById = await prisma.communityTag.findUnique({
        where: {
          id: tag.id,
        },
        select: {
          id: true,
        },
      });

      if (existingById) {
        resolvedTagIds.push(existingById.id);
        continue;
      }

      if (!tag.name) {
        throw new NotFoundError("One or more selected tags were not found");
      }
    }

    const name = tag.name;
    if (!name) {
      continue;
    }

    const existing = await prisma.communityTag.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      resolvedTagIds.push(existing.id);
      continue;
    }

    try {
      const created = await prisma.communityTag.create({
        data: { name },
        select: {
          id: true,
        },
      });

      resolvedTagIds.push(created.id);
    } catch (error) {
      if (!isPrismaKnownError(error, "P2002")) {
        throw error;
      }

      const racedTag = await prisma.communityTag.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
        },
      });

      if (!racedTag) {
        throw error;
      }

      resolvedTagIds.push(racedTag.id);
    }
  }

  return Array.from(new Set(resolvedTagIds));
};

const resolveLinkedCourse = async (
  courseId?: string,
  courseTitle?: string,
): Promise<{ courseId?: string; courseTitle?: string }> => {
  const normalizedCourseId = normalizeText(courseId);
  const normalizedCourseTitle = normalizeText(courseTitle);

  if (!normalizedCourseId && !normalizedCourseTitle) {
    return {};
  }

  if (!normalizedCourseId) {
    throw new BadRequestError("A linked course must include a valid course ID");
  }

  const course = await prisma.course.findFirst({
    where: {
      id: normalizedCourseId,
      isPublished: true,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!course) {
    throw new NotFoundError("Linked course not found");
  }

  if (
    normalizedCourseTitle &&
    normalizedCourseTitle.localeCompare(course.title, undefined, {
      sensitivity: "accent",
    }) !== 0
  ) {
    throw new BadRequestError(
      "Linked course title does not match the selected course",
    );
  }

  return {
    courseId: course.id,
    courseTitle: course.title,
  };
};

const isPrismaKnownError = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

const communityService = {
  // ==================== TAGS ====================
  async getTags() {
    return prisma.communityTag.findMany({
      orderBy: { name: "asc" },
    });
  },

  async addTag(name: string) {
    const normalized = normalizeTagName(name || "");
    validateTagName(normalized);

    const existing = await prisma.communityTag.findFirst({
      where: {
        name: {
          equals: normalized,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return existing;
    }

    return prisma.communityTag.create({
      data: { name: normalized },
    });
  },

  // ==================== POSTS ====================
  async getFeed(
    params: {
      tab?: CommunityFeedTab;
      tag?: string;
      page?: number;
      limit?: number;
    },
    userId?: string,
  ) {
    const { page, limit, skip } = normalizePagination(
      params.page,
      params.limit,
    );
    const where: Prisma.CommunityPostWhereInput = {};

    const normalizedTag = params.tag ? normalizeTagName(params.tag) : undefined;
    if (normalizedTag) {
      validateTagName(normalizedTag);
      where.tags = {
        some: {
          tag: {
            name: {
              equals: normalizedTag,
              mode: "insensitive",
            },
          },
        },
      };
    }

    if (params.tab === "weekly") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      where.createdAt = { gte: sevenDaysAgo };
    }

    const orderBy: Prisma.CommunityPostOrderByWithRelationInput[] =
      params.tab === "hot"
        ? [
            { likes: "desc" },
            { bookmarks: "desc" },
            { commentsCount: "desc" },
            { createdAt: "desc" },
          ]
        : [{ createdAt: "desc" }];

    const [items, total] = await Promise.all([
      prisma.communityPost.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          media: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.communityPost.count({ where }),
    ]);

    const postIds = items.map((item) => item.id);
    const [likes, bookmarks] =
      userId && postIds.length > 0
        ? await Promise.all([
            prisma.communityPostLike.findMany({
              where: {
                userId,
                postId: { in: postIds },
              },
              select: { postId: true },
            }),
            prisma.communityPostBookmark.findMany({
              where: {
                userId,
                postId: { in: postIds },
              },
              select: { postId: true },
            }),
          ])
        : [[], []];

    const likedPostIds = new Set(likes.map((item) => item.postId));
    const bookmarkedPostIds = new Set(bookmarks.map((item) => item.postId));

    return {
      items: items.map((post) => ({
        ...post,
        tags: post.tags.map((tagLink) => tagLink.tag),
        hasLiked: likedPostIds.has(post.id),
        hasBookmarked: bookmarkedPostIds.has(post.id),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async createPost(
    input: {
      authorId: string;
      title?: string;
      content: string;
      tags?: CreatePostTagInput[];
      media?: CreatePostMediaInput[];
      courseId?: string;
      courseTitle?: string;
    },
    userId: string,
  ) {
    const authorId = input.authorId?.trim();
    const authenticatedUserId = userId?.trim();

    if (!authorId || !authenticatedUserId || authorId !== authenticatedUserId) {
      throw new BadRequestError("Cannot create post for another user");
    }

    const normalizedTitle = normalizeText(input.title);
    const normalizedContent = normalizeText(input.content);

    if (!normalizedContent) {
      throw new BadRequestError("Content is required");
    }

    if (normalizedContent.length < MIN_POST_CONTENT_LENGTH) {
      throw new BadRequestError(
        `Content must be at least ${MIN_POST_CONTENT_LENGTH} characters`,
      );
    }

    if (normalizedContent.length > MAX_POST_CONTENT_LENGTH) {
      throw new BadRequestError(
        `Content must not exceed ${MAX_POST_CONTENT_LENGTH} characters`,
      );
    }

    if (normalizedTitle && normalizedTitle.length > MAX_POST_TITLE_LENGTH) {
      throw new BadRequestError(
        `Title must not exceed ${MAX_POST_TITLE_LENGTH} characters`,
      );
    }

    if (containsRestrictedPostTerms(normalizedTitle, normalizedContent)) {
      throw new BadRequestError(
        "Content contains restricted words, please revise and try again",
      );
    }

    const normalizedTagIds = await resolvePostTagIds(input.tags);
    const normalizedMedia = normalizePostMedia(input.media);
    const linkedCourse = await resolveLinkedCourse(
      input.courseId,
      input.courseTitle,
    );

    const post = await prisma.communityPost.create({
      data: {
        authorId,
        title: normalizedTitle,
        content: normalizedContent,
        courseId: linkedCourse.courseId,
        courseTitle: linkedCourse.courseTitle,
        tags:
          normalizedTagIds.length > 0
            ? {
                create: normalizedTagIds.map((tagId) => ({
                  tag: {
                    connect: { id: tagId },
                  },
                })),
              }
            : undefined,
        media:
          normalizedMedia && normalizedMedia.length > 0
            ? {
                create: normalizedMedia.map((item) => ({
                  type: item.type,
                  url: item.url,
                })),
              }
            : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        media: true,
      },
    });

    return {
      ...post,
      tags: post.tags.map((tagLink) => tagLink.tag),
      likes: post.likes,
      bookmarks: post.bookmarks,
      hasLiked: false,
      hasBookmarked: false,
    };
  },

  async getPostById(id: string, userId?: string) {
    const postId = id?.trim();
    if (!postId) {
      throw new BadRequestError("Post ID is required");
    }

    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        media: true,
      },
    });

    if (!post) {
      throw new NotFoundError("Post not found");
    }

    let hasLiked = false;
    let hasBookmarked = false;

    if (userId) {
      const [like, bookmark] = await Promise.all([
        prisma.communityPostLike.findUnique({
          where: {
            postId_userId: { postId, userId },
          },
        }),
        prisma.communityPostBookmark.findUnique({
          where: {
            postId_userId: { postId, userId },
          },
        }),
      ]);

      hasLiked = Boolean(like);
      hasBookmarked = Boolean(bookmark);
    }

    return {
      ...post,
      tags: post.tags.map((tagLink) => tagLink.tag),
      hasLiked,
      hasBookmarked,
    };
  },

  async likePost(postId: string, userId: string) {
    const normalizedPostId = postId?.trim();
    const normalizedUserId = userId?.trim();

    if (!normalizedPostId || !normalizedUserId) {
      throw new BadRequestError("Post ID and user ID are required");
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const post = await tx.communityPost.findUnique({
          where: { id: normalizedPostId },
          select: { id: true },
        });

        if (!post) {
          throw new NotFoundError("Post not found");
        }

        const existingLike = await tx.communityPostLike.findUnique({
          where: {
            postId_userId: {
              postId: normalizedPostId,
              userId: normalizedUserId,
            },
          },
        });

        if (existingLike) {
          await tx.communityPostLike.delete({
            where: {
              postId_userId: {
                postId: normalizedPostId,
                userId: normalizedUserId,
              },
            },
          });

          await tx.communityPost.updateMany({
            where: {
              id: normalizedPostId,
              likes: { gt: 0 },
            },
            data: {
              likes: { decrement: 1 },
            },
          });

          const updatedPost = await tx.communityPost.findUnique({
            where: { id: normalizedPostId },
            select: { likes: true },
          });

          return {
            likes: updatedPost?.likes ?? 0,
            hasLiked: false,
          };
        }

        await tx.communityPostLike.create({
          data: {
            postId: normalizedPostId,
            userId: normalizedUserId,
          },
        });

        const updatedPost = await tx.communityPost.update({
          where: { id: normalizedPostId },
          data: {
            likes: { increment: 1 },
          },
          select: { likes: true },
        });

        return {
          likes: updatedPost.likes,
          hasLiked: true,
        };
      });
    } catch (error) {
      if (isPrismaKnownError(error, "P2002")) {
        const updatedPost = await prisma.communityPost.findUnique({
          where: { id: normalizedPostId },
          select: { likes: true },
        });

        return {
          likes: updatedPost?.likes ?? 0,
          hasLiked: true,
        };
      }

      if (isPrismaKnownError(error, "P2025")) {
        const updatedPost = await prisma.communityPost.findUnique({
          where: { id: normalizedPostId },
          select: { likes: true },
        });

        return {
          likes: updatedPost?.likes ?? 0,
          hasLiked: false,
        };
      }

      throw error;
    }
  },

  async bookmarkPost(postId: string, userId: string) {
    const normalizedPostId = postId?.trim();
    const normalizedUserId = userId?.trim();

    if (!normalizedPostId || !normalizedUserId) {
      throw new BadRequestError("Post ID and user ID are required");
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const post = await tx.communityPost.findUnique({
          where: { id: normalizedPostId },
          select: { id: true },
        });

        if (!post) {
          throw new NotFoundError("Post not found");
        }

        const existingBookmark = await tx.communityPostBookmark.findUnique({
          where: {
            postId_userId: {
              postId: normalizedPostId,
              userId: normalizedUserId,
            },
          },
        });

        if (existingBookmark) {
          await tx.communityPostBookmark.delete({
            where: {
              postId_userId: {
                postId: normalizedPostId,
                userId: normalizedUserId,
              },
            },
          });

          await tx.communityPost.updateMany({
            where: {
              id: normalizedPostId,
              bookmarks: { gt: 0 },
            },
            data: {
              bookmarks: { decrement: 1 },
            },
          });

          const updatedPost = await tx.communityPost.findUnique({
            where: { id: normalizedPostId },
            select: { bookmarks: true },
          });

          return {
            bookmarks: updatedPost?.bookmarks ?? 0,
            hasBookmarked: false,
          };
        }

        await tx.communityPostBookmark.create({
          data: {
            postId: normalizedPostId,
            userId: normalizedUserId,
          },
        });

        const updatedPost = await tx.communityPost.update({
          where: { id: normalizedPostId },
          data: {
            bookmarks: { increment: 1 },
          },
          select: { bookmarks: true },
        });

        return {
          bookmarks: updatedPost.bookmarks,
          hasBookmarked: true,
        };
      });
    } catch (error) {
      if (isPrismaKnownError(error, "P2002")) {
        const updatedPost = await prisma.communityPost.findUnique({
          where: { id: normalizedPostId },
          select: { bookmarks: true },
        });

        return {
          bookmarks: updatedPost?.bookmarks ?? 0,
          hasBookmarked: true,
        };
      }

      if (isPrismaKnownError(error, "P2025")) {
        const updatedPost = await prisma.communityPost.findUnique({
          where: { id: normalizedPostId },
          select: { bookmarks: true },
        });

        return {
          bookmarks: updatedPost?.bookmarks ?? 0,
          hasBookmarked: false,
        };
      }

      throw error;
    }
  },

  // ==================== COMMENTS ====================
  async getComments(
    postId: string,
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
  ) {
    const normalizedPostId = postId?.trim();
    if (!normalizedPostId) {
      throw new BadRequestError("Post ID is required");
    }

    const {
      page: safePage,
      limit: safeLimit,
      skip,
    } = normalizePagination(page, limit);

    const post = await prisma.communityPost.findUnique({
      where: { id: normalizedPostId },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundError("Post not found");
    }

    const [items, total] = await Promise.all([
      prisma.communityComment.findMany({
        where: { postId: normalizedPostId },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: safeLimit,
      }),
      prisma.communityComment.count({
        where: { postId: normalizedPostId },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    };
  },

  async addComment(postId: string, userId: string, content: string) {
    const normalizedPostId = postId?.trim();
    const normalizedUserId = userId?.trim();
    const normalizedContent = normalizeText(content);

    if (!normalizedPostId || !normalizedUserId) {
      throw new BadRequestError("Post ID and user ID are required");
    }

    if (!normalizedContent) {
      throw new BadRequestError("Comment content is required");
    }

    if (normalizedContent.length > MAX_COMMENT_CONTENT_LENGTH) {
      throw new BadRequestError(
        `Comment must not exceed ${MAX_COMMENT_CONTENT_LENGTH} characters`,
      );
    }

    if (containsRestrictedPostTerms(normalizedContent)) {
      throw new BadRequestError(
        "Comment contains restricted words, please revise and try again",
      );
    }

    return prisma.$transaction(async (tx) => {
      const post = await tx.communityPost.findUnique({
        where: { id: normalizedPostId },
        select: { id: true },
      });

      if (!post) {
        throw new NotFoundError("Post not found");
      }

      const comment = await tx.communityComment.create({
        data: {
          postId: normalizedPostId,
          authorId: normalizedUserId,
          content: normalizedContent,
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });

      await tx.communityPost.update({
        where: { id: normalizedPostId },
        data: { commentsCount: { increment: 1 } },
      });

      return comment;
    });
  },

  // ==================== USERS ====================
  async getUserProfile(userId: string, currentUserId?: string) {
    const normalizedUserId = userId?.trim();
    const normalizedCurrentUserId = currentUserId?.trim();

    if (!normalizedUserId) {
      throw new BadRequestError("User ID is required");
    }

    const user = await prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new NotFoundError("User not found");
    }

    const [followers, following, isFollowing] = await Promise.all([
      prisma.communityFollowing.count({
        where: { followingId: normalizedUserId },
      }),
      prisma.communityFollowing.count({
        where: { followerId: normalizedUserId },
      }),
      normalizedCurrentUserId
        ? prisma.communityFollowing.findUnique({
            where: {
              followerId_followingId: {
                followerId: normalizedCurrentUserId,
                followingId: normalizedUserId,
              },
            },
          })
        : null,
    ]);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      followers,
      following,
      isFollowing: Boolean(isFollowing),
      badges: ["Beginner"],
    };
  },

  async getUserPosts(
    userId: string,
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    currentUserId?: string,
  ) {
    const normalizedUserId = userId?.trim();
    const normalizedCurrentUserId = currentUserId?.trim();

    if (!normalizedUserId) {
      throw new BadRequestError("User ID is required");
    }

    const user = await prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new NotFoundError("User not found");
    }

    const {
      page: safePage,
      limit: safeLimit,
      skip,
    } = normalizePagination(page, limit);

    const [items, total] = await Promise.all([
      prisma.communityPost.findMany({
        where: { authorId: normalizedUserId },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          media: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
      }),
      prisma.communityPost.count({ where: { authorId: normalizedUserId } }),
    ]);

    const postIds = items.map((item) => item.id);
    const [likes, bookmarks] =
      normalizedCurrentUserId && postIds.length > 0
        ? await Promise.all([
            prisma.communityPostLike.findMany({
              where: {
                userId: normalizedCurrentUserId,
                postId: { in: postIds },
              },
              select: { postId: true },
            }),
            prisma.communityPostBookmark.findMany({
              where: {
                userId: normalizedCurrentUserId,
                postId: { in: postIds },
              },
              select: { postId: true },
            }),
          ])
        : [[], []];

    const likedPostIds = new Set(likes.map((item) => item.postId));
    const bookmarkedPostIds = new Set(bookmarks.map((item) => item.postId));

    return {
      items: items.map((post) => ({
        ...post,
        tags: post.tags.map((tagLink) => tagLink.tag),
        hasLiked: likedPostIds.has(post.id),
        hasBookmarked: bookmarkedPostIds.has(post.id),
      })),
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    };
  },

  async followUser(targetUserId: string, userId: string) {
    const normalizedTargetUserId = targetUserId?.trim();
    const normalizedUserId = userId?.trim();

    if (!normalizedTargetUserId || !normalizedUserId) {
      throw new BadRequestError("Target user ID and user ID are required");
    }

    if (normalizedTargetUserId === normalizedUserId) {
      throw new BadRequestError("Cannot follow yourself");
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const targetUser = await tx.user.findUnique({
          where: { id: normalizedTargetUserId },
          select: { id: true, isActive: true },
        });

        if (!targetUser || !targetUser.isActive) {
          throw new NotFoundError("User not found");
        }

        const existingFollow = await tx.communityFollowing.findUnique({
          where: {
            followerId_followingId: {
              followerId: normalizedUserId,
              followingId: normalizedTargetUserId,
            },
          },
        });

        if (existingFollow) {
          await tx.communityFollowing.delete({
            where: {
              followerId_followingId: {
                followerId: normalizedUserId,
                followingId: normalizedTargetUserId,
              },
            },
          });

          const followers = await tx.communityFollowing.count({
            where: { followingId: normalizedTargetUserId },
          });

          return {
            isFollowing: false,
            followers,
          };
        }

        await tx.communityFollowing.create({
          data: {
            followerId: normalizedUserId,
            followingId: normalizedTargetUserId,
          },
        });

        const followers = await tx.communityFollowing.count({
          where: { followingId: normalizedTargetUserId },
        });

        return {
          isFollowing: true,
          followers,
        };
      });
    } catch (error) {
      if (isPrismaKnownError(error, "P2002")) {
        const followers = await prisma.communityFollowing.count({
          where: { followingId: normalizedTargetUserId },
        });

        return {
          isFollowing: true,
          followers,
        };
      }

      if (isPrismaKnownError(error, "P2025")) {
        const followers = await prisma.communityFollowing.count({
          where: { followingId: normalizedTargetUserId },
        });

        return {
          isFollowing: false,
          followers,
        };
      }

      throw error;
    }
  },
};

export default communityService;

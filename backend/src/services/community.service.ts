import { PrismaClient } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../utils/errors';

const prisma = new PrismaClient();

export const communityService = {
  // ==================== TAGS ====================
  async getTags() {
    return prisma.communityTag.findMany({
      orderBy: { name: 'asc' },
    });
  },

  async addTag(name: string) {
    const existing = await prisma.communityTag.findUnique({
      where: { name },
    });
    if (existing) return existing;

    return prisma.communityTag.create({
      data: { name },
    });
  },

  // ==================== POSTS ====================
  async getFeed(params: {
    tab?: 'hot' | 'new' | 'weekly';
    tag?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.tag) {
      where.tags = {
        some: {
          tag: {
            name: params.tag,
          },
        },
      };
    }

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
        orderBy:
          params.tab === 'hot'
            ? [
                { likes: 'desc' },
                { bookmarks: 'desc' },
                { commentsCount: 'desc' },
              ]
            : { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.communityPost.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        ...p,
        tags: p.tags.map((t) => t.tag),
        hasLiked: false,
        hasBookmarked: false,
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
      tags?: any[];
      media?: any[];
      courseId?: string;
      courseTitle?: string;
    },
    userId: string
  ) {
    if (input.authorId !== userId) {
      throw new BadRequestError('Cannot create post for another user');
    }

    // Validate tags exist
    if (input.tags && input.tags.length > 0) {
      for (const tag of input.tags) {
        const existingTag = await prisma.communityTag.findUnique({
          where: { id: tag.id },
        });
        if (!existingTag) {
          throw new NotFoundError(`Tag ${tag.id} not found`);
        }
      }
    }

    const post = await prisma.communityPost.create({
      data: {
        authorId: input.authorId,
        title: input.title,
        content: input.content,
        courseId: input.courseId,
        courseTitle: input.courseTitle,
        tags: input.tags && input.tags.length > 0
          ? {
              create: input.tags.map((tag) => ({
                tag: {
                  connect: { id: tag.id },
                },
              })),
            }
          : undefined,
        media: input.media && input.media.length > 0
          ? {
              create: input.media.map((m) => ({
                type: m.type,
                url: m.url,
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
      tags: post.tags.map((t) => t.tag),
      likes: 0,
      bookmarks: 0,
      hasLiked: false,
      hasBookmarked: false,
    };
  },

  async getPostById(id: string, userId?: string) {
    const post = await prisma.communityPost.findUnique({
      where: { id },
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
      throw new NotFoundError('Post not found');
    }

    let hasLiked = false;
    let hasBookmarked = false;

    if (userId) {
      const [like, bookmark] = await Promise.all([
        prisma.communityPostLike.findUnique({
          where: {
            postId_userId: { postId: id, userId },
          },
        }),
        prisma.communityPostBookmark.findUnique({
          where: {
            postId_userId: { postId: id, userId },
          },
        }),
      ]);
      hasLiked = !!like;
      hasBookmarked = !!bookmark;
    }

    return {
      ...post,
      tags: post.tags.map((t) => t.tag),
      hasLiked,
      hasBookmarked,
    };
  },

  async likePost(postId: string, userId: string) {
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    const existingLike = await prisma.communityPostLike.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    if (existingLike) {
      await prisma.communityPostLike.delete({
        where: {
          postId_userId: { postId, userId },
        },
      });
      await prisma.communityPost.update({
        where: { id: postId },
        data: { likes: { decrement: 1 } },
      });
      return { likes: post.likes - 1, hasLiked: false };
    } else {
      await prisma.communityPostLike.create({
        data: { postId, userId },
      });
      await prisma.communityPost.update({
        where: { id: postId },
        data: { likes: { increment: 1 } },
      });
      return { likes: post.likes + 1, hasLiked: true };
    }
  },

  async bookmarkPost(postId: string, userId: string) {
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    const existingBookmark = await prisma.communityPostBookmark.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    if (existingBookmark) {
      await prisma.communityPostBookmark.delete({
        where: {
          postId_userId: { postId, userId },
        },
      });
      await prisma.communityPost.update({
        where: { id: postId },
        data: { bookmarks: { decrement: 1 } },
      });
      return { bookmarks: post.bookmarks - 1, hasBookmarked: false };
    } else {
      await prisma.communityPostBookmark.create({
        data: { postId, userId },
      });
      await prisma.communityPost.update({
        where: { id: postId },
        data: { bookmarks: { increment: 1 } },
      });
      return { bookmarks: post.bookmarks + 1, hasBookmarked: true };
    }
  },

  // ==================== COMMENTS ====================
  async getComments(postId: string) {
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    return prisma.communityComment.findMany({
      where: { postId },
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
      orderBy: { createdAt: 'asc' },
    });
  },

  async addComment(postId: string, userId: string, content: string) {
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    const comment = await prisma.communityComment.create({
      data: {
        postId,
        authorId: userId,
        content,
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

    await prisma.communityPost.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    return comment;
  },

  // ==================== USERS ====================
  async getUserProfile(userId: string, currentUserId?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const [followers, following, isFollowing] = await Promise.all([
      prisma.communityFollowing.count({
        where: { followingId: userId },
      }),
      prisma.communityFollowing.count({
        where: { followerId: userId },
      }),
      currentUserId
        ? prisma.communityFollowing.findUnique({
            where: {
              followerId_followingId: {
                followerId: currentUserId,
                followingId: userId,
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
      isFollowing: !!isFollowing,
      badges: ['Beginner'],
    };
  },

  async getUserPosts(userId: string, page = 1, limit = 10) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const [items, total] = await Promise.all([
      prisma.communityPost.findMany({
        where: { authorId: userId },
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
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.communityPost.count({ where: { authorId: userId } }),
    ]);

    return {
      items: items.map((p) => ({
        ...p,
        tags: p.tags.map((t) => t.tag),
        hasLiked: false,
        hasBookmarked: false,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async followUser(targetUserId: string, userId: string) {
    if (targetUserId === userId) {
      throw new BadRequestError('Cannot follow yourself');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    const existingFollow = await prisma.communityFollowing.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      await prisma.communityFollowing.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
      });
      const followers = await prisma.communityFollowing.count({
        where: { followingId: targetUserId },
      });
      return { isFollowing: false, followers };
    } else {
      await prisma.communityFollowing.create({
        data: {
          followerId: userId,
          followingId: targetUserId,
        },
      });
      const followers = await prisma.communityFollowing.count({
        where: { followingId: targetUserId },
      });
      return { isFollowing: true, followers };
    }
  },
};

export default communityService;


import { Request, Response } from 'express';
import communityService from '../services/community.service';
import asyncHandler from '../utils/asyncHandler';
import { BadRequestError } from '../utils/errors';

export const communityController = {
  // ==================== TAGS ====================
  getTags: asyncHandler(async (_req: Request, res: Response) => {
    const tags = await communityService.getTags();
    res.json({
      status: 'success',
      data: tags,
    });
  }),

  addTag: asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new BadRequestError('Tag name is required');
    }
    const tag = await communityService.addTag(name.trim());
    res.json({
      status: 'success',
      data: tag,
    });
  }),

  // ==================== POSTS ====================
  getFeed: asyncHandler(async (req: Request, res: Response) => {
    // Support both legacy "tab" and new "sort" params
    const { sort, tab, tag, page, limit } = req.query as {
      sort?: 'latest' | 'top';
      tab?: 'hot' | 'new' | 'weekly' | string;
      tag?: string;
      page?: string;
      limit?: string;
    };

    let resolvedTab: 'hot' | 'new' | 'weekly' = 'hot';
    if (typeof tab === 'string' && (tab === 'hot' || tab === 'new' || tab === 'weekly')) {
      resolvedTab = tab;
    } else if (sort === 'top') {
      resolvedTab = 'hot';
    } else if (sort === 'latest') {
      resolvedTab = 'new';
    } else {
      resolvedTab = 'hot'; // Default to 'hot' instead of 'new' for better UX
    }

    const parsedPage = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const parsedLimit = limit ? Math.min(Math.max(1, parseInt(limit, 10) || 10), 100) : 10;

    const result = await communityService.getFeed({
      tab: resolvedTab,
      tag: tag && typeof tag === 'string' ? tag.trim() : undefined,
      page: parsedPage,
      limit: parsedLimit,
    });
    res.json({
      status: 'success',
      data: result,
    });
  }),

  createPost: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }
    const userId = req.user.id;

    const { title, content, tags, media, courseId, courseTitle } = req.body as {
      title?: string;
      content?: string;
      tags?: string[];
      media?: string[];
      courseId?: string;
      courseTitle?: string;
    };

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      throw new BadRequestError('Content must be at least 10 characters');
    }

    if (title && typeof title === 'string' && title.trim().length > 200) {
      throw new BadRequestError('Title must not exceed 200 characters');
    }

    const post = await communityService.createPost(
      {
        authorId: userId,
        title,
        content,
        tags,
        media,
        courseId,
        courseTitle,
      },
      userId
    );

    res.status(201).json({
      status: 'success',
      data: post,
    });
  }),

  getPostById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Post ID is required');
    }
    const userId = req.user?.id;
    const post = await communityService.getPostById(id.trim(), userId);
    res.json({
      status: 'success',
      data: post,
    });
  }),

  likePost: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }
    const userId = req.user.id;

    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Post ID is required');
    }
    const result = await communityService.likePost(id.trim(), userId);
    res.json({
      status: 'success',
      data: result,
    });
  }),

  bookmarkPost: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }
    const userId = req.user.id;

    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Post ID is required');
    }
    const result = await communityService.bookmarkPost(id.trim(), userId);
    res.json({
      status: 'success',
      data: result,
    });
  }),

  // ==================== COMMENTS ====================
  getComments: asyncHandler(async (req: Request, res: Response) => {
    const { postId } = req.params;
    if (!postId || typeof postId !== 'string' || !postId.trim()) {
      throw new BadRequestError('Post ID is required');
    }
    const comments = await communityService.getComments(postId.trim());
    res.json({
      status: 'success',
      data: comments,
    });
  }),

  addComment: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }
    const userId = req.user.id;

    const { postId } = req.params;
    if (!postId || typeof postId !== 'string' || !postId.trim()) {
      throw new BadRequestError('Post ID is required');
    }

    const { content } = req.body as { content?: string };

    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new BadRequestError('Comment content is required');
    }

    const comment = await communityService.addComment(postId.trim(), userId, content.trim());
    res.status(201).json({
      status: 'success',
      data: comment,
    });
  }),

  // ==================== USERS ====================
  getUserProfile: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new BadRequestError('User ID is required');
    }
    const currentUserId = req.user?.id;
    const profile = await communityService.getUserProfile(userId.trim(), currentUserId);
    res.json({
      status: 'success',
      data: profile,
    });
  }),

  getUserPosts: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new BadRequestError('User ID is required');
    }
    const { page, limit } = req.query as { page?: string; limit?: string };
    const parsedPage = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const parsedLimit = limit ? Math.min(Math.max(1, parseInt(limit, 10) || 10), 100) : 10;
    const result = await communityService.getUserPosts(
      userId.trim(),
      parsedPage,
      parsedLimit
    );
    res.json({
      status: 'success',
      data: result,
    });
  }),

  followUser: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('User not authenticated');
    }
    const userId = req.user.id;

    const { targetUserId } = req.params;
    if (!targetUserId || typeof targetUserId !== 'string' || !targetUserId.trim()) {
      throw new BadRequestError('Target user ID is required');
    }
    const result = await communityService.followUser(targetUserId.trim(), userId);
    res.json({
      status: 'success',
      data: result,
    });
  }),
};

export default communityController;

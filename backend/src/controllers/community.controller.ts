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
    const { tab, tag, page, limit } = req.query;
    const result = await communityService.getFeed({
      tab: (tab as any) || 'hot',
      tag: tag as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 10,
    });
    res.json({
      status: 'success',
      data: result,
    });
  }),

  createPost: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestError('User not authenticated');
    }

    const { title, content, tags, media, courseId, courseTitle } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      throw new BadRequestError('Content must be at least 10 characters');
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
    const userId = req.user?.id;
    const post = await communityService.getPostById(id, userId);
    res.json({
      status: 'success',
      data: post,
    });
  }),

  likePost: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestError('User not authenticated');
    }

    const { id } = req.params;
    const result = await communityService.likePost(id, userId);
    res.json({
      status: 'success',
      data: result,
    });
  }),

  bookmarkPost: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestError('User not authenticated');
    }

    const { id } = req.params;
    const result = await communityService.bookmarkPost(id, userId);
    res.json({
      status: 'success',
      data: result,
    });
  }),

  // ==================== COMMENTS ====================
  getComments: asyncHandler(async (req: Request, res: Response) => {
    const { postId } = req.params;
    const comments = await communityService.getComments(postId);
    res.json({
      status: 'success',
      data: comments,
    });
  }),

  addComment: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestError('User not authenticated');
    }

    const { postId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new BadRequestError('Comment content is required');
    }

    const comment = await communityService.addComment(
      postId,
      userId,
      content.trim()
    );
    res.status(201).json({
      status: 'success',
      data: comment,
    });
  }),

  // ==================== USERS ====================
  getUserProfile: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const currentUserId = req.user?.id;
    const profile = await communityService.getUserProfile(userId, currentUserId);
    res.json({
      status: 'success',
      data: profile,
    });
  }),

  getUserPosts: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { page, limit } = req.query;
    const result = await communityService.getUserPosts(
      userId,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 10
    );
    res.json({
      status: 'success',
      data: result,
    });
  }),

  followUser: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestError('User not authenticated');
    }

    const { targetUserId } = req.params;
    const result = await communityService.followUser(targetUserId, userId);
    res.json({
      status: 'success',
      data: result,
    });
  }),
};

export default communityController;


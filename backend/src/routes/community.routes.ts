import { Router } from 'express';
import communityController from '../controllers/community.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { body, param, query } from 'express-validator';

const router = Router();

// ==================== TAGS ====================
router.get('/tags', communityController.getTags);
router.post(
  '/tags',
  authenticate,
  validate([
    body('name').trim().notEmpty().withMessage('Tag name is required').isLength({ max: 50 }).withMessage('Tag name too long'),
  ]),
  communityController.addTag
);

// ==================== POSTS ====================
router.get(
  '/feed',
  optionalAuth,
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be 1-50'),
    query('tag').optional().isString().isLength({ max: 50 }).withMessage('tag too long'),
    query('userId').optional().isUUID().withMessage('Invalid userId'),
    query('sort').optional().isIn(['latest', 'top']).withMessage('Invalid sort option'),
  ]),
  communityController.getFeed
);

router.post(
  '/posts',
  authenticate,
  validate([
    body('content').trim().notEmpty().withMessage('Content is required').isLength({ max: 2000 }).withMessage('Content too long'),
    body('tags').optional().isArray({ max: 5 }).withMessage('Maximum 5 tags allowed'),
    body('tags.*.id').optional().isUUID().withMessage('Invalid tag id'),
    body('tags.*.name').optional().isString().isLength({ min: 1, max: 50 }).withMessage('Invalid tag name'),
    body('media').optional().isArray({ max: 10 }).withMessage('Maximum 10 media items allowed'),
    body('media.*.type').optional().isString().withMessage('Invalid media type'),
    body('media.*.url').optional().isString().withMessage('Invalid media url'),
  ]),
  communityController.createPost
);

router.get(
  '/posts/:id',
  optionalAuth,
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  communityController.getPostById
);

router.post(
  '/posts/:id/like',
  authenticate,
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  communityController.likePost
);

router.post(
  '/posts/:id/bookmark',
  authenticate,
  validate([param('id').notEmpty().withMessage('id is required').isUUID().withMessage('Invalid id')]),
  communityController.bookmarkPost
);

// ==================== COMMENTS ====================
router.get(
  '/posts/:postId/comments',
  optionalAuth,
  validate([
    param('postId').notEmpty().withMessage('postId is required').isUUID().withMessage('Invalid postId'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be 1-50'),
  ]),
  communityController.getComments
);

router.post(
  '/posts/:postId/comments',
  authenticate,
  validate([
    param('postId').notEmpty().withMessage('postId is required').isUUID().withMessage('Invalid postId'),
    body('content').trim().notEmpty().withMessage('Content is required').isLength({ max: 1000 }).withMessage('Content too long'),
  ]),
  communityController.addComment
);

// ==================== USERS ====================
router.get(
  '/users/:userId/profile',
  optionalAuth,
  validate([param('userId').notEmpty().withMessage('userId is required').isUUID().withMessage('Invalid userId')]),
  communityController.getUserProfile
);

router.get(
  '/users/:userId/posts',
  optionalAuth,
  validate([
    param('userId').notEmpty().withMessage('userId is required').isUUID().withMessage('Invalid userId'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be 1-50'),
  ]),
  communityController.getUserPosts
);

router.post(
  '/users/:targetUserId/follow',
  authenticate,
  validate([param('targetUserId').notEmpty().withMessage('targetUserId is required').isUUID().withMessage('Invalid targetUserId')]),
  communityController.followUser
);

export default router;

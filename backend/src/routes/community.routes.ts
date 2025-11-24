import { Router } from 'express';
import communityController from '@/controllers/community.controller';
import { authenticate } from '@/middleware/auth';

const router = Router();

// ==================== TAGS ====================
router.get('/tags', communityController.getTags);
router.post('/tags', authenticate, communityController.addTag);

// ==================== POSTS ====================
router.get('/feed', communityController.getFeed);
router.post('/posts', authenticate, communityController.createPost);
router.get('/posts/:id', communityController.getPostById);
router.post('/posts/:id/like', authenticate, communityController.likePost);
router.post('/posts/:id/bookmark', authenticate, communityController.bookmarkPost);

// ==================== COMMENTS ====================
router.get('/posts/:postId/comments', communityController.getComments);
router.post('/posts/:postId/comments', authenticate, communityController.addComment);

// ==================== USERS ====================
router.get('/users/:userId/profile', communityController.getUserProfile);
router.get('/users/:userId/posts', communityController.getUserPosts);
router.post('/users/:targetUserId/follow', authenticate, communityController.followUser);

export default router;


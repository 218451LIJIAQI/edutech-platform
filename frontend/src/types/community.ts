/**
 * Community-related type definitions
 * Includes posts, comments, user profiles, tags, and feed structures
 */

import { User } from '@/types';

/**
 * Type of media content in a post
 */
export type MediaType = 'image' | 'video';

/**
 * Tag used to categorize community posts
 */
export interface CommunityTag {
  id: string;
  /** Tag name without '#' prefix */
  name: string;
}

/**
 * Media attachment in a community post
 */
export interface CommunityMedia {
  id: string;
  type: MediaType;
  url: string;
  /** Thumbnail URL for videos */
  thumbnailUrl?: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Duration in seconds (for videos) */
  duration?: number;
}

/**
 * Type of user reaction to a post
 */
export type ReactionType = 'like' | 'love' | 'clap' | 'fire' | 'star';

/**
 * Community post/thread
 * Represents a user-created post in the community forum
 */
export interface CommunityPost {
  id: string;
  /** ID of the post author */
  authorId: string;
  /** Author user object (populated on retrieval) */
  author?: User;
  /** Optional post title */
  title?: string;
  /** Post content/body */
  content: string;
  /** Tags associated with the post */
  tags: CommunityTag[];
  /** Media attachments */
  media?: CommunityMedia[];
  /** Optional linked course ID */
  courseId?: string;
  /** Optional linked course title */
  courseTitle?: string;
  /** Total number of likes */
  likes: number;
  /** Whether current user has liked this post */
  hasLiked?: boolean;
  /** Total number of bookmarks/saves */
  bookmarks: number;
  /** Whether current user has bookmarked this post */
  hasBookmarked?: boolean;
  /** Number of comments */
  commentsCount: number;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt?: string;
}

/**
 * Comment on a community post
 * Represents a user comment/reply on a post
 */
export interface CommunityComment {
  id: string;
  /** ID of the post this comment belongs to */
  postId: string;
  /** ID of the comment author */
  authorId: string;
  /** Author user object (populated on retrieval) */
  author?: User;
  /** Comment text content */
  content: string;
  /** Number of likes on this comment */
  likes?: number;
  /** Whether current user has liked this comment */
  hasLiked?: boolean;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt?: string;
}

/**
 * User profile in the community
 */
export interface CommunityUserProfile {
  /** User ID */
  id: string;
  /** User bio/description */
  bio?: string;
  /** Number of followers */
  followers: number;
  /** Number of users this user is following */
  following: number;
  /** Whether current user is following this user */
  isFollowing?: boolean;
  /** User badges/achievements (e.g., 'Beginner', 'Intermediate', 'Course Guru') */
  badges?: string[];
}

/**
 * Query parameters for fetching community feed
 */
export interface FeedQuery {
  /** Feed sorting tab */
  tab?: 'hot' | 'new' | 'weekly';
  /** Filter by tag name */
  tag?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  limit?: number;
}

/**
 * Community feed result with pagination
 */
export interface FeedResult {
  /** List of posts */
  items: CommunityPost[];
  /** Pagination metadata */
  pagination: {
    /** Total number of items */
    total: number;
    /** Current page number */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of pages */
    totalPages: number;
  };
}

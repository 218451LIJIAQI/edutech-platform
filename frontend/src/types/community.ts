import type { User } from './user';

type MediaType = 'image' | 'video';

/**
 * Public author projection returned by community post and comment endpoints.
 * Compatible with both lightweight backend selects and full `User` objects.
 */
export type CommunityAuthor = Pick<User, 'id' | 'firstName' | 'lastName'> &
  Partial<Omit<User, 'id' | 'firstName' | 'lastName'>>;

export interface CommunityTag {
  id: string;
  /** Tag name without '#' prefix */
  name: string;
}

export interface CommunityMedia {
  id: string;
  type: MediaType;
  url: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  author?: CommunityAuthor;
  title?: string;
  content: string;
  tags: CommunityTag[];
  media?: CommunityMedia[];
  courseId?: string;
  courseTitle?: string;
  likes: number;
  hasLiked?: boolean;
  bookmarks: number;
  hasBookmarked?: boolean;
  commentsCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  author?: CommunityAuthor;
  content: string;
  likes?: number;
  hasLiked?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CommunityUserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  followers: number;
  following: number;
  isFollowing?: boolean;
  badges?: string[];
}

export interface FeedQuery {
  tab?: 'hot' | 'new' | 'weekly';
  tag?: string;
  page?: number;
  limit?: number;
}

export interface FeedResult {
  items: CommunityPost[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

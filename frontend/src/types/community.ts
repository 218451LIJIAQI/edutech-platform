import { User } from '@/types';

export type MediaType = 'image' | 'video';

export interface CommunityTag {
  id: string;
  name: string; // without '#'
}

export interface CommunityMedia {
  id: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  durationSec?: number;
}

export type ReactionType = 'like' | 'love' | 'clap' | 'fire' | 'star';

export interface CommunityPost {
  id: string;
  authorId: string;
  author?: User;
  title?: string;
  content: string;
  tags: CommunityTag[];
  media?: CommunityMedia[];
  courseId?: string; // optional linked course id
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
  author?: User;
  content: string;
  createdAt: string;
}

export interface CommunityUserProfile {
  id: string; // user id
  bio?: string;
  followers: number;
  following: number;
  isFollowing?: boolean;
  badges?: string[]; // e.g., 'Beginner', 'Intermediate', 'Course Guru'
}

export interface FeedQuery {
  tab?: 'hot' | 'new' | 'weekly';
  tag?: string;
  page?: number;
  limit?: number;
}

export interface FeedResult {
  items: CommunityPost[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}


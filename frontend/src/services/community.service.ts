import api from './api';
import { ApiResponse } from '@/types';
import { FeedQuery, FeedResult, CommunityPost, CommunityComment, CommunityTag, CommunityUserProfile } from '@/types/community';

const useFallback = false; // Disable fallback - use real backend API

// Local fallback storage helpers
const LS_KEY = 'community_fallback_v1';

interface Store {
  posts: CommunityPost[];
  comments: Record<string, CommunityComment[]>; // postId -> comments
  tags: CommunityTag[];
  profiles: Record<string, CommunityUserProfile>;
}

/**
 * Translate tag names from Chinese to English
 */
function translateTagName(name: string): string {
  const map: Record<string, string> = {
    '软件测试': 'Software Testing',
    '云计算入门': 'Cloud Computing Basics',
    '我在学习APP开发': 'Learning App Development',
    '今日进度': 'Today Progress',
  };
  return map[name] ?? name;
}

/**
 * Normalize store data by translating tag names
 */
function normalizeStore(s: Store): Store {
  s.tags = (s.tags || []).map(t => ({ ...t, name: translateTagName(t.name) }));
  s.posts = (s.posts || []).map(p => ({
    ...p,
    tags: (p.tags || []).map(t => ({ ...t, name: translateTagName(t.name) })),
  }));
  return s;
}

/**
 * Load store from localStorage
 */
function loadStore(): Store {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) {
    const seed: Store = {
      posts: [],
      comments: {},
      tags: [
        { id: 't1', name: 'Software Testing' },
        { id: 't2', name: 'Cloud Computing Basics' },
        { id: 't3', name: 'Learning App Development' },
        { id: 't4', name: 'Today Progress' },
      ],
      profiles: {},
    };
    localStorage.setItem(LS_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    return normalizeStore(JSON.parse(raw) as Store);
  } catch {
    return { posts: [], comments: {}, tags: [], profiles: {} };
  }
}

/**
 * Save store to localStorage
 */
function saveStore(s: Store): void {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

/**
 * Generate unique ID
 */
function uid(): string {
  return crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2);
}

/**
 * Helper function to extract data from API response with error handling
 */
function extractData<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.data) {
    throw new Error(response.data.message || 'No data received from server');
  }
  return response.data.data;
}

export const communityService = {
  /**
   * Get community feed with optional filtering and pagination
   */
  async getFeed(params: FeedQuery = {}): Promise<FeedResult> {
    try {
      const response = await api.get<ApiResponse<FeedResult>>('/community/feed', { 
        params,
        headers: { 'X-Suppress-404': 'true' }
      });
      return extractData(response);
    } catch (e) {
      if (!useFallback) throw e;
      const s = loadStore();
      let items = [...s.posts];
      if (params.tag) {
        items = items.filter(p => p.tags.some(t => t.name === params.tag));
      }
      if (params.tab === 'weekly') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        items = items
          .filter(p => new Date(p.createdAt).getTime() >= weekAgo.getTime())
          .slice()
          .sort((a, b) => 
            (b.likes + b.bookmarks * 2 + b.commentsCount) - (a.likes + a.bookmarks * 2 + a.commentsCount)
          );
      } else if (params.tab === 'hot') {
        items = items.slice().sort((a, b) => 
          (b.likes + b.bookmarks * 2 + b.commentsCount) - (a.likes + a.bookmarks * 2 + a.commentsCount)
        );
      } else if (params.tab === 'new') {
        items = items.slice().sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      const page = params.page ?? 1;
      const limit = params.limit ?? 10;
      const start = (page - 1) * limit;
      const paged = items.slice(start, start + limit);
      return { 
        items: paged, 
        pagination: { 
          total: items.length, 
          page, 
          limit, 
          totalPages: Math.ceil((items.length || 0) / limit) 
        } 
      };
    }
  },

  /**
   * Get all community tags
   */
  async getTags(): Promise<CommunityTag[]> {
    try {
      const response = await api.get<ApiResponse<CommunityTag[]>>('/community/tags', {
        headers: { 'X-Suppress-404': 'true' }
      });
      return extractData(response);
    } catch {
      return loadStore().tags;
    }
  },

  /**
   * Add a new tag
   */
  async addTag(name: string): Promise<CommunityTag> {
    try {
      const response = await api.post<ApiResponse<CommunityTag>>('/community/tags', { name });
      return extractData(response);
    } catch {
      const s = loadStore();
      const exist = s.tags.find(t => t.name === name);
      if (exist) return exist;
      const t: CommunityTag = { id: uid(), name };
      s.tags.push(t);
      saveStore(s);
      return t;
    }
  },

  /**
   * Create a new post
   */
  async createPost(input: Omit<CommunityPost, 'id' | 'likes' | 'bookmarks' | 'commentsCount' | 'createdAt'>): Promise<CommunityPost> {
    try {
      const response = await api.post<ApiResponse<CommunityPost>>('/community/posts', input);
      return extractData(response);
    } catch (e) {
      if (!useFallback) {
        throw e;
      }
      const s = loadStore();
      const p: CommunityPost = {
        id: uid(),
        likes: 0,
        bookmarks: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
        ...input,
      };
      s.posts.unshift(p);
      saveStore(s);
      return p;
    }
  },

  /**
   * Get a post by ID
   */
  async getPostById(id: string): Promise<CommunityPost> {
    try {
      const response = await api.get<ApiResponse<CommunityPost>>(`/community/posts/${id}`, {
        headers: { 'X-Suppress-404': 'true' }
      });
      return extractData(response);
    } catch {
      const s = loadStore();
      const p = s.posts.find(x => x.id === id);
      if (!p) throw new Error('Post not found');
      return p;
    }
  },

  /**
   * Like or unlike a post
   */
  async likePost(id: string): Promise<{ likes: number; hasLiked: boolean }> {
    try {
      const response = await api.post<ApiResponse<{ likes: number; hasLiked: boolean }>>(
        `/community/posts/${id}/like`
      );
      return extractData(response);
    } catch {
      const s = loadStore();
      const p = s.posts.find(x => x.id === id);
      if (!p) throw new Error('Post not found');
      p.hasLiked = !p.hasLiked;
      p.likes += p.hasLiked ? 1 : -1;
      saveStore(s);
      return { likes: p.likes, hasLiked: !!p.hasLiked };
    }
  },

  /**
   * Bookmark or unbookmark a post
   */
  async bookmarkPost(id: string): Promise<{ bookmarks: number; hasBookmarked: boolean }> {
    try {
      const response = await api.post<ApiResponse<{ bookmarks: number; hasBookmarked: boolean }>>(
        `/community/posts/${id}/bookmark`
      );
      return extractData(response);
    } catch {
      const s = loadStore();
      const p = s.posts.find(x => x.id === id);
      if (!p) throw new Error('Post not found');
      p.hasBookmarked = !p.hasBookmarked;
      p.bookmarks += p.hasBookmarked ? 1 : -1;
      saveStore(s);
      return { bookmarks: p.bookmarks, hasBookmarked: !!p.hasBookmarked };
    }
  },

  /**
   * Get comments for a post
   */
  async getComments(postId: string): Promise<CommunityComment[]> {
    try {
      const response = await api.get<ApiResponse<CommunityComment[]>>(
        `/community/posts/${postId}/comments`,
        { headers: { 'X-Suppress-404': 'true' } }
      );
      return extractData(response);
    } catch {
      const s = loadStore();
      return s.comments[postId] || [];
    }
  },

  /**
   * Add a comment to a post
   */
  async addComment(postId: string, authorId: string, content: string): Promise<CommunityComment> {
    try {
      const response = await api.post<ApiResponse<CommunityComment>>(
        `/community/posts/${postId}/comments`,
        { content }
      );
      return extractData(response);
    } catch {
      const s = loadStore();
      const c: CommunityComment = { 
        id: uid(), 
        postId, 
        authorId, 
        content, 
        createdAt: new Date().toISOString() 
      };
      s.comments[postId] = s.comments[postId] || [];
      s.comments[postId].push(c);
      const p = s.posts.find(x => x.id === postId);
      if (p) p.commentsCount += 1;
      saveStore(s);
      return c;
    }
  },

  /**
   * Follow or unfollow a user
   */
  async followUser(targetUserId: string): Promise<{ isFollowing: boolean; followers: number }> {
    try {
      const response = await api.post<ApiResponse<{ isFollowing: boolean; followers: number }>>(
        `/community/users/${targetUserId}/follow`
      );
      return extractData(response);
    } catch {
      const s = loadStore();
      const profile = s.profiles[targetUserId] || { 
        id: targetUserId, 
        followers: 0, 
        following: 0, 
        isFollowing: false,
        badges: []
      } as CommunityUserProfile;
      profile.isFollowing = !profile.isFollowing;
      profile.followers += profile.isFollowing ? 1 : -1;
      s.profiles[targetUserId] = profile;
      saveStore(s);
      return { isFollowing: profile.isFollowing, followers: profile.followers };
    }
  },

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<CommunityUserProfile> {
    try {
      const response = await api.get<ApiResponse<CommunityUserProfile>>(
        `/community/users/${userId}/profile`,
        { headers: { 'X-Suppress-404': 'true' } }
      );
      return extractData(response);
    } catch {
      const s = loadStore();
      if (!s.profiles[userId]) {
        s.profiles[userId] = { 
          id: userId, 
          followers: 0, 
          following: 0, 
          badges: ['Beginner'] 
        } as CommunityUserProfile;
      }
      saveStore(s);
      return s.profiles[userId];
    }
  },

  /**
   * Get posts by a specific user
   */
  async getUserPosts(userId: string, page = 1, limit = 10): Promise<FeedResult> {
    try {
      const response = await api.get<ApiResponse<FeedResult>>(
        `/community/users/${userId}/posts`,
        { 
          params: { page, limit },
          headers: { 'X-Suppress-404': 'true' }
        }
      );
      return extractData(response);
    } catch {
      const s = loadStore();
      const items = s.posts.filter(p => p.authorId === userId);
      const start = (page - 1) * limit;
      const paged = items.slice(start, start + limit);
      return { 
        items: paged, 
        pagination: { 
          total: items.length, 
          page, 
          limit, 
          totalPages: Math.ceil((items.length || 0) / limit) 
        } 
      };
    }
  },
};

export default communityService;


import api from './api';
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

function translateTagName(name: string): string {
  const map: Record<string, string> = {
    '软件测试': 'Software Testing',
    '云计算入门': 'Cloud Computing Basics',
    '我在学习APP开发': 'Learning App Development',
    '今日进度': 'Today Progress',
  };
  return map[name] ?? name;
}

function normalizeStore(s: Store): Store {
  s.tags = (s.tags || []).map(t => ({ ...t, name: translateTagName(t.name) }));
  s.posts = (s.posts || []).map(p => ({
    ...p,
    tags: (p.tags || []).map(t => ({ ...t, name: translateTagName(t.name) })),
  }));
  return s;
}

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
  try { return normalizeStore(JSON.parse(raw) as Store); } catch { return { posts: [], comments: {}, tags: [], profiles: {} }; }
}

function saveStore(s: Store) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function uid() { return (crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2)); }

export const communityService = {
  async getFeed(params: FeedQuery = {}): Promise<FeedResult> {
    try {
      const { data } = await api.get('/community/feed', { params });
      return data.data as FeedResult;
    } catch (e) {
      if (!useFallback) throw e;
      const s = loadStore();
      let items = [...s.posts];
      if (params.tag) {
        items = items.filter(p => p.tags.some(t => t.name === params.tag));
      }
      if (params.tab === 'weekly') {
        items = items.slice().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (params.tab === 'hot') {
        items = items.slice().sort((a,b) => (b.likes + b.bookmarks*2 + b.commentsCount) - (a.likes + a.bookmarks*2 + a.commentsCount));
      } else if (params.tab === 'new') {
        items = items.slice().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      const page = params.page ?? 1; const limit = params.limit ?? 10;
      const start = (page-1)*limit; const paged = items.slice(start, start+limit);
      return { items: paged, pagination: { total: items.length, page, limit, totalPages: Math.ceil(items.length/limit || 1) } };
    }
  },

  async getTags(): Promise<CommunityTag[]> {
    try { const { data } = await api.get('/community/tags'); return data.data as CommunityTag[]; }
    catch { return loadStore().tags; }
  },

  async addTag(name: string): Promise<CommunityTag> {
    try { const { data } = await api.post('/community/tags', { name }); return data.data as CommunityTag; }
    catch {
      const s = loadStore();
      const exist = s.tags.find(t => t.name === name);
      if (exist) return exist;
      const t = { id: uid(), name } as CommunityTag;
      s.tags.push(t); saveStore(s); return t;
    }
  },

  async createPost(input: Omit<CommunityPost, 'id' | 'likes' | 'bookmarks' | 'commentsCount' | 'createdAt'>): Promise<CommunityPost> {
    try {
      const { data } = await api.post('/community/posts', input);
      return data.data as CommunityPost;
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

  async getPostById(id: string): Promise<CommunityPost> {
    try { const { data } = await api.get(`/community/posts/${id}`); return data.data as CommunityPost; }
    catch {
      const s = loadStore();
      const p = s.posts.find(x => x.id === id);
      if (!p) throw new Error('Post not found');
      return p;
    }
  },

  async likePost(id: string): Promise<{ likes: number; hasLiked: boolean }> {
    try { const { data } = await api.post(`/community/posts/${id}/like`); return data.data; }
    catch {
      const s = loadStore();
      const p = s.posts.find(x => x.id === id);
      if (!p) throw new Error('Post not found');
      p.hasLiked = !p.hasLiked;
      p.likes += p.hasLiked ? 1 : -1;
      saveStore(s);
      return { likes: p.likes, hasLiked: !!p.hasLiked };
    }
  },

  async bookmarkPost(id: string): Promise<{ bookmarks: number; hasBookmarked: boolean }> {
    try { const { data } = await api.post(`/community/posts/${id}/bookmark`); return data.data; }
    catch {
      const s = loadStore();
      const p = s.posts.find(x => x.id === id);
      if (!p) throw new Error('Post not found');
      p.hasBookmarked = !p.hasBookmarked;
      p.bookmarks += p.hasBookmarked ? 1 : -1;
      saveStore(s);
      return { bookmarks: p.bookmarks, hasBookmarked: !!p.hasBookmarked };
    }
  },

  async getComments(postId: string): Promise<CommunityComment[]> {
    try { const { data } = await api.get(`/community/posts/${postId}/comments`); return data.data as CommunityComment[]; }
    catch {
      const s = loadStore();
      return s.comments[postId] || [];
    }
  },

  async addComment(postId: string, authorId: string, content: string): Promise<CommunityComment> {
    try { const { data } = await api.post(`/community/posts/${postId}/comments`, { content }); return data.data as CommunityComment; }
    catch {
      const s = loadStore();
      const c: CommunityComment = { id: uid(), postId, authorId, content, createdAt: new Date().toISOString() };
      s.comments[postId] = s.comments[postId] || [];
      s.comments[postId].push(c);
      const p = s.posts.find(x => x.id === postId); if (p) p.commentsCount += 1;
      saveStore(s);
      return c;
    }
  },

  async followUser(targetUserId: string): Promise<{ isFollowing: boolean; followers: number }> {
    try { const { data } = await api.post(`/community/users/${targetUserId}/follow`); return data.data; }
    catch {
      const s = loadStore();
      const profile = s.profiles[targetUserId] || { id: targetUserId, followers: 0, following: 0, isFollowing: false } as CommunityUserProfile;
      profile.isFollowing = !profile.isFollowing;
      profile.followers += profile.isFollowing ? 1 : -1;
      s.profiles[targetUserId] = profile;
      saveStore(s);
      return { isFollowing: profile.isFollowing, followers: profile.followers };
    }
  },

  async getUserProfile(userId: string): Promise<CommunityUserProfile> {
    try { const { data } = await api.get(`/community/users/${userId}/profile`); return data.data as CommunityUserProfile; }
    catch {
      const s = loadStore();
      if (!s.profiles[userId]) s.profiles[userId] = { id: userId, followers: 0, following: 0, badges: ['Beginner'] } as CommunityUserProfile;
      saveStore(s);
      return s.profiles[userId];
    }
  },

  async getUserPosts(userId: string, page = 1, limit = 10): Promise<FeedResult> {
    try { const { data } = await api.get(`/community/users/${userId}/posts`, { params: { page, limit } }); return data.data as FeedResult; }
    catch {
      const s = loadStore();
      const items = s.posts.filter(p => p.authorId === userId);
      const start = (page-1)*limit; const paged = items.slice(start, start+limit);
      return { items: paged, pagination: { total: items.length, page, limit, totalPages: Math.ceil(items.length/limit || 1) } };
    }
  },
};

export default communityService;


import api from './api';
import { ApiResponse } from '@/types';
import { extractData } from './response-utils';
import { normalizeAssetUrl } from '@/utils/asset-normalizers';
import {
  CommunityAuthor,
  CommunityComment,
  CommunityMedia,
  CommunityPost,
  CommunityTag,
  CommunityUserProfile,
  FeedQuery,
  FeedResult,
} from '@/types/community';

export interface CreateCommunityPostInput {
  title?: string;
  content: string;
  tags?: Array<{ id?: string; name?: string }>;
  media?: CommunityMedia[];
  courseId?: string;
  courseTitle?: string;
}

const normalizeCommunityAuthor = (
  author?: CommunityAuthor
): CommunityAuthor | undefined =>
  author
    ? {
        ...author,
        avatar: normalizeAssetUrl(author.avatar),
      }
    : author;

const normalizeCommunityMedia = (media: CommunityMedia): CommunityMedia => ({
  ...media,
  url: normalizeAssetUrl(media.url) ?? media.url,
});

const normalizeCommunityPost = (post: CommunityPost): CommunityPost => ({
  ...post,
  author: normalizeCommunityAuthor(post.author),
  media: post.media?.map(normalizeCommunityMedia),
});

const normalizeCommunityComment = (
  comment: CommunityComment
): CommunityComment => ({
  ...comment,
  author: normalizeCommunityAuthor(comment.author),
});

const normalizeFeedResult = (feed: FeedResult): FeedResult => ({
  ...feed,
  items: (feed.items || []).map(normalizeCommunityPost),
});

const communityService = {
  async getFeed(params: FeedQuery = {}): Promise<FeedResult> {
    const response = await api.get<ApiResponse<FeedResult>>('/community/feed', { params });
    return normalizeFeedResult(extractData(response));
  },

  async getTags(): Promise<CommunityTag[]> {
    const response = await api.get<ApiResponse<CommunityTag[]>>('/community/tags');
    return extractData(response);
  },

  async addTag(name: string): Promise<CommunityTag> {
    const response = await api.post<ApiResponse<CommunityTag>>('/community/tags', { name });
    return extractData(response);
  },

  async createPost(input: CreateCommunityPostInput): Promise<CommunityPost> {
    const response = await api.post<ApiResponse<CommunityPost>>('/community/posts', input);
    return normalizeCommunityPost(extractData(response));
  },

  async getPostById(id: string): Promise<CommunityPost> {
    const response = await api.get<ApiResponse<CommunityPost>>(`/community/posts/${id}`);
    return normalizeCommunityPost(extractData(response));
  },

  async likePost(id: string): Promise<{ likes: number; hasLiked: boolean }> {
    const response = await api.post<ApiResponse<{ likes: number; hasLiked: boolean }>>(
      `/community/posts/${id}/like`
    );
    return extractData(response);
  },

  async bookmarkPost(id: string): Promise<{ bookmarks: number; hasBookmarked: boolean }> {
    const response = await api.post<ApiResponse<{ bookmarks: number; hasBookmarked: boolean }>>(
      `/community/posts/${id}/bookmark`
    );
    return extractData(response);
  },

  async getComments(postId: string): Promise<CommunityComment[]> {
    const response = await api.get<
      ApiResponse<CommunityComment[] | { items: CommunityComment[] }>
    >(`/community/posts/${postId}/comments`);
    const data = extractData(response);
    const items = Array.isArray(data) ? data : data.items ?? [];
    return items.map(normalizeCommunityComment);
  },

  async addComment(postId: string, content: string): Promise<CommunityComment> {
    const response = await api.post<ApiResponse<CommunityComment>>(
      `/community/posts/${postId}/comments`,
      { content }
    );
    return normalizeCommunityComment(extractData(response));
  },

  async followUser(
    targetUserId: string
  ): Promise<{ isFollowing: boolean; followers: number }> {
    const response = await api.post<
      ApiResponse<{ isFollowing: boolean; followers: number }>
    >(`/community/users/${targetUserId}/follow`);
    return extractData(response);
  },

  async getUserProfile(userId: string): Promise<CommunityUserProfile> {
    const response = await api.get<ApiResponse<CommunityUserProfile>>(
      `/community/users/${userId}/profile`
    );
    const profile = extractData(response);
    return {
      ...profile,
      avatar: normalizeAssetUrl(profile.avatar),
    };
  },

  async getUserPosts(userId: string, page = 1, limit = 10): Promise<FeedResult> {
    const response = await api.get<ApiResponse<FeedResult>>(
      `/community/users/${userId}/posts`,
      { params: { page, limit } }
    );
    return normalizeFeedResult(extractData(response));
  },
};

export default communityService;

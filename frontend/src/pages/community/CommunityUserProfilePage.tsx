import { useCallback, useEffect, useRef, useState } from 'react';
import clientLogger from '@/utils/logger';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, RefreshCcw, User as UserIcon, Flame, Bookmark, Heart, Share2 } from 'lucide-react';
import communityService from '@/services/community.service';
import { CommunityPost, CommunityUserProfile } from '@/types/community';
import CommunityMediaPreview from '@/components/community/CommunityMediaPreview';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth-store';
import { extractErrorMessage } from '@/utils/error-handler';
import { shareCommunityPost } from '@/utils/clipboard';
import { usePageTitle } from '@/hooks';

const CommunityUserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuthStore();

  const [profile, setProfile] = useState<CommunityUserProfile | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [pendingPostIds, setPendingPostIds] = useState<Set<string>>(new Set());
  const requestIdRef = useRef(0);
  const isMe = user?.id === userId;

  usePageTitle(isMe ? 'My Community Profile' : 'Community Profile');

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [profileResult, postsResult] = await Promise.all([
        communityService.getUserProfile(userId),
        communityService.getUserPosts(userId, 1, 20),
      ]);
      if (requestId !== requestIdRef.current) {
        return;
      }
      setProfile(profileResult);
      setPosts(postsResult.items);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      clientLogger.error('Failed to load profile:', error);
      const message = extractErrorMessage(error, 'Failed to load profile');
      setLoadError(message);
      toast.error(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    void loadProfile();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadProfile]);

  const toggleFollow = async () => {
    if (!userId || isFollowPending) return;
    setIsFollowPending(true);
    try {
      const result = await communityService.followUser(userId);
      setProfile((currentProfile) =>
        currentProfile
          ? {
              ...currentProfile,
              isFollowing: result.isFollowing,
              followers: result.followers,
            }
          : currentProfile
      );
    } catch (error) {
      clientLogger.error('Failed to follow user:', error);
      toast.error(extractErrorMessage(error, 'Failed to follow user'));
    } finally {
      setIsFollowPending(false);
    }
  };

  const toggleLike = async (id: string) => {
    if (pendingPostIds.has(id)) return;
    setPendingPostIds((prev) => new Set(prev).add(id));
    try {
      const { likes, hasLiked } = await communityService.likePost(id);
      setPosts((currentPosts) =>
        currentPosts.map((post) => (post.id === id ? { ...post, likes, hasLiked } : post))
      );
    } catch (error) {
      clientLogger.error('Failed to like post:', error);
      toast.error(extractErrorMessage(error, 'Failed to like post'));
    } finally {
      setPendingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleBookmark = async (id: string) => {
    if (pendingPostIds.has(id)) return;
    setPendingPostIds((prev) => new Set(prev).add(id));
    try {
      const { bookmarks, hasBookmarked } = await communityService.bookmarkPost(id);
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === id ? { ...post, bookmarks, hasBookmarked } : post
        )
      );
    } catch (error) {
      clientLogger.error('Failed to bookmark post:', error);
      toast.error(extractErrorMessage(error, 'Failed to bookmark post'));
    } finally {
      setPendingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const onShare = async (post: CommunityPost) => {
    await shareCommunityPost(post);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 animate-pulse motion-reduce:animate-none flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary-500/20 animate-ping motion-reduce:animate-none"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 px-4">
        <div className="card max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">
            {loadError ? 'Unable to load profile' : 'User not found'}
          </h2>
          <p className="text-sm text-slate-600">
            {loadError || 'The community member profile could not be found.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {loadError && (
              <button
                type="button"
                onClick={() => void loadProfile()}
                className="btn-primary inline-flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Retry
              </button>
            )}
            <Link to="/community" className={loadError ? 'btn-outline' : 'btn-primary'}>
              Back to Community
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() ||
    (isMe ? 'My Profile' : 'User Profile');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="card shadow-xl border border-gray-100 rounded-2xl mb-6 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover shadow-lg border border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <UserIcon className="w-8 h-8 text-white" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-extrabold text-gray-900">{displayName}</h1>
              <p className="text-sm text-gray-600 tabular-nums">
                Followers {profile.followers} &middot; Following {profile.following}
              </p>
              {profile.badges && profile.badges.length > 0 && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {profile.badges.map((badge, index) => (
                    <span key={`badge-${index}-${badge}`} className="badge-primary text-xs">
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {!isMe && (
              <button
                type="button"
                onClick={() => void toggleFollow()}
                disabled={isFollowPending}
                className={`btn ${profile.isFollowing ? 'btn-outline' : 'btn-primary'}`}
              >
                {profile.isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 inline-flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary-600" /> Posts
          </h2>
          {isMe && <Link to="/community/create" className="btn-primary">Create Post</Link>}
        </div>

        {posts.length === 0 ? (
          <div className="card shadow-xl border border-gray-100 rounded-2xl text-center py-16 text-gray-600">
            No posts published yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => {
              const isPendingPostAction = pendingPostIds.has(post.id);
              return (
                <div
                  key={post.id}
                  className="card card-smooth flex flex-col"
                >
                  {post.media && post.media[0] && (
                    <CommunityMediaPreview
                      media={post.media[0]}
                      title={post.title}
                      className="w-full h-44 object-cover rounded-xl mb-3"
                    />
                  )}
                  <Link to={`/community/post/${post.id}`} className="block">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
                      {post.title || (post.content ? post.content.slice(0, 60) : 'Untitled')}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{post.content || ''}</p>
                  </Link>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3 tabular-nums">
                      <button
                        type="button"
                        aria-pressed={Boolean(post.hasLiked)}
                        aria-label={`${post.hasLiked ? 'Unlike' : 'Like'} post (${post.likes} likes)`}
                        disabled={isPendingPostAction}
                        onClick={() => void toggleLike(post.id)}
                        className={`px-3 py-1 rounded-lg border text-sm inline-flex items-center gap-1 disabled:opacity-50 ${
                          post.hasLiked
                            ? 'bg-red-50 border-red-200 text-red-600'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${post.hasLiked ? 'fill-red-500 text-red-500' : ''}`}
                          aria-label="like"
                        />{' '}
                        {post.likes}
                      </button>
                      <button
                        type="button"
                        aria-pressed={Boolean(post.hasBookmarked)}
                        aria-label={`${post.hasBookmarked ? 'Remove bookmark' : 'Bookmark'} post (${post.bookmarks} bookmarks)`}
                        disabled={isPendingPostAction}
                        onClick={() => void toggleBookmark(post.id)}
                        className={`px-3 py-1 rounded-lg border text-sm inline-flex items-center gap-1 disabled:opacity-50 ${
                          post.hasBookmarked
                            ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Bookmark
                          className={`w-4 h-4 ${post.hasBookmarked ? 'fill-yellow-500 text-yellow-600' : ''}`}
                          aria-label="bookmark"
                        />{' '}
                        {post.bookmarks}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onShare(post)}
                      className="px-3 py-1 rounded-lg border text-sm inline-flex items-center gap-1 bg-white border-gray-200 hover:bg-gray-50"
                    >
                      <Share2 className="w-4 h-4" aria-label="share" /> Share
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityUserProfilePage;

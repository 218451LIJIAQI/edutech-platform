import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clientLogger from '@/utils/logger';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Flame,
  Clock3,
  Star,
  PlusCircle,
  Bookmark,
  Heart,
  Share2,
  Tag,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import communityService from '@/services/community.service';
import { CommunityPost, CommunityTag, FeedQuery } from '@/types/community';
import CommunityMediaPreview from '@/components/community/CommunityMediaPreview';
import { usePageTitle } from '@/hooks';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import { shareLink } from '@/utils/clipboard';

const TABS: {
  key: NonNullable<FeedQuery['tab']>;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'hot', label: 'Hot', icon: Flame },
  { key: 'new', label: 'New', icon: Clock3 },
  { key: 'weekly', label: 'Weekly Picks', icon: Star },
];

const CommunityHomePage = () => {
  usePageTitle('Community');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<NonNullable<FeedQuery['tab']>>(() => {
    const tabParam = params.get('tab');
    return tabParam === 'hot' || tabParam === 'new' || tabParam === 'weekly' ? tabParam : 'hot';
  });
  const [tag, setTag] = useState<string | undefined>(params.get('tag') || undefined);
  const [tags, setTags] = useState<CommunityTag[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingActionPostIds, setPendingActionPostIds] = useState<Set<string>>(new Set());
  const requestIdRef = useRef(0);

  const query: FeedQuery = useMemo(() => ({ tab, tag, page, limit: 9 }), [tab, tag, page]);

  useEffect(() => {
    const rawTab = params.get('tab');
    const nextTab: NonNullable<FeedQuery['tab']> =
      rawTab === 'hot' || rawTab === 'new' || rawTab === 'weekly' ? rawTab : 'hot';
    const nextTag = params.get('tag') || undefined;
    setTab((current) => {
      if (current === nextTab) {
        return current;
      }
      setPage(1);
      return nextTab;
    });
    setTag((current) => {
      if (current === nextTag) {
        return current;
      }
      setPage(1);
      return nextTag;
    });
  }, [params]);

  useEffect(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        if (tag) {
          next.set('tag', tag);
        } else {
          next.delete('tag');
        }
        return next;
      },
      { replace: true }
    );
  }, [tab, tag, setParams]);

  const loadFeed = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await communityService.getFeed(query);
      if (requestId !== requestIdRef.current) return;
      setPosts(result.items);
      setTotalPages(Math.max(1, result.pagination.totalPages || 1));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      clientLogger.error('Failed to load community feed:', error);
      const message = extractErrorMessage(error, 'Failed to load community feed');
      setLoadError(message);
      toast.error(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [query]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    let isActive = true;
    const loadTags = async () => {
      try {
        const fetched = await communityService.getTags();
        if (isActive) {
          setTags(fetched);
        }
      } catch (error) {
        clientLogger.error('Failed to load tags:', error);
      }
    };

    void loadTags();
    return () => {
      isActive = false;
    };
  }, []);

  const toggleLike = async (id: string) => {
    if (pendingActionPostIds.has(id)) return;
    setPendingActionPostIds((prev) => new Set(prev).add(id));
    try {
      const { likes, hasLiked } = await communityService.likePost(id);
      setPosts((currentPosts) =>
        currentPosts.map((post) => (post.id === id ? { ...post, likes, hasLiked } : post))
      );
    } catch (error) {
      clientLogger.error('Failed to like post:', error);
      toast.error(extractErrorMessage(error, 'Failed to like post'));
    } finally {
      setPendingActionPostIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleBookmark = async (id: string) => {
    if (pendingActionPostIds.has(id)) return;
    setPendingActionPostIds((prev) => new Set(prev).add(id));
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
      setPendingActionPostIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const onShare = async (post: CommunityPost) => {
    const url = `${window.location.origin}/community/post/${post.id}`;
    const result = await shareLink(url, {
      title: post.title || 'Community post',
      text: 'Check out this post in the FlexiLearn community.',
    });

    if (result === 'shared') {
      toast.success('Sharing options opened');
      return;
    }

    if (result === 'copied') {
      toast.success('Link copied to clipboard');
      return;
    }

    if (result === 'unavailable') {
      toast.error('Unable to share this link right now. Please copy it from the address bar.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                  Community
                </span>{' '}
                Forum
              </h1>
              <p className="text-slate-600 font-medium mt-0.5">
                Share study notes, ask course questions, and learn together
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/community/create')}
            className="btn-primary"
          >
            <PlusCircle className="w-4 h-4" /> Create Post
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Community feed sections"
          className="flex items-center gap-2.5 mb-5 flex-wrap"
        >
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => {
                setTab(item.key);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors inline-flex items-center gap-2 ${
                tab === item.key
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <item.icon className="w-4 h-4" /> {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-6">
          <button
            type="button"
            onClick={() => {
              setTag(undefined);
              setPage(1);
            }}
            className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${
              !tag
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Topics
          </button>
          {tags.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTag(item.name);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full border text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                tag === item.name
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Tag className="w-3 h-3" /> #{item.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-slate-600 font-medium">
            <div className="spinner mx-auto mb-3" /> Loading discussions...
          </div>
        ) : loadError ? (
          <div className="card max-w-lg mx-auto text-center space-y-4 py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Unable to load community feed</h2>
            <p className="text-sm text-slate-600">{loadError}</p>
            <button type="button" onClick={() => void loadFeed()} className="btn-primary">
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="card text-center py-14 max-w-lg mx-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {tag ? `No posts tagged #${tag}` : 'No community posts yet'}
            </h3>
            <p className="text-slate-600 text-sm mb-6">
              {tag
                ? 'Clear the topic filter to view all discussions or start the first thread on this topic.'
                : 'Start the conversation by sharing a study insight or course question.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              {tag && (
                <button
                  type="button"
                  onClick={() => {
                    setTag(undefined);
                    setPage(1);
                  }}
                  className="btn-secondary"
                >
                  Clear Topic Filter
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/community/create')}
                className="btn-primary"
              >
                Create Post
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group card card-smooth p-0 flex flex-col overflow-hidden"
              >
                {post.media && post.media.length > 0 && (
                  <div className="h-48 overflow-hidden bg-slate-100">
                    <CommunityMediaPreview
                      media={post.media[0]}
                      title={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 p-5">
                  <Link to={`/community/post/${post.id}`} className="block">
                    <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-primary-700 transition-colors">
                      {post.title || (post.content ? post.content.slice(0, 60) : 'Untitled')}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{post.content || ''}</p>
                  </Link>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {post.tags?.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setTag(item.name);
                          setPage(1);
                        }}
                        className="badge-primary hover:bg-primary-100 transition-colors"
                      >
                        #{item.name}
                      </button>
                    ))}
                    {post.courseTitle && (
                      <Link
                        to={`/courses/${post.courseId}`}
                        className="text-xs text-primary-700 hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <BookOpen className="w-3 h-3" /> {post.courseTitle}
                      </Link>
                    )}
                  </div>
                </div>
                <div className="px-5 pb-4 pt-3.5 flex items-center justify-between border-t border-slate-100 tabular-nums">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleLike(post.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs inline-flex items-center gap-1.5 font-semibold transition-colors ${
                        post.hasLiked
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          post.hasLiked ? 'fill-red-500 text-red-500' : ''
                        }`}
                      />
                      {post.likes}
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleBookmark(post.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs inline-flex items-center gap-1.5 font-semibold transition-colors ${
                        post.hasBookmarked
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Bookmark
                        className={`w-3.5 h-3.5 ${
                          post.hasBookmarked ? 'fill-amber-500 text-amber-600' : ''
                        }`}
                      />
                      {post.bookmarks}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onShare(post)}
                    className="px-3 py-1.5 rounded-lg border text-xs inline-flex items-center gap-1.5 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-semibold transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              className="btn-secondary btn-sm"
            >
              Previous
            </button>
            <span className="text-sm text-slate-700 font-medium tabular-nums">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
              className="btn-primary btn-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityHomePage;

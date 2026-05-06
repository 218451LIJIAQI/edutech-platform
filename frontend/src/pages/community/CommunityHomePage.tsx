import { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import communityService from '@/services/community.service';
import { CommunityPost, CommunityTag, FeedQuery } from '@/types/community';
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

  const query: FeedQuery = useMemo(() => ({ tab, tag, page, limit: 9 }), [tab, tag, page]);

  useEffect(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      if (tag) {
        next.set('tag', tag);
      } else {
        next.delete('tag');
      }
      return next;
    });
  }, [tab, tag, setParams]);

  useEffect(() => {
    const loadFeed = async () => {
      setIsLoading(true);
      try {
        const result = await communityService.getFeed(query);
        setPosts(result.items);
        setTotalPages(result.pagination.totalPages);
      } catch (error) {
        clientLogger.error('Failed to load community feed:', error);
        toast.error(extractErrorMessage(error, 'Failed to load community feed'));
      } finally {
        setIsLoading(false);
      }
    };

    void loadFeed();
  }, [query]);

  useEffect(() => {
    const loadTags = async () => {
      try {
        setTags(await communityService.getTags());
      } catch (error) {
        clientLogger.error('Failed to load tags:', error);
        toast.error(extractErrorMessage(error, 'Failed to load tags'));
      }
    };

    void loadTags();
  }, []);

  const toggleLike = async (id: string) => {
    try {
      const { likes, hasLiked } = await communityService.likePost(id);
      setPosts((currentPosts) =>
        currentPosts.map((post) => (post.id === id ? { ...post, likes, hasLiked } : post))
      );
    } catch (error) {
      clientLogger.error('Failed to like post:', error);
      toast.error(extractErrorMessage(error, 'Failed to like post'));
    }
  };

  const toggleBookmark = async (id: string) => {
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
    }
  };

  const onShare = async (post: CommunityPost) => {
    const url = `${window.location.origin}/community/post/${post.id}`;
    const result = await shareLink(url, {
      title: post.title || 'Community post',
      text: 'Check out this post in the community.',
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
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 left-[5%] w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                  Community
                </span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">
                Share knowledge and connect with learners
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/community/create')}
            className="btn-primary inline-flex items-center gap-2 shadow-lg shadow-primary-500/25"
          >
            <PlusCircle className="w-5 h-5" /> Create Post
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setTab(item.key);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl border transition-all inline-flex items-center gap-2 ${
                tab === item.key
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
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
            className={`px-3 py-1 rounded-full border text-sm ${
              !tag
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {tags.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTag(item.name);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full border text-sm inline-flex items-center gap-1 ${
                tag === item.name
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Tag className="w-3 h-3" /> #{item.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="spinner mx-auto mb-3" /> Loading...
          </div>
        ) : posts.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-gray-600 mb-4">No posts yet. Create the first one.</p>
            <button type="button" onClick={() => navigate('/community/create')} className="btn-primary">
              Create Post
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group card hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex flex-col shadow-lg border border-gray-100 hover:border-primary-200 rounded-2xl overflow-hidden"
              >
                {post.media && post.media.length > 0 && (
                  <div className="mb-3 h-48 overflow-hidden rounded-t-2xl">
                    {post.media[0].type === 'image' ? (
                      <img
                        src={post.media[0].url}
                        alt={post.title ? `${post.title} cover` : 'Community post cover'}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <video
                        src={post.media[0].url}
                        title={post.title ? `${post.title} video preview` : 'Community post video preview'}
                        aria-label={post.title ? `${post.title} video preview` : 'Community post video preview'}
                        className="w-full h-full object-cover"
                        controls={false}
                        muted
                      />
                    )}
                  </div>
                )}
                <div className="flex-1 p-5">
                  <Link to={`/community/post/${post.id}`} className="block">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 hover:text-primary-600 transition-colors">
                      {post.title || (post.content ? post.content.slice(0, 60) : 'Untitled')}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{post.content || ''}</p>
                  </Link>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {post.tags?.map((item) => (
                      <span key={item.id} className="badge-primary text-xs font-semibold">
                        #{item.name}
                      </span>
                    ))}
                    {post.courseTitle && (
                      <Link
                        to={`/courses/${post.courseId}`}
                        className="text-xs text-primary-600 hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <BookOpen className="w-3 h-3" /> {post.courseTitle}
                      </Link>
                    )}
                  </div>
                </div>
                <div className="mt-4 px-5 pb-5 flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleLike(post.id)}
                      className={`px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-1 font-semibold transition-all ${
                        post.hasLiked
                          ? 'bg-red-50 border-red-200 text-red-600 shadow-md'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-red-500 text-red-500' : ''}`} />{' '}
                      {post.likes}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBookmark(post.id)}
                      className={`px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-1 font-semibold transition-all ${
                        post.hasBookmarked
                          ? 'bg-yellow-50 border-yellow-200 text-yellow-700 shadow-md'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Bookmark
                        className={`w-4 h-4 ${post.hasBookmarked ? 'fill-yellow-500 text-yellow-600' : ''}`}
                      />{' '}
                      {post.bookmarks}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onShare(post)}
                    className="px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-1 bg-white border-gray-200 hover:bg-gray-50 font-semibold transition-all"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
              className="btn-outline btn-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              className="btn-outline btn-sm disabled:opacity-50"
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

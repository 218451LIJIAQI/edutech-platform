import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Flame, Clock3, Star, PlusCircle, Bookmark, Heart, Share2, Tag } from 'lucide-react';
import communityService from '@/services/community.service';
import { CommunityPost, CommunityTag, FeedQuery } from '@/types/community';

import toast from 'react-hot-toast';

const TABS: { key: NonNullable<FeedQuery['tab']>; label: string; icon: any }[] = [
  { key: 'hot', label: 'Hot', icon: Flame },
  { key: 'new', label: 'New', icon: Clock3 },
  { key: 'weekly', label: 'Weekly Picks', icon: Star }
];

const CommunityHomePage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<NonNullable<FeedQuery['tab']>>(params.get('tab') as any || 'hot');
  const [tag, setTag] = useState<string | undefined>(params.get('tag') || undefined);
  const [tags, setTags] = useState<CommunityTag[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const query: FeedQuery = useMemo(() => ({ tab, tag, page, limit: 9 }), [tab, tag, page]);

  useEffect(() => {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', tab);
      if (tag) p.set('tag', tag); else p.delete('tag');
      return p;
    });
  }, [tab, tag, setParams]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await communityService.getFeed(query);
        setPosts(res.items);
        setTotalPages(res.pagination.totalPages);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load community feed');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [query.tab, query.tag, query.page]);

  useEffect(() => {
    (async () => {
      try { setTags(await communityService.getTags()); } catch {}
    })();
  }, []);

  const toggleLike = async (id: string) => {
    try {
      const { likes, hasLiked } = await communityService.likePost(id);
      setPosts((ps) => ps.map(p => p.id === id ? { ...p, likes, hasLiked } : p));
    } catch { toast.error('Failed to like'); }
  };

  const toggleBookmark = async (id: string) => {
    try {
      const { bookmarks, hasBookmarked } = await communityService.bookmarkPost(id);
      setPosts((ps) => ps.map(p => p.id === id ? { ...p, bookmarks, hasBookmarked } : p));
    } catch { toast.error('Failed to bookmark'); }
  };

  const onShare = async (post: CommunityPost) => {
    const url = `${window.location.origin}/community/post/${post.id}`;
    try { await navigator.clipboard.writeText(url); toast.success('Link copied'); }
    catch { toast(url); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="section-title">Community</h1>
          <button onClick={() => navigate('/community/create')} className="btn-primary inline-flex items-center gap-2">
            <PlusCircle className="w-5 h-5" /> Create Post
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-3 mb-6">
          {TABS.map(t => (
            <button key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={`px-4 py-2 rounded-xl border transition-all inline-flex items-center gap-2 ${tab === t.key ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'bg-white border-gray-200 hover:bg-gray-50'} `}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <button onClick={() => { setTag(undefined); setPage(1); }} className={`px-3 py-1 rounded-full border text-sm ${!tag ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>All</button>
          {tags.map(t => (
            <button key={t.id} onClick={() => { setTag(t.name); setPage(1); }} className={`px-3 py-1 rounded-full border text-sm inline-flex items-center gap-1 ${tag === t.name ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
              <Tag className="w-3 h-3" /> #{t.name}
            </button>
          ))}
        </div>

        {/* Feed */}
        {isLoading ? (
          <div className="text-center py-20"><div className="spinner mx-auto mb-3" /> Loading...</div>
        ) : posts.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-gray-600 mb-4">No posts yet. Create the first one.</p>
            <button onClick={() => navigate('/community/create')} className="btn-primary">Create Post</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <div key={post.id} className="card hover:shadow-xl transition-all duration-300 flex flex-col">
                {/* Media preview */}
                {post.media && post.media.length > 0 && (
                  <div className="mb-3">
                    {post.media[0].type === 'image' ? (
                      <img src={post.media[0].url} alt="media" className="w-full h-44 object-cover rounded-xl" />
                    ) : (
                      <video src={post.media[0].url} className="w-full h-44 object-cover rounded-xl" controls={false} muted />
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <Link to={`/community/post/${post.id}`} className="block">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">{post.title || post.content.slice(0, 60)}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                  </Link>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {post.tags?.map(t => (
                      <span key={t.id} className="badge-primary text-xs">#{t.name}</span>
                    ))}
                    {post.courseTitle && (
                      <Link to={`/courses/${post.courseId}`} className="text-xs text-primary-600 hover:underline">Linked course: {post.courseTitle}</Link>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleLike(post.id)} className={`px-3 py-1 rounded-lg border text-sm inline-flex items-center gap-1 ${post.hasLiked ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-red-500 text-red-500' : ''}`} /> {post.likes}
                    </button>
                    <button onClick={() => toggleBookmark(post.id)} className={`px-3 py-1 rounded-lg border text-sm inline-flex items-center gap-1 ${post.hasBookmarked ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <Bookmark className={`w-4 h-4 ${post.hasBookmarked ? 'fill-yellow-500 text-yellow-600' : ''}`} /> {post.bookmarks}
                    </button>
                  </div>
                  <button onClick={() => onShare(post)} className="px-3 py-1 rounded-lg border text-sm inline-flex items-center gap-1 bg-white border-gray-200 hover:bg-gray-50">
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button disabled={page<=1} onClick={() => setPage(p => p-1)} className="btn-outline btn-sm disabled:opacity-50">Previous</button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button disabled={page>=totalPages} onClick={() => setPage(p => p+1)} className="btn-outline btn-sm disabled:opacity-50">Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityHomePage;


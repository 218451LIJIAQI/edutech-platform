import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { User as UserIcon, Flame, Bookmark, Heart, Share2 } from 'lucide-react';
import communityService from '@/services/community.service';
import { CommunityPost, CommunityUserProfile } from '@/types/community';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { Link } from 'react-router-dom';

const CommunityUserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuthStore();

  const [profile, setProfile] = useState<CommunityUserProfile | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const p = await communityService.getUserProfile(userId);
        setProfile(p);
        const res = await communityService.getUserPosts(userId, 1, 20);
        setPosts(res.items);
      } catch (e) {
        console.error('Failed to load profile:', e);
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId]);

  const toggleFollow = async () => {
    if (!userId) return;
    try {
      const res = await communityService.followUser(userId);
      setProfile(prev => prev ? { ...prev, isFollowing: res.isFollowing, followers: res.followers } : prev);
    } catch (error) {
      console.error('Failed to follow user:', error);
      toast.error('Failed to follow user');
    }
  };

  const toggleLike = async (id: string) => {
    try {
      const { likes, hasLiked } = await communityService.likePost(id);
      setPosts((ps) => ps.map(p => p.id === id ? { ...p, likes, hasLiked } : p));
    } catch (error) {
      console.error('Failed to like post:', error);
      toast.error('Failed to like post');
    }
  };

  const toggleBookmark = async (id: string) => {
    try {
      const { bookmarks, hasBookmarked } = await communityService.bookmarkPost(id);
      setPosts((ps) => ps.map(p => p.id === id ? { ...p, bookmarks, hasBookmarked } : p));
    } catch (error) {
      console.error('Failed to bookmark post:', error);
      toast.error('Failed to bookmark post');
    }
  };

  const onShare = async (post: CommunityPost) => {
    const url = `${window.location.origin}/community/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback: show URL in toast if clipboard API fails
      toast.error(`Share URL: ${url}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="spinner" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">User not found</p>
        </div>
      </div>
    );
  }

  const isMe = user?.id === userId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="card shadow-xl border border-gray-100 rounded-2xl mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-gray-500" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{isMe ? 'My Profile' : 'User Profile'}</h1>
              <p className="text-sm text-gray-600">Followers {profile.followers} · Following {profile.following}</p>
              {profile.badges && profile.badges.length > 0 && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {profile.badges.map((b, i) => (
                    <span key={`badge-${i}-${b}`} className="badge-primary text-xs">{b}</span>
                  ))}
                </div>
              )}
            </div>
            {!isMe && (
              <button type="button" onClick={toggleFollow} className={`btn ${profile.isFollowing ? 'btn-outline' : 'btn-primary'}`}>
                {profile.isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 inline-flex items-center gap-2"><Flame className="w-5 h-5 text-primary-600" /> Posts</h2>
          {isMe && (
            <Link to="/community/create" className="btn-primary">Create Post</Link>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="card shadow-xl border border-gray-100 rounded-2xl text-center py-16">No posts yet</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map(post => (
              <div key={post.id} className="card shadow-xl border border-gray-100 rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex flex-col">
                {post.media && post.media[0] && (
                  post.media[0].type === 'image' ? (
                    <img src={post.media[0].url} alt="post media" className="w-full h-44 object-cover rounded-xl mb-3" />
                  ) : (
                    <video src={post.media[0].url} className="w-full h-44 object-cover rounded-xl mb-3" controls={false} muted />
                  )
                )}
                <Link to={`/community/post/${post.id}`} className="block">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">{post.title || (post.content ? post.content.slice(0, 60) : 'Untitled')}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{post.content || ''}</p>
                </Link>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => toggleLike(post.id)} className={`px-3 py-1 rounded-lg border text-sm inline-flex items-center gap-1 ${post.hasLiked ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-red-500 text-red-500' : ''}`} aria-label="like" /> {post.likes}
                    </button>
                    <button type="button" onClick={() => toggleBookmark(post.id)} className={`px-3 py-1 rounded-lg border text-sm inline-flex items-center gap-1 ${post.hasBookmarked ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                      <Bookmark className={`w-4 h-4 ${post.hasBookmarked ? 'fill-yellow-500 text-yellow-600' : ''}`} aria-label="bookmark" /> {post.bookmarks}
                    </button>
                  </div>
                  <button type="button" onClick={() => onShare(post)} className="px-3 py-1 rounded-lg border text-sm inline-flex items-center gap-1 bg-white border-gray-200 hover:bg-gray-50">
                    <Share2 className="w-4 h-4" aria-label="share" /> Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityUserProfilePage;


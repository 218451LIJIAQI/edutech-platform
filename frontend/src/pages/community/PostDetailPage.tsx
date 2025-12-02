import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heart, Bookmark, Share2, MessageCircle, Flag, User, Tag, Loader2 } from 'lucide-react';
import communityService from '@/services/community.service';
import { CommunityComment, CommunityPost } from '@/types/community';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import ReportSubmissionModal from '@/components/common/ReportSubmissionModal';
import UniversalVideoPlayer from '@/components/common/UniversalVideoPlayer';

const PostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [commentInput, setCommentInput] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const p = await communityService.getPostById(id);
        setPost(p);
        setComments(await communityService.getComments(id));
      } catch (error) {
        console.error('Failed to load post:', error);
        toast.error('Failed to load post');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const onShare = async () => {
    if (!post) return;
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

  const toggleLike = async () => {
    if (!post) return;
    try {
      const { likes, hasLiked } = await communityService.likePost(post.id);
      setPost({ ...post, likes, hasLiked });
    } catch (error) {
      console.error('Failed to like post:', error);
      toast.error('Failed to like post');
    }
  };

  const toggleBookmark = async () => {
    if (!post) return;
    try {
      const { bookmarks, hasBookmarked } = await communityService.bookmarkPost(post.id);
      setPost({ ...post, bookmarks, hasBookmarked });
    } catch (error) {
      console.error('Failed to bookmark post:', error);
      toast.error('Failed to bookmark post');
    }
  };

  const addComment = async () => {
    if (!user || !post) return;
    const text = commentInput.trim();
    if (!text) {
      toast.error('Please enter a comment');
      return;
    }
    try {
      const c = await communityService.addComment(post.id, user.id, text);
      setComments(prev => [...prev, c]);
      setCommentInput('');
      toast.success('Comment added');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="flex items-center text-gray-600"><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Post not found</p>
          <button type="button" className="btn-primary" onClick={() => navigate('/community')}>Back to Community</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl relative">
        <div className="card shadow-xl border border-gray-100 rounded-2xl">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><User className="w-5 h-5 text-gray-500" aria-label="user" /></div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <Link to={`/community/user/${post.authorId}`} className="font-bold text-gray-900 hover:underline">
                    {post.author?.firstName && post.author?.lastName 
                      ? `${post.author.firstName} ${post.author.lastName}`
                      : post.author?.email || 'Unknown User'}
                  </Link>
                  <p className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleString()}</p>
                </div>
                <button type="button" onClick={() => setIsReportModalOpen(true)} className="btn-outline btn-sm inline-flex items-center gap-1"><Flag className="w-4 h-4" aria-label="flag" /> Report</button>
              </div>
            </div>
          </div>

          {post.title && <h1 className="text-2xl font-bold mb-3 text-gray-900">{post.title}</h1>}
          <p className="text-gray-800 leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>

          {post.media && post.media.length > 0 && (
            <div className="grid grid-cols-1 gap-3 mb-4">
              {post.media.map(m => (
                <div key={m.id}>
                  {m.type === 'image' ? (
                    <img src={m.url} alt="post media" className="w-full rounded-xl border" />
                  ) : (
                    <UniversalVideoPlayer src={m.url} title={post.title || 'Post video'} />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap mb-4">
            {post.tags?.map(t => (
              <button type="button" key={t.id} className="badge-primary text-xs inline-flex items-center gap-1"><Tag className="w-3 h-3" aria-label="tag" /> #{t.name}</button>
            ))}
            {post.courseTitle && (
              <Link to={`/courses/${post.courseId}`} className="text-xs text-primary-600 hover:underline">Linked course: {post.courseTitle}</Link>
            )}
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button type="button" onClick={toggleLike} className={`px-3 py-1 rounded-lg border text-sm inline-flex items-center gap-1 ${post.hasLiked ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-red-500 text-red-500' : ''}`} aria-label="like" /> {post.likes}
              </button>
              <button type="button" onClick={toggleBookmark} className={`px-3 py-1 rounded-lg border text-sm inline-flex items-center gap-1 ${post.hasBookmarked ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                <Bookmark className={`w-4 h-4 ${post.hasBookmarked ? 'fill-yellow-500 text-yellow-600' : ''}`} aria-label="bookmark" /> {post.bookmarks}
              </button>
            </div>
            <button type="button" onClick={onShare} className="px-3 py-1 rounded-lg border text-sm inline-flex items-center gap-1 bg-white border-gray-200 hover:bg-gray-50">
              <Share2 className="w-4 h-4" aria-label="share" /> Share
            </button>
          </div>

          {/* Comments */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3 inline-flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Comments {comments.length}</h3>
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-500">No comments yet.</p>
              ) : comments.map(c => (
                <div key={c.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">{c.content}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input 
                value={commentInput} 
                onChange={(e) => setCommentInput(e.target.value)} 
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addComment();
                  }
                }} 
                className="input flex-1" 
                placeholder="Write your comment..." 
              />
              <button type="button" onClick={addComment} className="btn-primary btn-sm">Post</button>
            </div>
          </div>
        </div>
      </div>

      {post && (
        <ReportSubmissionModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          reportedId={post.authorId}
          reportedName={post.author?.firstName && post.author?.lastName 
            ? `${post.author.firstName} ${post.author.lastName}`
            : post.author?.email || 'Unknown User'}
          contentType="community_post"
          contentId={post.id}
        />
      )}
    </div>
  );
};

export default PostDetailPage;

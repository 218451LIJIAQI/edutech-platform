import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, Video, Tag, Link as LinkIcon, Trash2, Loader2, Star } from 'lucide-react';
import communityService from '@/services/community.service';
import { CommunityMedia, CommunityPost, CommunityTag } from '@/types/community';
import uploadService from '@/services/upload.service';
import { courseService } from '@/services/course.service';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const MIN_CONTENT = 10;

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<CommunityTag[]>([]);
  const [allTags, setAllTags] = useState<CommunityTag[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [media, setMedia] = useState<CommunityMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [courseQuery, setCourseQuery] = useState('');
  const [courseOptions, setCourseOptions] = useState<{ id: string; title: string }[]>([]);
  const [linkedCourse, setLinkedCourse] = useState<{ id: string; title: string } | undefined>();

  const canSubmit = useMemo(() => content.trim().length >= MIN_CONTENT || title.trim().length >= 5, [content, title]);

  useEffect(() => {
    (async () => {
      try {
        setAllTags(await communityService.getTags());
      } catch (error) {
        console.error('Failed to load tags:', error);
        toast.error('Failed to load tags');
      }
    })();
  }, []);

  useEffect(() => {
    if (!courseQuery.trim()) {
      setCourseOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await courseService.getAllCourses({ search: courseQuery, limit: 5, page: 1 });
        const items = (res.items || res.courses || []).map((c: any) => ({ id: c.id, title: c.title }));
        setCourseOptions(items);
      } catch (error) {
        console.error('Failed to search courses:', error);
        setCourseOptions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [courseQuery]);

  const addTag = async () => {
    const name = tagInput.trim();
    if (!name) return;
    if (tags.find(t => t.name === name)) {
      toast.error('Tag already added');
      return;
    }
    try {
      const t = await communityService.addTag(name);
      setTags(prev => [...prev, t]);
      if (!allTags.find(x => x.id === t.id)) setAllTags(prev => [...prev, t]);
      setTagInput('');
    } catch (error) {
      console.error('Failed to add tag:', error);
      toast.error('Failed to add tag');
    }
  };

  const removeTag = (id: string) => setTags(prev => prev.filter(t => t.id !== id));

  const onUpload = async (file: File) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) { toast.error('Only image or video supported'); return; }
    setIsUploading(true);
    try {
      const uploadedUrl = isImage
        ? (await uploadService.uploadFile(file, 'community-images')).url
        : await uploadService.uploadVideo(file);
      const m: CommunityMedia = {
        id: (crypto.randomUUID?.() || String(Date.now())),
        type: isImage ? 'image' : 'video',
        url: uploadedUrl,
      };
      setMedia(prev => [...prev, m]);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = (id: string) => setMedia(prev => prev.filter(m => m.id !== id));

  const banned = ['politics','violence','hate','porn']; // demo sensitive words; replace with real list from backend if available

  const submit = async () => {
    if (!user) return;
    const trimmed = content.trim();
    if (!canSubmit) { toast.error('Please write more content'); return; }
    // simple sensitive-word check
    if ([title, trimmed].some(txt => banned.some(w => txt.includes(w)))) {
      toast.error('Content contains restricted words, please revise and try again.');
      return;
    }

    const payload = {
      authorId: user.id,
      title: title.trim() || undefined,
      content: trimmed,
      tags,
      media,
      courseId: linkedCourse?.id,
      courseTitle: linkedCourse?.title,
    } as Omit<CommunityPost, 'id' | 'likes' | 'bookmarks' | 'commentsCount' | 'createdAt' | 'author'>;

    try {
      const created = await communityService.createPost(payload);
      toast.success('Posted successfully');
      navigate(`/community/post/${created.id}`);
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error('Failed to create post. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="card shadow-xl border border-gray-100 rounded-2xl">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Create Post</h1>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Title (optional)</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="Summarize your post in one sentence" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Content *</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={8} className="input" placeholder="Share your learning insights, course recommendations, or progress updates" />
              <p className={`text-xs mt-2 ${canSubmit ? 'text-green-600' : 'text-gray-500'}`}>At least {MIN_CONTENT} characters (current {content.trim().length})</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Add Media (Images/Videos)</label>
              <p className="text-xs text-gray-600 mb-2">Tip: Use an image as the first media to make your post more eye-catching in the feed.</p>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {/* Local upload */}
                <label className="btn-outline btn-sm inline-flex items-center gap-2 cursor-pointer">
                  <ImagePlus className="w-4 h-4" /> Upload Image
                  <input type="file" accept="image/*" hidden onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onUpload(e.target.files[0]);
                  }
                }} />
                </label>
                <label className="btn-outline btn-sm inline-flex items-center gap-2 cursor-pointer">
                  <Video className="w-4 h-4" /> Upload Video
                  <input type="file" accept="video/*" hidden onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onUpload(e.target.files[0]);
                  }
                }} />
                </label>

                {/* Add by URL */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    id="mediaUrlInput"
                    placeholder="Paste image URL or video URL (YouTube/Vimeo/mp4)"
                    className="input w-80"
                  />
                  <button
                    type="button"
                    className="btn-outline btn-sm"
                    onClick={() => {
                      const el = document.getElementById('mediaUrlInput') as HTMLInputElement | null;
                      const url = el?.value.trim();
                      if (!url) {
                        toast.error('Please enter a valid URL');
                        return;
                      }
                      // Detect media type by extension or known hosts
                      const isImage = /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(url);
                      const isDirectVideo = /\.(mp4|webm|m3u8|mov|ogg)(\?.*)?$/i.test(url);
                      const isYouTube = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)/i.test(url);
                      const isVimeo = /vimeo\.com\//i.test(url);
                      const type: 'image' | 'video' | undefined = isImage ? 'image' : (isDirectVideo || isYouTube || isVimeo) ? 'video' : undefined;
                      if (!type) {
                        toast.error('Unsupported media URL. Please use image or video URLs.');
                        return;
                      }
                      const m: CommunityMedia = {
                        id: (crypto.randomUUID?.() || String(Date.now())),
                        type,
                        url,
                      };
                      setMedia(prev => [...prev, m]);
                      if (el) el.value = '';
                      toast.success('Media added successfully');
                    }}
                  >
                    Add by URL
                  </button>
                </div>

                {isUploading && <span className="inline-flex items-center text-sm text-gray-600"><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Uploading...</span>}
              </div>

              {media.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {media.map((m, idx) => (
                    <div key={m.id} className="relative group">
                      {/* Media preview */}
                      {m.type === 'image' ? (
                        <img src={m.url} alt="uploaded media" className="w-full h-44 object-cover rounded-xl border" />
                      ) : (
                        <video src={m.url} className="w-full h-44 object-cover rounded-xl border" controls />
                      )}

                      {/* Remove */}
                      <button type="button" onClick={() => removeMedia(m.id)} className="absolute top-2 right-2 p-1 rounded-full bg-white shadow border hover:bg-gray-50" aria-label="remove media"><Trash2 className="w-4 h-4" /></button>

                      {/* Set as cover (move to index 0) */}
                      <button
                        type="button"
                        onClick={() => setMedia((prev) => {
                          const copy = [...prev];
                          const i = copy.findIndex(x => x.id === m.id);
                          if (i > -1) {
                            const [item] = copy.splice(i, 1);
                            copy.unshift(item);
                          }
                          return copy;
                        })}
                        className="absolute bottom-2 right-2 px-2 py-1 rounded bg-white/90 text-xs border hover:bg-white"
                        title="Set as cover"
                      >
                        <Star className="w-3 h-3 inline mr-1" /> Cover
                      </button>

                      {idx === 0 && (
                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-600 text-white text-xs shadow">
                          <Star className="w-3 h-3" /> Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Topics / Tags</label>
              <div className="flex items-center gap-2 mb-2">
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} className="input flex-1" placeholder="#cloud-computing" />
                <button type="button" onClick={addTag} className="btn-outline">Add</button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {tags.map(t => (
                  <span key={t.id} className="badge-primary inline-flex items-center gap-2">#{t.name}<button type="button" onClick={() => removeTag(t.id)} className="text-xs text-red-600">Remove</button></span>
                ))}
              </div>
              {allTags.length > 0 && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {allTags.slice(0, 12).map(t => (
                    <button type="button" key={t.id} onClick={() => { if (!tags.find(x => x.id === t.id)) setTags(prev => [...prev, t]); }} className="px-3 py-1 rounded-full border text-sm bg-white border-gray-200 hover:bg-gray-50 inline-flex items-center gap-1">
                      <Tag className="w-3 h-3" aria-label="tag" /> #{t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Linked Course (optional)</label>
              <div className="flex items-center gap-2 mb-2">
                <input value={courseQuery} onChange={e => setCourseQuery(e.target.value)} className="input flex-1" placeholder="Search course title" />
              </div>
              {courseOptions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl divide-y">
                  {courseOptions.map(opt => (
                    <button type="button" key={opt.id} onClick={() => setLinkedCourse(opt)} className="w-full text-left px-4 py-2 hover:bg-gray-50">
                      {opt.title}
                    </button>
                  ))}
                </div>
              )}
              {linkedCourse && (
                <div className="mt-2 text-sm text-gray-700 inline-flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" aria-label="link" /> Linked: {linkedCourse.title}{' '}
                  <button type="button" onClick={() => setLinkedCourse(undefined)} className="text-red-600">
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => navigate('/community')} className="btn-outline">Cancel</button>
              <button type="button" onClick={submit} disabled={!canSubmit} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">Publish</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePostPage;


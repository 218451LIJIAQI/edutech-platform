import { useEffect, useMemo, useRef, useState } from 'react';
import clientLogger from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, Video, Tag, Link as LinkIcon, Trash2, Loader2, Star } from 'lucide-react';
import communityService, { CreateCommunityPostInput } from '@/services/community.service';
import { CommunityMedia, CommunityTag } from '@/types/community';
import uploadService from '@/services/upload.service';
import courseService from '@/services/course.service';
import { useAuthStore } from '@/store/auth-store';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import { hasExactHostname, parseSafeHttpUrl } from '@/utils/safe-url';
import { usePageTitle } from '@/hooks';

const MIN_CONTENT = 10;
const MAX_TAGS = 5;
const MAX_MEDIA_ITEMS = 10;
const DRAFT_STORAGE_KEY = 'community-create-post-draft-v1';
const RESTRICTED_TERMS = ['politics', 'violence', 'hate', 'porn'];

const readDraftFromStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(DRAFT_STORAGE_KEY);
  } catch (error) {
    clientLogger.warn('Failed to read community draft from storage:', error);
    return null;
  }
};

const writeDraftToStorage = (value: string) => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, value);
    return true;
  } catch (error) {
    clientLogger.warn('Failed to persist community draft:', error);
    return false;
  }
};

const clearDraftFromStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (error) {
    clientLogger.warn('Failed to clear community draft:', error);
  }
};

const normalizeTagName = (value: string): string =>
  value.trim().replace(/^#+/, '').trim();

const normalizeDraftTags = (value: unknown): CommunityTag[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();

  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') {
      return [];
    }

    const name =
      typeof (candidate as { name?: unknown }).name === 'string'
        ? normalizeTagName((candidate as { name: string }).name).toLowerCase()
        : '';

    if (!name || seen.has(name)) {
      return [];
    }

    seen.add(name);

    const rawId =
      typeof (candidate as { id?: unknown }).id === 'string'
        ? (candidate as { id: string }).id.trim()
        : '';

    return [
      {
        id: rawId || `draft-tag-${name}`,
        name,
      },
    ];
  });
};

const reconcileTagsWithCatalog = (
  selectedTags: CommunityTag[],
  availableTags: CommunityTag[]
): CommunityTag[] => {
  if (selectedTags.length === 0 || availableTags.length === 0) {
    return selectedTags;
  }

  const catalogByName = new Map(
    availableTags.map((tag) => [tag.name.trim().toLowerCase(), tag] as const)
  );

  return normalizeDraftTags(selectedTags).map(
    (tag) => catalogByName.get(tag.name.trim().toLowerCase()) ?? tag
  );
};

const containsRestrictedPostTerms = (...values: Array<string | undefined>): boolean => {
  const combined = values
    .map((value) => value?.trim().toLowerCase() || '')
    .filter(Boolean)
    .join(' ');

  return RESTRICTED_TERMS.some((term) => combined.includes(term));
};

const hasEmbeddableYouTubeVideoId = (url: URL): boolean => {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  const segments = url.pathname.split('/').filter(Boolean);

  if (hostname === 'youtu.be') {
    return Boolean(segments[0]);
  }

  if (url.pathname === '/watch') {
    return Boolean(url.searchParams.get('v'));
  }

  return (segments[0] === 'embed' || segments[0] === 'shorts') && Boolean(segments[1]);
};

const hasEmbeddableVimeoVideoId = (url: URL): boolean => {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  const segments = url.pathname.split('/').filter(Boolean);
  const candidate =
    hostname === 'player.vimeo.com' && segments[0] === 'video'
      ? segments[1]
      : segments[segments.length - 1];

  return Boolean(candidate && /^\d+$/.test(candidate));
};

const hasEmbeddableDailymotionVideoId = (url: URL): boolean => {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  const segments = url.pathname.split('/').filter(Boolean);
  const candidate =
    hostname === 'dai.ly'
      ? segments[0]
      : segments[0] === 'video'
        ? segments[1]?.split('_')[0]
        : '';

  return Boolean(candidate);
};

const classifyMediaUrl = (value: string): 'image' | 'video' | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsedUrl = parseSafeHttpUrl(trimmed);
  if (!parsedUrl) {
    return undefined;
  }

  if (/\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(trimmed)) {
    return 'image';
  }

  if (
    /\.(mp4|webm|m3u8|mov|ogg)(\?.*)?$/i.test(trimmed) ||
    (hasExactHostname(parsedUrl, ['youtube.com', 'm.youtube.com', 'youtu.be']) &&
      hasEmbeddableYouTubeVideoId(parsedUrl)) ||
    (hasExactHostname(parsedUrl, ['vimeo.com', 'player.vimeo.com']) &&
      hasEmbeddableVimeoVideoId(parsedUrl)) ||
    (hasExactHostname(parsedUrl, ['dailymotion.com', 'dai.ly']) &&
      hasEmbeddableDailymotionVideoId(parsedUrl))
  ) {
    return 'video';
  }

  return undefined;
};

const createMediaId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return `media-${Date.now()}-${performance.now().toString(36).replace('.', '')}`;
};

const CreatePostPage = () => {
  usePageTitle('Create Post');
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<CommunityTag[]>([]);
  const [allTags, setAllTags] = useState<CommunityTag[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [media, setMedia] = useState<CommunityMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');

  const [courseQuery, setCourseQuery] = useState('');
  const [courseOptions, setCourseOptions] = useState<{ id: string; title: string }[]>([]);
  const [linkedCourse, setLinkedCourse] = useState<{ id: string; title: string } | undefined>();
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const courseSearchRequestRef = useRef(0);

  const canSubmit = useMemo(() => content.trim().length >= MIN_CONTENT, [content]);

  useEffect(() => {
    (async () => {
      try {
        const loadedTags = await communityService.getTags();
        setAllTags(loadedTags);
        setTags((currentTags) => reconcileTagsWithCatalog(currentTags, loadedTags));
      } catch (error) {
        clientLogger.error('Failed to load tags:', error);
        toast.error(extractErrorMessage(error, 'Failed to load tags'));
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const savedDraft = readDraftFromStorage();
      if (!savedDraft) {
        return;
      }

      const parsedDraft = JSON.parse(savedDraft) as {
        title?: string;
        content?: string;
        tags?: CommunityTag[];
        media?: CommunityMedia[];
        linkedCourse?: { id: string; title: string };
      };

      setTitle(parsedDraft.title || '');
      setContent(parsedDraft.content || '');
      setTags(normalizeDraftTags(parsedDraft.tags));
      setMedia(Array.isArray(parsedDraft.media) ? parsedDraft.media : []);
      setLinkedCourse(parsedDraft.linkedCourse);

      if (
        parsedDraft.title ||
        parsedDraft.content ||
        (parsedDraft.tags && parsedDraft.tags.length > 0) ||
        (parsedDraft.media && parsedDraft.media.length > 0) ||
        parsedDraft.linkedCourse
      ) {
        toast.success('Recovered your saved draft');
      }
    } catch (error) {
      clientLogger.error('Failed to restore community post draft:', error);
    } finally {
      setHasLoadedDraft(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedDraft || typeof window === 'undefined') {
      return;
    }

    const hasDraftContent =
      title.trim() ||
      content.trim() ||
      tags.length > 0 ||
      media.length > 0 ||
      linkedCourse;

    if (!hasDraftContent) {
      clearDraftFromStorage();
      return;
    }

    writeDraftToStorage(
      JSON.stringify({
        title,
        content,
        tags,
        media,
        linkedCourse,
      })
    );
  }, [content, hasLoadedDraft, linkedCourse, media, tags, title]);

  useEffect(() => {
    const trimmedQuery = courseQuery.trim();

    if (!trimmedQuery) {
      courseSearchRequestRef.current += 1;
      setCourseOptions([]);
      return;
    }

    let isActive = true;
    const requestId = courseSearchRequestRef.current + 1;
    courseSearchRequestRef.current = requestId;

    const timer = setTimeout(async () => {
      try {
        const res = await courseService.getAllCourses({ search: trimmedQuery, limit: 5, page: 1 });
        const items = (res.items || res.courses || []).map((c: { id: string; title: string }) => ({ id: c.id, title: c.title }));
        if (!isActive || requestId !== courseSearchRequestRef.current) {
          return;
        }
        setCourseOptions(items);
      } catch (error) {
        clientLogger.error('Failed to search courses:', error);
        if (!isActive || requestId !== courseSearchRequestRef.current) {
          return;
        }
        setCourseOptions([]);
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [courseQuery]);

  const addTag = async () => {
    const name = normalizeTagName(tagInput);
    if (!name) return;
    if (tags.length >= MAX_TAGS) {
      toast.error(`You can add up to ${MAX_TAGS} tags`);
      return;
    }
    if (tags.find(t => t.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Tag already added');
      return;
    }
    try {
      const t = await communityService.addTag(name);
      setTags(prev => [...prev, t]);
      if (!allTags.find(x => x.id === t.id)) setAllTags(prev => [...prev, t]);
      setTagInput('');
    } catch (error) {
      clientLogger.error('Failed to add tag:', error);
      toast.error(extractErrorMessage(error, 'Failed to add tag'));
    }
  };

  const removeTag = (id: string) => setTags(prev => prev.filter(t => t.id !== id));

  const onUpload = async (file: File) => {
    if (!file) return;
    if (media.length >= MAX_MEDIA_ITEMS) {
      toast.error(`You can add up to ${MAX_MEDIA_ITEMS} media items`);
      return;
    }
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) { toast.error('Only image or video supported'); return; }
    setIsUploading(true);
    try {
      const uploadedUrl = isImage
        ? await uploadService.uploadCommunityImage(file)
        : await uploadService.uploadVideo(file);
      const m: CommunityMedia = {
        id: createMediaId(),
        type: isImage ? 'image' : 'video',
        url: uploadedUrl,
      };
      setMedia(prev => [...prev, m]);
    } catch (error) {
      clientLogger.error('Upload failed:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = (id: string) => setMedia(prev => prev.filter(m => m.id !== id));

  const addMediaByUrl = () => {
    const url = mediaUrlInput.trim();
    if (!url) {
      toast.error('Please enter a valid URL');
      return;
    }
    if (media.length >= MAX_MEDIA_ITEMS) {
      toast.error(`You can add up to ${MAX_MEDIA_ITEMS} media items`);
      return;
    }

    const type = classifyMediaUrl(url);

    if (!type) {
      toast.error('Unsupported media URL. Use an https image URL or a supported video link.');
      return;
    }

    if (media.some((item) => item.url.toLowerCase() === url.toLowerCase() && item.type === type)) {
      toast.error('This media URL has already been added');
      return;
    }

    setMedia((prev) => [
      ...prev,
      {
        id: createMediaId(),
        type,
        url,
      },
    ]);
    setMediaUrlInput('');
    toast.success('Media added successfully');
  };

  const submit = async () => {
    if (!user) return;
    const trimmed = content.trim();
    if (!canSubmit) { toast.error('Please write more content'); return; }
    if (tags.length > MAX_TAGS) {
      toast.error(`You can add up to ${MAX_TAGS} tags`);
      return;
    }
    if (media.length > MAX_MEDIA_ITEMS) {
      toast.error(`You can add up to ${MAX_MEDIA_ITEMS} media items`);
      return;
    }
    if (containsRestrictedPostTerms(title, trimmed)) {
      toast.error('Content contains restricted words, please revise and try again.');
      return;
    }

    const payload: CreateCommunityPostInput = {
      title: title.trim() || undefined,
      content: trimmed,
      tags: tags.map(({ name }) => ({ name })),
      media,
      courseId: linkedCourse?.id,
      courseTitle: linkedCourse?.title,
    };

    try {
      const created = await communityService.createPost(payload);
      clearDraftFromStorage();
      toast.success('Posted successfully');
      navigate(`/community/post/${created.id}`);
    } catch (error) {
      clientLogger.error('Failed to create post:', error);
      toast.error(extractErrorMessage(error, 'Failed to create post. Please try again.'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
            <Star className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Create <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Post</span>
            </h1>
            <p className="text-gray-500 font-medium">Share your knowledge with the community</p>
          </div>
        </div>
        <div className="card shadow-xl border border-gray-100 rounded-2xl">

          <div className="space-y-6">
            <div>
              <label htmlFor="community-post-title" className="block text-sm font-semibold text-gray-700 mb-2">Title (optional)</label>
              <input
                id="community-post-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="input"
                placeholder="Summarize your post in one sentence"
              />
            </div>

            <div>
              <label htmlFor="community-post-content" className="block text-sm font-semibold text-gray-700 mb-2">Content *</label>
              <textarea
                id="community-post-content"
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={8}
                className="input"
                placeholder="Share your learning insights, course recommendations, or progress updates"
              />
              <p className={`text-xs mt-2 ${canSubmit ? 'text-green-600' : 'text-gray-500'}`}>Post content needs at least {MIN_CONTENT} characters (current {content.trim().length})</p>
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
                    value={mediaUrlInput}
                    onChange={(e) => setMediaUrlInput(e.target.value)}
                    aria-label="Media URL"
                    placeholder="Paste image URL or video URL (YouTube/Vimeo/mp4)"
                    className="input w-80"
                  />
                  <button
                    type="button"
                    aria-label="Add media URL"
                    className="btn-outline btn-sm"
                    onClick={addMediaByUrl}
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
                        <img src={m.url} alt={title.trim() ? `${title.trim()} selected media ${idx + 1}` : `Selected media ${idx + 1}`} className="w-full h-44 object-cover rounded-xl border" />
                      ) : (
                        <video
                          src={m.url}
                          title={title.trim() ? `${title.trim()} selected media ${idx + 1}` : `Selected media ${idx + 1}`}
                          aria-label={title.trim() ? `${title.trim()} selected media ${idx + 1}` : `Selected media ${idx + 1}`}
                          className="w-full h-44 object-cover rounded-xl border"
                          controls
                        />
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
              <label htmlFor="community-post-tag" className="block text-sm font-semibold text-gray-700 mb-2">Topics / Tags</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  id="community-post-tag"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  className="input flex-1"
                  placeholder="#cloud-computing"
                />
                <button type="button" onClick={addTag} aria-label="Add topic tag" className="btn-outline">Add</button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {tags.map(t => (
                  <span key={t.id} className="badge-primary inline-flex items-center gap-2">#{t.name}<button type="button" onClick={() => removeTag(t.id)} className="text-xs text-red-600">Remove</button></span>
                ))}
              </div>
              {allTags.length > 0 && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {allTags.slice(0, 12).map(t => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => {
                        if (tags.length >= MAX_TAGS) {
                          toast.error(`You can add up to ${MAX_TAGS} tags`);
                          return;
                        }
                        if (!tags.find(x => x.id === t.id)) setTags(prev => [...prev, t]);
                      }}
                      className="px-3 py-1 rounded-full border text-sm bg-white border-gray-200 hover:bg-gray-50 inline-flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3" aria-label="tag" /> #{t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="community-post-course-search" className="block text-sm font-semibold text-gray-700 mb-2">Linked Course (optional)</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  id="community-post-course-search"
                  value={courseQuery}
                  onChange={e => setCourseQuery(e.target.value)}
                  className="input flex-1"
                  placeholder="Search course title"
                />
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
              <button
                type="button"
                onClick={() => {
                  clearDraftFromStorage();
                  navigate('/community');
                }}
                className="btn-outline"
              >
                Cancel
              </button>
              <button type="button" onClick={submit} disabled={!canSubmit} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">Publish</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePostPage;

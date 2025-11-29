import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { LessonType, Lesson } from '@/types';
import courseService from '@/services/course.service';
import uploadService from '@/services/upload.service';
import toast from 'react-hot-toast';

interface LessonModalProps {
  courseId: string;
  lessonId?: string;
  initialLesson?: Lesson;
  defaultVideoType?: 'upload' | 'link';
  onClose: () => void;
  onSuccess: () => void;
}

interface LessonFormData {
  title: string;
  description: string;
  type: LessonType;
  duration: number | string;
  isFree: boolean;
}

const LessonModal: React.FC<LessonModalProps> = ({
  courseId,
  lessonId,
  initialLesson,
  defaultVideoType,
  onClose,
  onSuccess,
}) => {
  const isEditMode = !!lessonId;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoType, setVideoType] = useState<'upload' | 'link'>('upload');
  const [videoLink, setVideoLink] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LessonFormData>({
    defaultValues: {
      type: LessonType.RECORDED,
      isFree: false,
      duration: 30,
    },
  });

  // Prefill when editing
  useEffect(() => {
    if (isEditMode && initialLesson) {
      setValue('title', initialLesson.title);
      setValue('description', initialLesson.description || '');
      setValue('type', initialLesson.type || LessonType.RECORDED);
      if (typeof initialLesson.duration === 'number') setValue('duration', initialLesson.duration);
      setValue('isFree', !!initialLesson.isFree);
      if (initialLesson.videoUrl) {
        setVideoType('link');
        setVideoLink(initialLesson.videoUrl);
      }
    }
  }, [isEditMode, initialLesson, setValue]);

  // Initialize default video type for creation
  useEffect(() => {
    if (!isEditMode && defaultVideoType) {
      setVideoType(defaultVideoType);
    }
  }, [defaultVideoType, isEditMode]);

  const onSubmit = async (data: LessonFormData) => {
    setIsSubmitting(true);
    let loadingToastId: string | undefined;
    try {
      let videoUrl = '';

      // Handle video based on selected type
      if (videoType === 'upload' && videoFile) {
        loadingToastId = toast.loading('Uploading video...');
        videoUrl = await uploadService.uploadVideo(videoFile, setUploadProgress);
        if (loadingToastId) {
          toast.dismiss(loadingToastId);
        }
      } else if (videoType === 'link' && videoLink.trim()) {
        videoUrl = videoLink.trim();
      }

      // Convert duration to number if it's a string
      const duration = typeof data.duration === 'string' 
        ? parseInt(data.duration, 10) || 0
        : data.duration;

      const lessonData = {
        ...data,
        duration,
        videoUrl: videoUrl || undefined,
      };

      if (isEditMode) {
        await courseService.updateLesson(lessonId, lessonData);
        toast.success('Lesson updated successfully!');
      } else {
        await courseService.createLesson(courseId, lessonData);
        toast.success('Lesson created successfully!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }
      console.error('Failed to save lesson:', error);
      const message = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : error instanceof Error 
        ? error.message 
        : undefined;
      toast.error(message || 'Failed to save lesson');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full my-8 z-[10000]">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-[10001]">
          <h2 className="text-xl font-bold">
            {isEditMode ? 'Edit Lesson' : 'Create New Lesson'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lesson Title *
            </label>
            <input
              type="text"
              {...register('title', { required: 'Title is required' })}
              className="input"
              placeholder="e.g., Introduction to JavaScript"
            />
            {errors.title && (
              <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="input"
              placeholder="Describe what students will learn in this lesson"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lesson Type *
            </label>
            <select {...register('type')} className="input">
              <option value={LessonType.RECORDED}>Recorded Video</option>
              <option value={LessonType.LIVE}>Live Session</option>
              <option value={LessonType.HYBRID}>Hybrid</option>
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes) *
            </label>
            <input
              type="number"
              {...register('duration', { required: 'Duration is required', min: 1 })}
              className="input"
              placeholder="30"
            />
            {errors.duration && (
              <p className="text-red-600 text-sm mt-1">{errors.duration.message}</p>
            )}
          </div>

          {/* Video */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Video (Optional)
            </label>
            
            {/* Video Type Selection */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <label className="flex items-center space-x-3 cursor-pointer p-3 bg-white rounded-lg border-2 transition-all" style={{borderColor: videoType === 'upload' ? '#3b82f6' : '#e5e7eb'}}>
                <input
                  type="radio"
                  value="upload"
                  checked={videoType === 'upload'}
                  onChange={(e) => {
                    if (e.target.value === 'upload' || e.target.value === 'link') {
                      setVideoType(e.target.value);
                      setVideoLink('');
                    }
                  }}
                  className="form-radio text-primary-600 w-4 h-4"
                />
                <span className="text-sm font-medium">Upload Video File</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer p-3 bg-white rounded-lg border-2 transition-all" style={{borderColor: videoType === 'link' ? '#3b82f6' : '#e5e7eb'}}>
                <input
                  type="radio"
                  value="link"
                  checked={videoType === 'link'}
                  onChange={(e) => {
                    if (e.target.value === 'upload' || e.target.value === 'link') {
                      setVideoType(e.target.value);
                      setVideoFile(null);
                    }
                  }}
                  className="form-radio text-primary-600 w-4 h-4"
                />
                <span className="text-sm font-medium">Paste Video URL</span>
              </label>
            </div>

            {/* Upload File Option */}
            {videoType === 'upload' && (
              <div className="space-y-3">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="input"
                />
                <p className="text-xs text-gray-600">
                  Upload a video file (max 100MB). Supported formats: MP4, WebM, MOV
                </p>
                {videoFile && (
                  <p className="text-sm text-green-600 font-medium">
                    ✓ Selected: {videoFile.name}
                  </p>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium">Uploading...</span>
                      <span className="font-bold text-primary-600">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-3">
                      <div
                        className="bg-primary-600 h-3 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Video Link Option */}
            {videoType === 'link' && (
              <div className="space-y-3">
                <input
                  type="url"
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or direct video link"
                  className="input"
                  autoFocus
                />
                <p className="text-xs text-gray-600">
                  Paste a video URL from YouTube, Vimeo, or direct video link
                </p>
                {videoLink && (
                  <p className="text-sm text-green-600 font-medium">
                    ✓ Video URL: {videoLink.substring(0, 50)}...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Is Free */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isFree"
              {...register('isFree')}
              className="mr-2"
            />
            <label htmlFor="isFree" className="text-sm text-gray-700">
              Make this lesson free (preview)
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-outline"
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? (
                <>
                  <div className="spinner mr-2"></div>
                  Saving...
                </>
              ) : isEditMode ? (
                'Update Lesson'
              ) : (
                'Create Lesson'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default LessonModal;


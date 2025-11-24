import { useState } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { LessonType } from '@/types';
import courseService from '@/services/course.service';
import uploadService from '@/services/upload.service';
import toast from 'react-hot-toast';

interface LessonModalProps {
  courseId: string;
  lessonId?: string;
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
    formState: { errors },
  } = useForm<LessonFormData>({
    defaultValues: {
      type: LessonType.RECORDED,
      isFree: false,
      duration: 30,
    },
  });

  const onSubmit = async (data: LessonFormData) => {
    setIsSubmitting(true);
    try {
      let videoUrl = '';

      // Handle video based on selected type
      if (videoType === 'upload' && videoFile) {
        toast.loading('Uploading video...');
        videoUrl = await uploadService.uploadVideo(videoFile, setUploadProgress);
      } else if (videoType === 'link' && videoLink.trim()) {
        videoUrl = videoLink.trim();
      }

      // Convert duration to number if it's a string
      const duration = typeof data.duration === 'string' 
        ? parseInt(data.duration, 10) 
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEditMode ? 'Edit Lesson' : 'Create New Lesson'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video (Optional)
            </label>
            
            {/* Video Type Selection */}
            <div className="flex space-x-4 mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="upload"
                  checked={videoType === 'upload'}
                  onChange={(e) => {
                    setVideoType(e.target.value as 'upload');
                    setVideoLink('');
                  }}
                  className="form-radio text-primary-600"
                />
                <span className="text-sm">Upload Video File</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="link"
                  checked={videoType === 'link'}
                  onChange={(e) => {
                    setVideoType(e.target.value as 'link');
                    setVideoFile(null);
                  }}
                  className="form-radio text-primary-600"
                />
                <span className="text-sm">Video Link</span>
              </label>
            </div>

            {/* Upload File Option */}
            {videoType === 'upload' && (
              <>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload a video file (max 100MB). Supported formats: MP4, WebM, MOV
                </p>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Video Link Option */}
            {videoType === 'link' && (
              <>
                <input
                  type="url"
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or direct video link"
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste a video URL from YouTube, Vimeo, or direct video link
                </p>
              </>
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
};

export default LessonModal;


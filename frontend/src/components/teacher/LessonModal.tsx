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
  duration: number;
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

      // Upload video if selected
      if (videoFile) {
        toast.info('Uploading video...');
        videoUrl = await uploadService.uploadVideo(videoFile, setUploadProgress);
      }

      const lessonData = {
        ...data,
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
      toast.error('Failed to save lesson');
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

          {/* Video Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video File
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="input"
            />
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


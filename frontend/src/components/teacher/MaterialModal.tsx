import { useState } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import courseService from '@/services/course.service';
import uploadService from '@/services/upload.service';
import toast from 'react-hot-toast';

interface MaterialModalProps {
  courseId: string;
  materialId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface MaterialFormData {
  title: string;
  description: string;
  isDownloadable: boolean;
}

const MaterialModal: React.FC<MaterialModalProps> = ({
  courseId,
  materialId,
  onClose,
  onSuccess,
}) => {
  const isEditMode = !!materialId;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialType, setMaterialType] = useState<'upload' | 'link'>('upload');
  const [materialLink, setMaterialLink] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MaterialFormData>({
    defaultValues: {
      isDownloadable: true,
    },
  });

  const onSubmit = async (data: MaterialFormData) => {
    setIsSubmitting(true);
    try {
      let fileUrl = '';
      let fileType = '';
      let fileSize = 0;

      // Handle file based on selected type
      if (materialType === 'upload' && materialFile) {
        toast.loading('Uploading material...');
        const uploadResult = await uploadService.uploadDocument(materialFile);
        fileUrl = uploadResult.url;
        fileType = uploadResult.mimeType || 'application/octet-stream';
        fileSize = uploadResult.size;
      } else if (materialType === 'link' && materialLink.trim()) {
        fileUrl = materialLink.trim();
        // Try to determine file type from URL
        const urlParts = fileUrl.split('.');
        const extension = urlParts[urlParts.length - 1].toLowerCase();
        
        const mimeTypes: { [key: string]: string } = {
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'ppt': 'application/vnd.ms-powerpoint',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'zip': 'application/zip',
          'txt': 'text/plain',
        };
        
        fileType = mimeTypes[extension] || 'application/octet-stream';
        fileSize = 0; // Unknown for external links
      } else {
        toast.error('Please upload a file or provide a link');
        setIsSubmitting(false);
        return;
      }

      const materialData = {
        ...data,
        fileUrl,
        fileType,
        fileSize,
      };

      if (isEditMode) {
        await courseService.updateMaterial(materialId, materialData);
        toast.success('Material updated successfully!');
      } else {
        await courseService.uploadMaterial(courseId, materialData);
        toast.success('Material uploaded successfully!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save material:', error);
      const message = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : error instanceof Error 
        ? error.message 
        : undefined;
      toast.error(message || 'Failed to save material');
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
            {isEditMode ? 'Edit Material' : 'Upload Material'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Material Title *
            </label>
            <input
              type="text"
              {...register('title', { required: 'Title is required' })}
              className="input"
              placeholder="e.g., Lecture Notes, Slides, Homework"
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
              placeholder="Describe what this material contains"
            />
          </div>

          {/* Material Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Material Source *
            </label>
            <div className="flex space-x-4 mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="upload"
                  checked={materialType === 'upload'}
                  onChange={(e) => {
                    setMaterialType(e.target.value as 'upload');
                    setMaterialLink('');
                  }}
                  className="form-radio text-primary-600"
                />
                <span className="text-sm">Upload File</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="link"
                  checked={materialType === 'link'}
                  onChange={(e) => {
                    setMaterialType(e.target.value as 'link');
                    setMaterialFile(null);
                  }}
                  className="form-radio text-primary-600"
                />
                <span className="text-sm">External Link</span>
              </label>
            </div>

            {/* Upload File Option */}
            {materialType === 'upload' && (
              <>
                <input
                  type="file"
                  onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, TXT (max 50MB)
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

            {/* Link Option */}
            {materialType === 'link' && (
              <>
                <input
                  type="url"
                  value={materialLink}
                  onChange={(e) => setMaterialLink(e.target.value)}
                  placeholder="https://example.com/document.pdf"
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste a direct link to the material (PDF, DOC, etc.)
                </p>
              </>
            )}
          </div>

          {/* Is Downloadable */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDownloadable"
              {...register('isDownloadable')}
              className="mr-2"
            />
            <label htmlFor="isDownloadable" className="text-sm text-gray-700">
              Allow students to download this material
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
                  Uploading...
                </>
              ) : isEditMode ? (
                'Update Material'
              ) : (
                'Upload Material'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialModal;


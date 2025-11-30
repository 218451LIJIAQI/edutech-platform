import { useState, useRef } from 'react';
import { Upload, X, File, Image, Video } from 'lucide-react';
import toast from 'react-hot-toast';

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in MB
  onFileSelect: (file: File) => void;
  onUploadComplete?: (url: string) => void;
  label?: string;
  preview?: boolean;
  disabled?: boolean;
}

/**
 * File Upload Component
 * Reusable component for uploading files with preview
 */
const FileUpload: React.FC<FileUploadProps> = ({
  accept = '*',
  maxSize = 10,
  onFileSelect,
  onUploadComplete,
  label = 'Upload File',
  preview = true,
  disabled = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);

    // Generate preview for images and videos
    if (preview && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setPreviewUrl(reader.result as string);
        }
      };
      reader.onerror = () => {
        toast.error('Failed to generate preview');
        console.error('FileReader error:', reader.error);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearFile = () => {
    // Revoke object URL to prevent memory leaks (only for blob URLs)
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Real API call to upload endpoint
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
      const response = await fetch(`${baseURL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      toast.success('File uploaded successfully!');
      const fileUrl = data?.data?.url || data?.url;
      if (fileUrl) {
        onUploadComplete?.(fileUrl);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload file';
      toast.error(message);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="w-8 h-8" />;
    
    if (selectedFile.type.startsWith('image/')) return <Image className="w-8 h-8" />;
    if (selectedFile.type.startsWith('video/')) return <Video className="w-8 h-8" />;
    return <File className="w-8 h-8" />;
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            disabled
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-primary-500 hover:bg-primary-50'
          }`}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={disabled}
            className="hidden"
            aria-label={label}
          />
          <div className="flex flex-col items-center space-y-2">
            <Upload className="w-12 h-12 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">
                <span className="text-primary-600 font-medium">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Maximum file size: {maxSize}MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-start space-x-4">
            {/* Preview */}
            {previewUrl ? (
              <div className="flex-shrink-0">
                {selectedFile.type.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded"
                  />
                ) : selectedFile.type.startsWith('video/') ? (
                  <video
                    src={previewUrl}
                    className="w-24 h-24 object-cover rounded"
                    controls
                  />
                ) : (
                  <div className="w-24 h-24 flex items-center justify-center bg-gray-200 rounded">
                    {getFileIcon()}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center bg-gray-200 rounded">
                {getFileIcon()}
              </div>
            )}

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <p className="text-xs text-gray-500">{selectedFile.type || 'Unknown type'}</p>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex items-center space-x-2">
              {!uploading && (
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  aria-label="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Upload Button */}
          {onUploadComplete && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || disabled}
              className="btn-primary w-full mt-4"
            >
              {uploading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Upload File'
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;


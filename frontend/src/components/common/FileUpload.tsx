import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react';
import { Upload, X, File as FileIcon, Image, Video, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import clientLogger from '@/utils/logger';
import { extractErrorMessage } from '@/utils/error-handler';

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in MB
  onFileSelect: (file: globalThis.File | null) => void;
  label?: string;
  preview?: boolean;
  disabled?: boolean;
}

const isAcceptedFileType = (file: globalThis.File, accept: string): boolean => {
  if (!accept || accept === '*' || accept === '*/*') {
    return true;
  }

  const acceptedTypes = accept
    .split(',')
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean);

  if (acceptedTypes.length === 0) {
    return true;
  }

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return acceptedTypes.some((acceptedType) => {
    if (acceptedType.startsWith('.')) {
      return fileName.endsWith(acceptedType);
    }

    if (acceptedType.endsWith('/*')) {
      const category = acceptedType.replace('/*', '');
      return fileType.startsWith(`${category}/`);
    }

    return fileType === acceptedType;
  });
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

/**
 * FileUpload Component
 * Reusable single-file upload component with validation, drag-and-drop support,
 * file preview, and clear/change actions.
 */
const FileUpload = ({
  accept = '*',
  maxSize = 10,
  onFileSelect,
  label = 'Upload File',
  preview = true,
  disabled = false,
}: FileUploadProps) => {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const maxSizeBytes = useMemo(() => maxSize * 1024 * 1024, [maxSize]);

  const acceptDescription = accept === '*' || accept === '*/*' ? 'Any file type' : accept;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const resetInputValue = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const clearPreviewUrl = useCallback(() => {
    setPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }

      return null;
    });
  }, []);

  const clearFile = useCallback(() => {
    clearPreviewUrl();
    setSelectedFile(null);
    setIsDragActive(false);
    setErrorMessage(null);
    onFileSelect(null);
    resetInputValue();
  }, [clearPreviewUrl, onFileSelect, resetInputValue]);

  const rejectFile = useCallback(
    (message: string) => {
      clientLogger.warn('File upload rejected:', message);
      toast.error(message);
      setErrorMessage(message);
      clearPreviewUrl();
      setSelectedFile(null);
      onFileSelect(null);
      resetInputValue();
    },
    [clearPreviewUrl, onFileSelect, resetInputValue]
  );

  const processFile = useCallback(
    (file: globalThis.File | null | undefined) => {
      if (!file || disabled) {
        return;
      }

      if (!isAcceptedFileType(file, accept)) {
        rejectFile(`Invalid file type. Accepted format: ${acceptDescription}`);
        return;
      }

      if (file.size > maxSizeBytes) {
        rejectFile(`File size must be less than ${maxSize}MB.`);
        return;
      }

      setErrorMessage(null);
      setSelectedFile(file);
      onFileSelect(file);
      clearPreviewUrl();

      if (preview && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
        try {
          const objectUrl = URL.createObjectURL(file);
          setPreviewUrl(objectUrl);
        } catch (error) {
          const message = extractErrorMessage(error, 'Failed to generate file preview');

          clientLogger.error('Preview generation failed:', error);
          toast.error(message);
          setErrorMessage(message);
        }
      }
    },
    [
      accept,
      acceptDescription,
      clearPreviewUrl,
      disabled,
      maxSize,
      maxSizeBytes,
      onFileSelect,
      preview,
      rejectFile,
    ]
  );

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    processFile(event.target.files?.[0]);
  };

  const openFilePicker = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setIsDragActive(false);
    processFile(event.dataTransfer.files?.[0]);
  };

  const handleKeyboardOpen = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFilePicker();
    }
  };

  const renderFileIcon = () => {
    if (!selectedFile) {
      return <Upload className="h-8 w-8" aria-hidden="true" />;
    }

    if (selectedFile.type.startsWith('image/')) {
      return <Image className="h-8 w-8" aria-hidden="true" />;
    }

    if (selectedFile.type.startsWith('video/')) {
      return <Video className="h-8 w-8" aria-hidden="true" />;
    }

    return <FileIcon className="h-8 w-8" aria-hidden="true" />;
  };

  return (
    <div className="space-y-4">
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        disabled={disabled}
        className="hidden"
        aria-label={label}
      />

      {!selectedFile ? (
        <div
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            disabled
              ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-70'
              : isDragActive
                ? 'cursor-pointer border-primary-500 bg-primary-50'
                : 'cursor-pointer border-gray-300 hover:border-primary-500 hover:bg-primary-50'
          }`}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`${label}. Click to upload or drag and drop a file.`}
          aria-disabled={disabled}
          onClick={openFilePicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={handleKeyboardOpen}
        >
          <div className="flex flex-col items-center space-y-2">
            <Upload className="h-12 w-12 text-gray-400" aria-hidden="true" />

            <div>
              <p className="text-sm text-gray-600">
                <span className="font-medium text-primary-600">Click to upload</span>{' '}
                or drag and drop
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Accepted: {acceptDescription}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Maximum file size: {maxSize}MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-gray-50 p-4">
          <div className="flex items-start space-x-4">
            {/* Preview */}
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded bg-gray-200">
              {previewUrl && selectedFile.type.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={`Preview of ${selectedFile.name}`}
                  className="h-24 w-24 rounded object-cover"
                />
              ) : previewUrl && selectedFile.type.startsWith('video/') ? (
                <video
                  src={previewUrl}
                  title={`Preview of ${selectedFile.name}`}
                  aria-label={`Preview of ${selectedFile.name}`}
                  className="h-24 w-24 rounded object-cover"
                  controls
                />
              ) : (
                renderFileIcon()
              )}
            </div>

            {/* File Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {selectedFile.name}
              </p>

              <p className="text-xs text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>

              <p className="text-xs text-gray-500">
                {selectedFile.type || 'Unknown file type'}
              </p>

              <button
                type="button"
                onClick={openFilePicker}
                disabled={disabled}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Change file
              </button>
            </div>

            {/* Remove Button */}
            <button
              type="button"
              onClick={clearFile}
              disabled={disabled}
              className="flex-shrink-0 rounded p-1 text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Remove selected file"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="text-sm text-danger-600" role="alert" aria-live="polite">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default FileUpload;
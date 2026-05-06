import { useId } from 'react';
import FileUpload from '@/components/common/FileUpload';
import { normalizeSafeHttpUrl } from '@/utils/safe-url';
import type { MediaSourceType } from './types';

interface ThumbnailSourceFieldProps {
  sourceType: MediaSourceType;
  link: string;
  previewError: boolean;
  onSourceTypeChange: (sourceType: MediaSourceType) => void;
  onLinkChange: (value: string) => void;
  onPreviewErrorChange: (hasError: boolean) => void;
  onFileSelect: (file: File | null) => void;
}

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,image/gif';
const MAX_IMAGE_SIZE_MB = 5;

const getSafePreviewUrl = (value: string): string => {
  const safeUrl = normalizeSafeHttpUrl(value.trim());

  return safeUrl || '';
};

export default function ThumbnailSourceField({
  sourceType,
  link,
  previewError,
  onSourceTypeChange,
  onLinkChange,
  onPreviewErrorChange,
  onFileSelect,
}: ThumbnailSourceFieldProps) {
  const groupLabelId = useId();
  const linkInputId = useId();
  const uploadOptionId = useId();
  const linkOptionId = useId();
  const safePreviewUrl = getSafePreviewUrl(link);
  const hasLinkValue = link.trim().length > 0;
  const hasPreview = Boolean(safePreviewUrl) && !previewError;

  return (
    <fieldset>
      <legend id={groupLabelId} className="mb-2 block text-sm font-medium text-gray-700">
        Course Thumbnail <span className="font-normal text-gray-500">(Optional)</span>
      </legend>

      <div
        className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
        role="radiogroup"
        aria-labelledby={groupLabelId}
      >
        <label
          htmlFor={uploadOptionId}
          className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
        >
          <input
            id={uploadOptionId}
            type="radio"
            value="upload"
            checked={sourceType === 'upload'}
            onChange={() => {
              onSourceTypeChange('upload');
              onPreviewErrorChange(false);
            }}
            className="form-radio text-primary-600"
          />
          <span>Upload Image File</span>
        </label>

        <label
          htmlFor={linkOptionId}
          className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
        >
          <input
            id={linkOptionId}
            type="radio"
            value="link"
            checked={sourceType === 'link'}
            onChange={() => {
              onSourceTypeChange('link');
              onPreviewErrorChange(false);
            }}
            className="form-radio text-primary-600"
          />
          <span>Image URL Link</span>
        </label>
      </div>

      {sourceType === 'upload' ? (
        <>
          <FileUpload
            label=""
            accept={IMAGE_ACCEPT}
            maxSize={MAX_IMAGE_SIZE_MB}
            onFileSelect={onFileSelect}
            preview
          />
          <p className="mt-2 text-xs text-gray-500">
            Recommended size: 1280 × 720 px. Supported formats: PNG, JPG, JPEG, WebP, or GIF.
            Maximum file size: {MAX_IMAGE_SIZE_MB}MB.
          </p>
        </>
      ) : (
        <>
          <label htmlFor={linkInputId} className="sr-only">
            Thumbnail image URL
          </label>
          <input
            id={linkInputId}
            type="url"
            value={link}
            onChange={(event) => {
              onLinkChange(event.target.value);
              onPreviewErrorChange(false);
            }}
            onBlur={() => {
              if (hasLinkValue && !safePreviewUrl) {
                onPreviewErrorChange(true);
              }
            }}
            placeholder="https://example.com/image.jpg"
            className="input"
            aria-invalid={hasLinkValue && (!safePreviewUrl || previewError)}
            aria-describedby={`${linkInputId}-help`}
          />
          <p id={`${linkInputId}-help`} className="mt-1 text-xs text-gray-500">
            Paste a safe HTTP or HTTPS image URL. Supported formats include JPEG, PNG, WebP,
            and GIF.
          </p>

          {hasLinkValue ? (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-gray-700">Preview:</p>

              {hasPreview ? (
                <div className="aspect-video w-full max-w-xs overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  <img
                    src={safePreviewUrl}
                    alt="Course thumbnail preview"
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onLoad={() => onPreviewErrorChange(false)}
                    onError={() => onPreviewErrorChange(true)}
                  />
                </div>
              ) : (
                <div
                  className="flex aspect-video w-full max-w-xs items-center justify-center rounded-lg border border-gray-200 bg-gray-100 px-4 text-center text-sm text-gray-600"
                  role="status"
                >
                  Unable to preview this image link. Please check that the URL is valid, public,
                  and uses HTTP or HTTPS.
                </div>
              )}
            </div>
          ) : null}
        </>
      )}
    </fieldset>
  );
}

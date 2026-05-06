import { useId } from 'react';
import FileUpload from '@/components/common/FileUpload';
import { renderPreviewVideo } from './media-utils';
import type { MediaSourceType } from './types';

interface VideoSourceFieldProps {
  sourceType: MediaSourceType;
  link: string;
  onSourceTypeChange: (sourceType: MediaSourceType) => void;
  onLinkChange: (value: string) => void;
  onFileSelect: (file: File | null) => void;
}

const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime';
const MAX_VIDEO_SIZE_MB = 500;

export default function VideoSourceField({
  sourceType,
  link,
  onSourceTypeChange,
  onLinkChange,
  onFileSelect,
}: VideoSourceFieldProps) {
  const groupLabelId = useId();
  const linkInputId = useId();
  const uploadOptionId = useId();
  const linkOptionId = useId();
  const trimmedLink = link.trim();
  const hasVideoLink = trimmedLink.length > 0;

  return (
    <fieldset>
      <legend id={groupLabelId} className="mb-2 block text-sm font-medium text-gray-700">
        Preview Video <span className="font-normal text-gray-500">(Optional)</span>
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
            onChange={() => onSourceTypeChange('upload')}
            className="form-radio text-primary-600"
          />
          <span>Upload Video File</span>
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
            onChange={() => onSourceTypeChange('link')}
            className="form-radio text-primary-600"
          />
          <span>Video Link</span>
        </label>
      </div>

      {sourceType === 'upload' ? (
        <>
          <FileUpload
            label=""
            accept={VIDEO_ACCEPT}
            maxSize={MAX_VIDEO_SIZE_MB}
            onFileSelect={onFileSelect}
            preview
          />
          <p className="mt-2 text-xs text-gray-500">
            Upload a preview video file. Supported formats: MP4, WebM, and MOV. Maximum file
            size: {MAX_VIDEO_SIZE_MB}MB.
          </p>
        </>
      ) : (
        <>
          <label htmlFor={linkInputId} className="sr-only">
            Preview video URL
          </label>
          <input
            id={linkInputId}
            type="url"
            value={link}
            onChange={(event) => onLinkChange(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
            className="input"
            aria-describedby={`${linkInputId}-help`}
          />
          <p id={`${linkInputId}-help`} className="mt-1 text-xs text-gray-500">
            Paste a YouTube, Vimeo, or direct HTTP/HTTPS video link. Invalid links will not be
            previewed.
          </p>

          {hasVideoLink ? (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-gray-700">Preview:</p>
              <div className="aspect-video overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                {renderPreviewVideo(trimmedLink)}
              </div>
            </div>
          ) : null}
        </>
      )}
    </fieldset>
  );
}

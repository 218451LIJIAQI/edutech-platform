import { useId } from 'react';
import { CheckCircle, Trash2, Video } from 'lucide-react';
import type { VideoSourceType } from './types';

interface LessonVideoSourceFieldProps {
  videoType: VideoSourceType;
  videoFile: File | null;
  videoLink: string;
  existingUploadUrl?: string;
  uploadProgress: number;
  onVideoTypeChange: (nextType: VideoSourceType) => void;
  onVideoFileChange: (file: File | null) => void;
  onClearExistingUpload?: () => void;
  onVideoLinkChange: (value: string) => void;
}

export default function LessonVideoSourceField({
  videoType,
  videoFile,
  videoLink,
  existingUploadUrl,
  uploadProgress,
  onVideoTypeChange,
  onVideoFileChange,
  onClearExistingUpload,
  onVideoLinkChange,
}: LessonVideoSourceFieldProps) {
  const groupId = useId();

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
      <span className="block text-sm font-medium text-slate-700 mb-4">
        Video (Optional)
      </span>

      <div className="flex flex-col sm:flex-row gap-4 mb-6" role="radiogroup" aria-label="Lesson video source">
        <label
          className={`flex items-center space-x-3 cursor-pointer p-3 bg-white rounded-xl border-2 transition-all ${
            videoType === 'upload'
              ? 'border-primary-600 bg-primary-50/30'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <input
            type="radio"
            name={`${groupId}-video-source`}
            value="upload"
            checked={videoType === 'upload'}
            onChange={() => onVideoTypeChange('upload')}
            className="form-radio text-primary-600 w-4 h-4"
          />
          <span className="text-sm font-medium text-slate-800">Upload Video File</span>
        </label>
        <label
          className={`flex items-center space-x-3 cursor-pointer p-3 bg-white rounded-xl border-2 transition-all ${
            videoType === 'link'
              ? 'border-primary-600 bg-primary-50/30'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <input
            type="radio"
            name={`${groupId}-video-source`}
            value="link"
            checked={videoType === 'link'}
            onChange={() => onVideoTypeChange('link')}
            className="form-radio text-primary-600 w-4 h-4"
          />
          <span className="text-sm font-medium text-slate-800">Paste Video URL</span>
        </label>
      </div>

      {videoType === 'upload' ? (
        <div className="space-y-3">
          {existingUploadUrl && !videoFile && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <Video className="h-4 w-4 shrink-0 text-primary-600" />
                <span>
                  Current uploaded video will be kept unless you choose a replacement or remove it.
                </span>
              </div>
              {onClearExistingUpload && (
                <button
                  type="button"
                  onClick={onClearExistingUpload}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
          )}

          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(event) => onVideoFileChange(event.target.files?.[0] || null)}
            className="input"
            aria-label="Upload video file"
          />
          <p className="text-xs text-gray-600">
            Upload a video file (max 500MB). Supported formats: MP4, WebM, MOV
          </p>
          {videoFile && (
            <p className="text-sm text-green-600 font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Selected: {videoFile.name}</span>
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
      ) : (
        <div className="space-y-3">
          <input
            type="url"
            aria-label="Lesson video URL"
            value={videoLink}
            onChange={(event) => onVideoLinkChange(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=... or direct video link"
            className="input"
          />
          <p className="text-xs text-gray-600">
            Paste a video URL from YouTube, Vimeo, Dailymotion, or direct video link (leave blank to clear when editing)
          </p>
          {videoLink && (
            <p className="text-sm text-green-600 font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Video URL: {videoLink.substring(0, 60)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

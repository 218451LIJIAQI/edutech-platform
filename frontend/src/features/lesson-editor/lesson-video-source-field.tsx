import { CheckCircle } from 'lucide-react';
import type { VideoSourceType } from './types';

interface LessonVideoSourceFieldProps {
  videoType: VideoSourceType;
  videoFile: File | null;
  videoLink: string;
  uploadProgress: number;
  onVideoTypeChange: (nextType: VideoSourceType) => void;
  onVideoFileChange: (file: File | null) => void;
  onVideoLinkChange: (value: string) => void;
}

export default function LessonVideoSourceField({
  videoType,
  videoFile,
  videoLink,
  uploadProgress,
  onVideoTypeChange,
  onVideoFileChange,
  onVideoLinkChange,
}: LessonVideoSourceFieldProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <label className="block text-sm font-medium text-gray-700 mb-4">
        Video (Optional)
      </label>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <label
          className="flex items-center space-x-3 cursor-pointer p-3 bg-white rounded-lg border-2 transition-all"
          style={{ borderColor: videoType === 'upload' ? '#3b82f6' : '#e5e7eb' }}
        >
          <input
            type="radio"
            value="upload"
            checked={videoType === 'upload'}
            onChange={() => onVideoTypeChange('upload')}
            className="form-radio text-primary-600 w-4 h-4"
          />
          <span className="text-sm font-medium">Upload Video File</span>
        </label>
        <label
          className="flex items-center space-x-3 cursor-pointer p-3 bg-white rounded-lg border-2 transition-all"
          style={{ borderColor: videoType === 'link' ? '#3b82f6' : '#e5e7eb' }}
        >
          <input
            type="radio"
            value="link"
            checked={videoType === 'link'}
            onChange={() => onVideoTypeChange('link')}
            className="form-radio text-primary-600 w-4 h-4"
          />
          <span className="text-sm font-medium">Paste Video URL</span>
        </label>
      </div>

      {videoType === 'upload' ? (
        <div className="space-y-3">
          <input
            type="file"
            accept="video/*"
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
            value={videoLink}
            onChange={(event) => onVideoLinkChange(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=... or direct video link"
            className="input"
          />
          <p className="text-xs text-gray-600">
            Paste a video URL from YouTube, Vimeo, or direct video link
          </p>
          {videoLink && (
            <p className="text-sm text-green-600 font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Video URL: {videoLink.substring(0, 50)}...</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

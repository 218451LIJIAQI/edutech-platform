import { Trash2, Upload, Video } from 'lucide-react';
import type { Lesson } from '@/types';

interface CourseManagementRecordingsTabProps {
  lessons: Lesson[];
  deletingLessonId: string | null;
  onAddRecording: () => void;
  onEditRecording: (lessonId: string) => void;
  onRequestDelete: (lessonId: string, title: string) => void;
}

export default function CourseManagementRecordingsTab({
  lessons,
  deletingLessonId,
  onAddRecording,
  onEditRecording,
  onRequestDelete,
}: CourseManagementRecordingsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-200 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center space-x-2">
          <Video className="w-5 h-5" />
          <span>Upload Recording Videos</span>
        </h3>

        <div className="space-y-4">
          <p className="text-purple-800">
            Add recorded videos from your live sessions or pre-recorded content. You
            can upload files or paste a video link.
          </p>

          <div>
            <button
              type="button"
              onClick={onAddRecording}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Add Recording
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h4 className="font-bold text-gray-900 mb-4">Uploaded Recordings</h4>
        {lessons.length ? (
          <div className="space-y-3">
            {lessons.map((lesson, index) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-200 text-purple-800 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{lesson.title}</p>
                    <div className="text-sm text-gray-600 flex items-center gap-3">
                      <span>Recorded</span>
                      {lesson.duration ? <span>{lesson.duration} min</span> : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditRecording(lesson.id)}
                    type="button"
                    className="btn-sm btn-outline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-label="Delete recording"
                    title="Delete recording"
                    disabled={deletingLessonId === lesson.id}
                    onClick={() => onRequestDelete(lesson.id, lesson.title)}
                    className="btn-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingLessonId === lesson.id ? (
                      <div className="spinner w-4 h-4"></div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No recordings uploaded yet.</p>
        )}
      </div>
    </div>
  );
}

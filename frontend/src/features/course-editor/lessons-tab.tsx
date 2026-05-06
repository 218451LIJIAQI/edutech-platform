import { PlayCircle, Plus, Trash2 } from 'lucide-react';
import type { Lesson } from '@/types';

interface CourseEditorLessonsTabProps {
  courseExists: boolean;
  lessons: Lesson[];
  onAddLesson: () => void;
  onEditLesson: (lessonId: string) => void;
  onRequestDelete: (lessonId: string, lessonTitle: string) => void;
}

function formatLessonType(type: Lesson['type']) {
  return String(type)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDuration(duration?: number | null) {
  if (!duration || duration <= 0) {
    return null;
  }

  return `${duration} min`;
}

export default function CourseEditorLessonsTab({
  courseExists,
  lessons,
  onAddLesson,
  onEditLesson,
  onRequestDelete,
}: CourseEditorLessonsTabProps) {
  if (!courseExists) {
    return (
      <section className="text-center py-12" aria-labelledby="lessons-disabled-title">
        <PlayCircle
          className="w-16 h-16 text-gray-300 mx-auto mb-4"
          aria-hidden="true"
        />
        <h2 id="lessons-disabled-title" className="text-lg font-semibold text-gray-900">
          Lessons are not available yet
        </h2>
        <p className="text-gray-600 mt-2">
          Please save the basic course information before adding lessons.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="course-lessons-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 id="course-lessons-title" className="text-xl font-bold text-gray-900">
            Course Lessons
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Add, edit, and manage the lesson content for this course.
          </p>
        </div>

        <button type="button" onClick={onAddLesson} className="btn-primary self-start sm:self-auto">
          <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
          Add Lesson
        </button>
      </div>

      {lessons.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <PlayCircle
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
            aria-hidden="true"
          />
          <h3 className="text-lg font-semibold text-gray-900">No lessons yet</h3>
          <p className="text-gray-600 mt-2 mb-4">
            Start building your course by adding the first lesson.
          </p>
          <button type="button" onClick={onAddLesson} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Add Your First Lesson
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson, index) => {
            const durationLabel = formatDuration(lesson.duration);
            const lessonTitle = lesson.title?.trim() || `Lesson ${index + 1}`;

            return (
              <article
                key={lesson.id}
                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-gray-500 border border-gray-200">
                    {index + 1}
                  </span>

                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{lessonTitle}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-600">
                      <span className="badge-sm">{formatLessonType(lesson.type)}</span>
                      {durationLabel ? <span>{durationLabel}</span> : null}
                      {lesson.isFree ? (
                        <span className="badge-sm bg-green-100 text-green-800">Free</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => onEditLesson(lesson.id)}
                    className="btn-sm btn-outline"
                    aria-label={`Edit ${lessonTitle}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestDelete(lesson.id, lessonTitle)}
                    className="btn-sm text-red-600 hover:bg-red-50"
                    title={`Delete ${lessonTitle}`}
                    aria-label={`Delete ${lessonTitle}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

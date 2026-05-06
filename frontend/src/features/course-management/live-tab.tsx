import { Radio, Clock3, Lock, Sparkles } from 'lucide-react';
import { LessonType } from '@/types';
import type { Course } from '@/types';

interface CourseManagementLiveTabProps {
  course: Course;
}

const getLiveLessonLabel = (type: LessonType) => {
  switch (type) {
    case LessonType.HYBRID:
      return 'Hybrid';
    case LessonType.LIVE:
    default:
      return 'Live';
  }
};

export default function CourseManagementLiveTab({
  course,
}: CourseManagementLiveTabProps) {
  const lessons = course.lessons || [];
  const liveLessons = lessons.filter(
    (lesson) =>
      lesson.type === LessonType.LIVE || lesson.type === LessonType.HYBRID
  );
  const totalLiveMinutes = liveLessons.reduce(
    (sum, lesson) => sum + (lesson.duration || 0),
    0
  );
  const freeAccessCount = liveLessons.filter((lesson) => lesson.isFree).length;
  const readinessState =
    course.courseType === 'RECORDED'
      ? 'This course is recorded-only, so live room controls will stay inactive until you add a live or hybrid lesson.'
      : liveLessons.length > 0
      ? 'Students can use the live workflow on the lessons listed below once a runtime session is started for them.'
      : 'This course is marked for live-capable delivery, but there are no live or hybrid lessons configured yet.';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 p-6 rounded-lg">
        <div className="flex items-start space-x-4">
          <Radio className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-red-900 mb-2">
              Live Teaching Readiness
            </h3>
            <p className="text-red-800">
              {readinessState}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm font-medium text-gray-500">Live-capable lessons</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {liveLessons.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm font-medium text-gray-500">Planned live minutes</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalLiveMinutes}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm font-medium text-gray-500">Free-access live lessons</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {freeAccessCount}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h4 className="font-bold text-gray-900 mb-4">Live Lesson Plan</h4>
        {liveLessons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-gray-600">
            No live or hybrid lessons are configured for this course yet. Add at least one live-capable lesson in the editor before expecting students to join a live room.
          </div>
        ) : (
          <div className="space-y-3">
            {liveLessons
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((lesson) => (
                <div
                  key={lesson.id}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          Lesson {lesson.orderIndex}
                        </span>
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                          {getLiveLessonLabel(lesson.type)}
                        </span>
                        {lesson.isFree ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Free access
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            <Lock className="h-3 w-3" />
                            Enrolled access
                          </span>
                        )}
                      </div>
                      <h5 className="mt-3 text-lg font-semibold text-gray-900">
                        {lesson.title}
                      </h5>
                      {lesson.description ? (
                        <p className="mt-1 text-sm text-gray-600">
                          {lesson.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="text-sm text-gray-600">
                      <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5">
                        <Clock3 className="h-4 w-4" />
                        {lesson.duration ? `${lesson.duration} min` : 'Duration not set'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>
            This tab focuses on the actual live and hybrid lesson structure configured for the course. Detailed runtime session history is not shown in this portal view.
          </p>
        </div>
      </div>
    </div>
  );
}

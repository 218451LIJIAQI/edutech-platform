import { ArrowLeft, Edit } from 'lucide-react';

interface CourseEditorHeaderProps {
  isEditMode: boolean;
  isPublished: boolean;
  onBack: () => void;
  onTogglePublish: () => void;
}

export default function CourseEditorHeader({
  isEditMode,
  isPublished,
  onBack,
  onTogglePublish,
}: Readonly<CourseEditorHeaderProps>) {
  const pageAction = isEditMode ? 'Edit' : 'Create';
  const description = isEditMode
    ? 'Update your course information before publishing changes to students.'
    : 'Create a new course and prepare it for your students.';
  const publishButtonLabel = isPublished ? 'Unpublish' : 'Publish';

  return (
    <header className="mb-8" aria-labelledby="course-editor-title">
      <button
        type="button"
        onClick={onBack}
        className="btn-outline mb-6 inline-flex items-center"
        aria-label="Back to courses"
      >
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
        Back to Courses
      </button>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 shadow-lg shadow-primary-500/25">
            <Edit className="h-6 w-6 text-white" aria-hidden="true" />
          </div>

          <div>
            <h1 id="course-editor-title" className="text-3xl font-extrabold text-gray-900">
              {pageAction}{' '}
              <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                Course
              </span>
            </h1>
            <p className="font-medium text-gray-500">{description}</p>
          </div>
        </div>

        {isEditMode && (
          <button
            type="button"
            onClick={onTogglePublish}
            aria-pressed={isPublished}
            className={`btn ${
              isPublished
                ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white hover:from-yellow-700 hover:to-yellow-800'
                : 'btn-primary'
            }`}
          >
            {publishButtonLabel}
          </button>
        )}
      </div>
    </header>
  );
}

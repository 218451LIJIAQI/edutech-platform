import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  BookOpen,
  Video,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Loader,
  Radio,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import courseService from '@/services/course.service';
import { CourseType, LessonType } from '@/types';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import clientLogger from '@/utils/logger';
import { courseCategories } from '@/features/course-editor/constants';
import { useOverlayAccessibility } from '@/hooks';

const COURSE_TYPES = [
  {
    value: CourseType.RECORDED,
    label: 'Recorded',
    description: 'Pre-recorded video lessons',
    icon: Video,
  },
  {
    value: CourseType.LIVE,
    label: 'Live Sessions',
    description: 'Real-time online classes',
    icon: Radio,
  },
  {
    value: CourseType.HYBRID,
    label: 'Hybrid',
    description: 'Live + recorded content',
    icon: PlayCircle,
  },
] as const;

interface QuickStartGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuickStartGuide = ({ isOpen, onClose }: QuickStartGuideProps) => {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [courseType, setCourseType] = useState<CourseType>(CourseType.RECORDED);

  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);

  const resetForm = () => {
    setStep(1);
    setTitle('');
    setDescription('');
    setCategory('');
    setCourseType(CourseType.RECORDED);
    setLessonTitle('');
    setLessonVideoUrl('');
    setCreatedCourseId(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  useOverlayAccessibility({
    isOpen,
    containerRef: modalRef,
    initialFocusRef: titleInputRef,
    onClose: handleClose,
    trapFocus: true,
    lockBodyScroll: true,
  });

  const isStep1Valid =
    title.trim().length >= 3 &&
    description.trim().length >= 10 &&
    category !== '';
  const isStep2Valid = lessonTitle.trim().length >= 2;

  const handleCreateCourseAndLesson = async () => {
    if (!isStep1Valid || !isStep2Valid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let targetCourseId = createdCourseId;
      if (!targetCourseId) {
        const course = await courseService.createCourse({
          title: title.trim(),
          description: description.trim(),
          category,
          courseType,
        });
        targetCourseId = course.id;
        setCreatedCourseId(course.id);
      } else {
        await courseService.updateCourse(targetCourseId, {
          title: title.trim(),
          description: description.trim(),
          category,
          courseType,
        });
      }

      await courseService.createLesson(targetCourseId, {
        title: lessonTitle.trim(),
        type: courseType === CourseType.LIVE ? LessonType.LIVE : LessonType.RECORDED,
        isFree: true,
        ...(lessonVideoUrl.trim() ? { videoUrl: lessonVideoUrl.trim() } : {}),
      });

      toast.success('Course and first lesson created successfully!');
      setStep(3);
    } catch (error) {
      clientLogger.error('Quick Start: failed to create course/lesson:', error);
      toast.error(extractErrorMessage(error, 'Failed to create course'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToCourse = () => {
    if (createdCourseId) {
      navigate(`/teacher/courses/${createdCourseId}/edit`);
    }
    handleClose();
  };

  const handleGoToCourses = () => {
    navigate('/teacher/courses');
    handleClose();
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-start-guide-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-indigo-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="quick-start-guide-title" className="text-lg font-bold text-gray-900">
                Quick Start Guide
              </h2>
              <p className="text-sm text-gray-500">Create your first course in minutes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close quick start guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Course Basics', icon: BookOpen },
              { num: 2, label: 'First Lesson', icon: Video },
              { num: 3, label: 'Done!', icon: CheckCircle },
            ].map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      step >= s.num
                        ? 'bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {step > s.num ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <s.icon className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:inline ${
                      step >= s.num ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < 2 && (
                  <div
                    className={`w-12 sm:w-20 h-0.5 mx-2 transition-colors ${
                      step > s.num ? 'bg-primary-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-6">
          {step === 1 && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <strong>Quick Start</strong>
                </div>
                Fill in the basics to create your course. You can always add pricing, materials, and more details later.
              </div>

              <div>
                <label htmlFor="qs-title" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Course Title <span className="text-red-500">*</span>
                </label>
                <input
                  ref={titleInputRef}
                  id="qs-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Introduction to Web Development"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  maxLength={200}
                />
                {title.trim().length > 0 && title.trim().length < 3 && (
                  <p className="mt-1 text-xs text-red-500">Title must be at least 3 characters</p>
                )}
              </div>

              <div>
                <label htmlFor="qs-desc" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="qs-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe what students will learn..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                  maxLength={5000}
                />
                {description.trim().length > 0 && description.trim().length < 10 && (
                  <p className="mt-1 text-xs text-red-500">Description must be at least 10 characters</p>
                )}
              </div>

              <div>
                <label htmlFor="qs-category" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="qs-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                >
                  <option value="">Select a category</option>
                  {courseCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span id="qs-course-type-label" className="block text-sm font-semibold text-gray-700 mb-2">
                  Course Type <span className="text-red-500">*</span>
                </span>
                <div role="group" aria-labelledby="qs-course-type-label" className="grid grid-cols-3 gap-3">
                  {COURSE_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      type="button"
                      aria-pressed={courseType === ct.value}
                      onClick={() => setCourseType(ct.value)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        courseType === ct.value
                          ? 'border-primary-500 bg-primary-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <ct.icon
                        className={`w-6 h-6 mx-auto mb-1.5 ${
                          courseType === ct.value ? 'text-primary-600' : 'text-gray-400'
                        }`}
                      />
                      <p
                        className={`text-sm font-semibold ${
                          courseType === ct.value ? 'text-primary-700' : 'text-gray-700'
                        }`}
                      >
                        {ct.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{ct.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
                <div className="flex items-center gap-2 mb-1">
                  <Video className="w-4 h-4" />
                  <strong>Add Your First Lesson</strong>
                </div>
                Add a title and optionally a video URL. This lesson will be set as free so students can preview it.
              </div>

              <div>
                <label htmlFor="qs-lesson-title" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Lesson Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="qs-lesson-title"
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. Getting Started with HTML"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  maxLength={200}
                />
                {lessonTitle.trim().length > 0 && lessonTitle.trim().length < 2 && (
                  <p className="mt-1 text-xs text-red-500">Lesson title must be at least 2 characters</p>
                )}
              </div>

              <div>
                <label htmlFor="qs-lesson-video" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Video URL <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="qs-lesson-video"
                  type="url"
                  value={lessonVideoUrl}
                  onChange={(e) => setLessonVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or video link"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
                <p className="mt-1 text-xs text-gray-500">
                  You can add or change the video later from the course editor.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                <strong>What&apos;s skipped for now:</strong> Pricing packages and course materials can be added
                later through the full course editor. Focus on getting your first content out!
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Course Created!</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Your course <strong className="text-primary-600">&ldquo;{title}&rdquo;</strong> has been created
                with its first lesson. You can now add more lessons, pricing, and materials.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleGoToCourse}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all"
                >
                  Continue Editing Course
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleGoToCourses}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Go to My Courses
                </button>
              </div>
            </div>
          )}
        </div>

        {step < 3 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-2xl">
            {step === 1 ? (
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Add Lesson
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleCreateCourseAndLesson()}
                disabled={!isStep2Valid || isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Create Course &amp; Lesson
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default QuickStartGuide;

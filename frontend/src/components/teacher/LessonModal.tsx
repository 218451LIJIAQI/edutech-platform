import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { FC, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import clientLogger from '@/utils/logger';
import { LessonType } from '@/types';
import courseService from '@/services/course.service';
import uploadService from '@/services/upload.service';
import { extractErrorMessage } from '@/utils/error-handler';
import { useOverlayAccessibility } from '@/hooks';
import LessonQuizEditor from '@/features/lesson-editor/lesson-quiz-editor';
import LessonVideoSourceField from '@/features/lesson-editor/lesson-video-source-field';
import { buildLessonSavePayload } from '@/features/lesson-editor/lesson-persistence';
import {
  appendQuizOption,
  appendQuizQuestion,
  createEmptyQuizQuestion,
  createQuizQuestionsFromLesson,
  removeQuizOptionAt,
  removeQuizQuestionAt,
  updateQuizOptionField,
  updateQuizQuestionField,
} from '@/features/lesson-editor/quiz-utils';
import type {
  EditableQuizQuestion,
  LessonFormData,
  LessonModalProps,
} from '@/features/lesson-editor/types';

const DEFAULT_LESSON_VALUES: LessonFormData = {
  title: '',
  description: '',
  type: LessonType.RECORDED,
  isFree: false,
  duration: 30,
};

const LessonModal: FC<LessonModalProps> = ({
  courseId,
  lessonId,
  initialLesson,
  defaultVideoType,
  onClose,
  onSuccess,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const typeId = useId();
  const durationId = useId();

  const isEditMode = Boolean(lessonId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoType, setVideoType] = useState<'upload' | 'link'>(defaultVideoType ?? 'upload');
  const [videoLink, setVideoLink] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [quizEnabled, setQuizEnabled] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<EditableQuizQuestion[]>([
    createEmptyQuizQuestion(),
  ]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LessonFormData>({
    defaultValues: DEFAULT_LESSON_VALUES,
  });

  const { ref: titleRegisterRef, ...titleField } = register('title', {
    required: 'Title is required',
    validate: (value) =>
      value.trim().length > 0 || 'Title cannot be empty',
  });

  const handleRequestClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  useOverlayAccessibility({
    isOpen: true,
    containerRef: modalRef,
    initialFocusRef: titleInputRef,
    onClose: handleRequestClose,
    trapFocus: true,
    lockBodyScroll: true,
  });

  useEffect(() => {
    if (isEditMode && initialLesson) {
      reset({
        title: initialLesson.title,
        description: initialLesson.description ?? '',
        type: initialLesson.type ?? LessonType.RECORDED,
        duration:
          typeof initialLesson.duration === 'number'
            ? initialLesson.duration
            : DEFAULT_LESSON_VALUES.duration,
        isFree: Boolean(initialLesson.isFree),
      });

      setVideoFile(null);
      setUploadProgress(0);

      if (initialLesson.videoUrl) {
        setVideoType('link');
        setVideoLink(initialLesson.videoUrl);
      } else {
        setVideoType(defaultVideoType ?? 'upload');
        setVideoLink('');
      }

      if (initialLesson.quiz?.questions?.length) {
        setQuizEnabled(true);
        setQuizQuestions(createQuizQuestionsFromLesson(initialLesson.quiz));
      } else {
        setQuizEnabled(false);
        setQuizQuestions([createEmptyQuizQuestion()]);
      }

      return;
    }

    reset(DEFAULT_LESSON_VALUES);
    setVideoFile(null);
    setVideoType(defaultVideoType ?? 'upload');
    setVideoLink('');
    setUploadProgress(0);
    setQuizEnabled(false);
    setQuizQuestions([createEmptyQuizQuestion()]);
  }, [defaultVideoType, initialLesson, isEditMode, reset]);

  const updateQuizQuestion = (
    index: number,
    field: keyof EditableQuizQuestion,
    value: string | number | string[]
  ) => {
    setQuizQuestions((current) =>
      updateQuizQuestionField(current, index, field, value)
    );
  };

  const updateQuizOption = (
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    setQuizQuestions((current) =>
      updateQuizOptionField(current, questionIndex, optionIndex, value)
    );
  };

  const addQuizQuestion = () => {
    setQuizQuestions((current) => appendQuizQuestion(current));
  };

  const removeQuizQuestion = (index: number) => {
    setQuizQuestions((current) => removeQuizQuestionAt(current, index));
  };

  const addQuizOption = (questionIndex: number) => {
    setQuizQuestions((current) => appendQuizOption(current, questionIndex));
  };

  const removeQuizOption = (questionIndex: number, optionIndex: number) => {
    setQuizQuestions((current) =>
      removeQuizOptionAt(current, questionIndex, optionIndex)
    );
  };

  const onSubmit = async (data: LessonFormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const lessonData = await buildLessonSavePayload({
        data,
        videoType,
        videoFile,
        videoLink,
        existingLesson: initialLesson,
        quizEnabled,
        quizQuestions,
        uploadService,
        uploadProgressHandler: setUploadProgress,
        toastController: {
          show: toast.loading,
          dismiss: toast.dismiss,
        },
      });

      if (isEditMode && lessonId) {
        await courseService.updateLesson(lessonId, lessonData);
        toast.success('Lesson updated successfully!');
      } else {
        await courseService.createLesson(courseId, lessonData);
        toast.success('Lesson created successfully!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      clientLogger.error('Failed to save lesson:', error);
      toast.error(extractErrorMessage(error, 'Failed to save lesson'));
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleRequestClose();
    }
  };

  const handleVideoTypeChange = (nextType: 'upload' | 'link') => {
    setVideoType(nextType);
    setUploadProgress(0);

    if (nextType === 'upload') {
      setVideoLink('');
      return;
    }

    setVideoFile(null);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-modal-title"
        aria-describedby="lesson-modal-description"
        className="z-[10000] my-8 w-full max-w-2xl rounded-lg bg-white shadow-xl"
      >
        <div className="sticky top-0 z-[10001] flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 id="lesson-modal-title" className="text-xl font-bold text-gray-900">
            {isEditMode ? 'Edit Lesson' : 'Create New Lesson'}
          </h2>

          <button
            type="button"
            onClick={handleRequestClose}
            disabled={isSubmitting}
            className="rounded-md p-1 text-gray-400 transition hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close lesson modal"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="max-h-[calc(90vh-120px)] space-y-6 overflow-y-auto p-6"
        >
          <p id="lesson-modal-description" className="sr-only">
            {isEditMode
              ? 'Update the lesson details, media source, quiz, and access settings.'
              : 'Create a new lesson with its title, media source, quiz, and access settings.'}
          </p>

          <div>
            <label
              htmlFor={titleId}
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Lesson Title *
            </label>
            <input
              id={titleId}
              ref={(node) => {
                titleRegisterRef(node);
                titleInputRef.current = node;
              }}
              type="text"
              {...titleField}
              className="input"
              placeholder="e.g., Introduction to JavaScript"
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor={descriptionId}
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id={descriptionId}
              {...register('description')}
              rows={3}
              className="input"
              placeholder="Describe what students will learn in this lesson"
            />
          </div>

          <div>
            <label
              htmlFor={typeId}
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Lesson Type *
            </label>
            <select id={typeId} {...register('type')} className="input">
              <option value={LessonType.RECORDED}>Recorded Video</option>
              <option value={LessonType.LIVE}>Live Session</option>
              <option value={LessonType.HYBRID}>Hybrid</option>
            </select>
          </div>

          <div>
            <label
              htmlFor={durationId}
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Duration (minutes) *
            </label>
            <input
              id={durationId}
              type="number"
              min={1}
              {...register('duration', {
                required: 'Duration is required',
                valueAsNumber: true,
                min: {
                  value: 1,
                  message: 'Duration must be at least 1 minute',
                },
              })}
              className="input"
              placeholder="30"
              aria-invalid={Boolean(errors.duration)}
            />
            {errors.duration && (
              <p className="mt-1 text-sm text-red-600">
                {errors.duration.message}
              </p>
            )}
          </div>

          <LessonVideoSourceField
            videoType={videoType}
            videoFile={videoFile}
            videoLink={videoLink}
            uploadProgress={uploadProgress}
            onVideoTypeChange={handleVideoTypeChange}
            onVideoFileChange={setVideoFile}
            onVideoLinkChange={setVideoLink}
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isFree"
              {...register('isFree')}
              className="mr-2"
            />
            <label htmlFor="isFree" className="text-sm text-gray-700">
              Make this lesson free as a preview
            </label>
          </div>

          <LessonQuizEditor
            enabled={quizEnabled}
            questions={quizQuestions}
            onToggleEnabled={(enabled) => {
              setQuizEnabled(enabled);
              if (enabled && quizQuestions.length === 0) {
                setQuizQuestions([createEmptyQuizQuestion()]);
              }
            }}
            onQuestionFieldChange={updateQuizQuestion}
            onOptionChange={updateQuizOption}
            onAddQuestion={addQuizQuestion}
            onRemoveQuestion={removeQuizQuestion}
            onAddOption={addQuizOption}
            onRemoveOption={removeQuizOption}
          />

          <div className="flex items-center justify-end space-x-4 border-t pt-4">
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={isSubmitting}
              className="btn-outline"
            >
              Cancel
            </button>

            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? (
                <>
                  <div className="spinner mr-2" aria-hidden="true" />
                  Saving...
                </>
              ) : isEditMode ? (
                'Update Lesson'
              ) : (
                'Create Lesson'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
};

export default LessonModal;

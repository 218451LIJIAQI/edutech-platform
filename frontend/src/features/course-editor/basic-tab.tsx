import type { FormEventHandler } from 'react';
import { Save, Sparkles } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { CourseType } from '@/types';
import ThumbnailSourceField from './thumbnail-source-field';
import VideoSourceField from './video-source-field';
import {
  courseCategories,
  courseTypeHighlights,
  courseTypeOptions,
} from './constants';
import type { CourseFormData, MediaSourceType } from './types';

interface CourseEditorBasicTabProps {
  register: UseFormRegister<CourseFormData>;
  errors: FieldErrors<CourseFormData>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  isSaving: boolean;
  isEditMode: boolean;
  thumbnailType: MediaSourceType;
  thumbnailLink: string;
  thumbnailPreviewError: boolean;
  previewVideoType: MediaSourceType;
  previewVideoLink: string;
  onCancel: () => void;
  onThumbnailSourceTypeChange: (sourceType: MediaSourceType) => void;
  onThumbnailLinkChange: (link: string) => void;
  onThumbnailPreviewErrorChange: (hasError: boolean) => void;
  onThumbnailFileSelect: (file: File | null) => void;
  onPreviewVideoSourceTypeChange: (sourceType: MediaSourceType) => void;
  onPreviewVideoLinkChange: (link: string) => void;
  onPreviewVideoFileSelect: (file: File | null) => void;
}

export default function CourseEditorBasicTab({
  register,
  errors,
  onSubmit,
  isSaving,
  isEditMode,
  thumbnailType,
  thumbnailLink,
  thumbnailPreviewError,
  previewVideoType,
  previewVideoLink,
  onCancel,
  onThumbnailSourceTypeChange,
  onThumbnailLinkChange,
  onThumbnailPreviewErrorChange,
  onThumbnailFileSelect,
  onPreviewVideoSourceTypeChange,
  onPreviewVideoLinkChange,
  onPreviewVideoFileSelect,
}: CourseEditorBasicTabProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div>
        <label
          htmlFor="course-title"
          className="mb-3 block text-sm font-semibold text-gray-700"
        >
          Course Title *
        </label>
        <input
          id="course-title"
          type="text"
          {...register('title', {
            required: 'Title is required',
            minLength: {
              value: 5,
              message: 'Title must be at least 5 characters',
            },
            maxLength: {
              value: 200,
              message: 'Title must not exceed 200 characters',
            },
            validate: (value) =>
              value.trim().length >= 5 ||
              'Title must be at least 5 non-empty characters',
          })}
          className="input"
          placeholder="Enter course title (minimum 5 characters)"
          disabled={isSaving}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'course-title-error' : undefined}
        />
        {errors.title ? (
          <p id="course-title-error" className="mt-2 text-sm font-medium text-red-600">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="course-description"
          className="mb-3 block text-sm font-semibold text-gray-700"
        >
          Description *
        </label>
        <textarea
          id="course-description"
          {...register('description', {
            required: 'Description is required',
            minLength: {
              value: 20,
              message: 'Description must be at least 20 characters',
            },
            maxLength: {
              value: 2000,
              message: 'Description must not exceed 2000 characters',
            },
            validate: (value) =>
              value.trim().length >= 20 ||
              'Description must be at least 20 non-empty characters',
          })}
          rows={6}
          className="input"
          placeholder="Describe your course, what students will learn, prerequisites, etc. (minimum 20 characters)"
          disabled={isSaving}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={
            errors.description ? 'course-description-error' : undefined
          }
        />
        {errors.description ? (
          <p
            id="course-description-error"
            className="mt-2 text-sm font-medium text-red-600"
          >
            {errors.description.message}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="course-category"
          className="mb-3 block text-sm font-semibold text-gray-700"
        >
          Category *
        </label>
        <select
          id="course-category"
          {...register('category', { required: 'Category is required' })}
          className="input"
          disabled={isSaving}
          aria-invalid={Boolean(errors.category)}
          aria-describedby={errors.category ? 'course-category-error' : undefined}
        >
          <option value="">Select a category</option>
          {courseCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {errors.category ? (
          <p id="course-category-error" className="mt-1 text-sm text-red-600">
            {errors.category.message}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="course-type"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Course Type *
          <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-primary-600">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Platform Feature
          </span>
        </label>
        <select
          id="course-type"
          {...register('courseType', { required: 'Course type is required' })}
          className="input"
          defaultValue={CourseType.RECORDED}
          disabled={isSaving}
          aria-invalid={Boolean(errors.courseType)}
          aria-describedby={
            errors.courseType ? 'course-type-error' : 'course-type-help'
          }
        >
          <option value="">Select course type</option>
          {courseTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} - {option.description}
            </option>
          ))}
        </select>
        {errors.courseType ? (
          <p id="course-type-error" className="mt-1 text-sm text-red-600">
            {errors.courseType.message}
          </p>
        ) : null}

        <p id="course-type-help" className="mt-1 text-xs text-gray-500">
          This is a key platform feature. It clearly tells students whether the
          course is live, recorded, or a hybrid format.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-600 md:grid-cols-3">
          {courseTypeHighlights.map(
            ({ label, icon: HighlightIcon, iconClassName }) => (
              <div
                key={label}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <HighlightIcon
                  className={`h-4 w-4 ${iconClassName}`}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </div>
            )
          )}
        </div>
      </div>

      <ThumbnailSourceField
        sourceType={thumbnailType}
        link={thumbnailLink}
        previewError={thumbnailPreviewError}
        onSourceTypeChange={onThumbnailSourceTypeChange}
        onLinkChange={onThumbnailLinkChange}
        onPreviewErrorChange={onThumbnailPreviewErrorChange}
        onFileSelect={onThumbnailFileSelect}
      />

      <VideoSourceField
        sourceType={previewVideoType}
        link={previewVideoLink}
        onSourceTypeChange={onPreviewVideoSourceTypeChange}
        onLinkChange={onPreviewVideoLinkChange}
        onFileSelect={onPreviewVideoFileSelect}
      />

      <div className="flex items-center justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="btn-outline"
        >
          Cancel
        </button>

        <button type="submit" disabled={isSaving} className="btn-primary">
          {isSaving ? (
            <>
              <div className="spinner mr-2" aria-hidden="true" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              {isEditMode ? 'Update Course' : 'Create Course'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import clientLogger from '@/utils/logger';
import { extractErrorMessage } from '@/utils/error-handler';
import courseService from '@/services/course.service';
import uploadService from '@/services/upload.service';
import { useOverlayAccessibility } from '@/hooks';
import MaterialSourceField from '@/features/course-editor/material-source-field';
import { buildMaterialSavePayload } from '@/features/course-editor/material-persistence';

import type { Material } from '@/types';
import type {
  MaterialFormData,
  MaterialSourceType,
} from '@/features/course-editor/types';

interface MaterialModalProps {
  courseId: string;
  materialId?: string;
  initialMaterial?: Material;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * MaterialModal
 *
 * Allows teachers to upload a new course material or edit an existing material.
 * Supports both file upload and external resource links.
 */
const MaterialModal = ({
  courseId,
  materialId,
  initialMaterial,
  onClose,
  onSuccess,
}: MaterialModalProps) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const isEditMode = Boolean(materialId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialType, setMaterialType] = useState<MaterialSourceType>('upload');
  const [materialLink, setMaterialLink] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MaterialFormData>({
    defaultValues: {
      title: '',
      description: '',
      isDownloadable: true,
    },
  });

  const { ref: titleRegisterRef, ...titleField } = register('title', {
    required: 'Title is required',
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
    if (!isEditMode || !initialMaterial) {
      return;
    }

    setValue('title', initialMaterial.title);
    setValue('description', initialMaterial.description || '');
    setValue('isDownloadable', initialMaterial.isDownloadable);

    setMaterialType('link');
    setMaterialLink(initialMaterial.fileUrl || '');
    setMaterialFile(null);
  }, [initialMaterial, isEditMode, setValue]);

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleRequestClose();
    }
  };

  const onSubmit = async (data: MaterialFormData) => {
    if (isEditMode && !materialId) {
      toast.error('Material ID is missing. Please refresh and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const materialData = await buildMaterialSavePayload({
        data,
        materialType,
        materialFile,
        materialLink,
        existingMaterial: initialMaterial,
        uploadService,
        toastController: {
          show: (message) => toast.loading(message),
          dismiss: (toastId) => toast.dismiss(toastId),
        },
      });

      if (isEditMode && materialId) {
        await courseService.updateMaterial(materialId, materialData);
        toast.success('Material updated successfully!');
      } else {
        await courseService.uploadMaterial(courseId, materialData);
        toast.success('Material uploaded successfully!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      clientLogger.error('Failed to save material:', error);
      toast.error(extractErrorMessage(error, 'Failed to save material'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="material-modal-title"
        aria-describedby="material-modal-description"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 id="material-modal-title" className="text-xl font-bold text-gray-900">
            {isEditMode ? 'Edit Material' : 'Upload Material'}
          </h2>

          <button
            type="button"
            onClick={handleRequestClose}
            disabled={isSubmitting}
            className="rounded-md text-gray-400 transition hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close material modal"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 p-6"
          aria-busy={isSubmitting}
        >
          <p id="material-modal-description" className="sr-only">
            {isEditMode
              ? 'Update the material details, source, and download settings.'
              : 'Upload a new material file or external resource for this course.'}
          </p>

          <div>
            <label
              htmlFor="material-title"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Material Title *
            </label>

            <input
              id="material-title"
              ref={(node) => {
                titleRegisterRef(node);
                titleInputRef.current = node;
              }}
              type="text"
              {...titleField}
              className="input"
              placeholder="e.g., Lecture Notes, Slides, Homework"
              aria-invalid={errors.title ? 'true' : 'false'}
              aria-describedby={errors.title ? 'material-title-error' : undefined}
              disabled={isSubmitting}
            />

            {errors.title && (
              <p
                id="material-title-error"
                className="mt-1 text-sm text-red-600"
                role="alert"
              >
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="material-description"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Description
            </label>

            <textarea
              id="material-description"
              {...register('description')}
              rows={3}
              className="input"
              placeholder="Describe what this material contains"
              disabled={isSubmitting}
            />
          </div>

          <MaterialSourceField
            materialType={materialType}
            materialFile={materialFile}
            materialLink={materialLink}
            onMaterialTypeChange={(nextType) => {
              setMaterialType(nextType);

              if (nextType === 'upload') {
                setMaterialLink('');
              } else {
                setMaterialFile(null);
              }
            }}
            onMaterialFileChange={setMaterialFile}
            onMaterialLinkChange={setMaterialLink}
          />

          <div className="flex items-center">
            <input
              id="is-downloadable"
              type="checkbox"
              {...register('isDownloadable')}
              className="mr-2"
              disabled={isSubmitting}
            />

            <label htmlFor="is-downloadable" className="text-sm text-gray-700">
              Allow students to download this material
            </label>
          </div>

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
                  <span className="spinner mr-2" aria-hidden="true" />
                  Saving...
                </>
              ) : isEditMode ? (
                'Update Material'
              ) : (
                'Upload Material'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialModal;

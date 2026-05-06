import { useEffect, useRef, useState, type FC } from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import clientLogger from '@/utils/logger';
import { extractErrorMessage } from '@/utils/error-handler';
import { useOverlayAccessibility } from '@/hooks';
import courseService from '@/services/course.service';
import type { LessonPackage } from '@/types';
import PackageFeaturesField from '@/features/course-editor/package-features-field';
import {
  buildPackageSavePayload,
  calculatePackageFinalPrice,
} from '@/features/course-editor/package-persistence';
import type { PackageFormData } from '@/features/course-editor/types';

interface PackageModalProps {
  courseId: string;
  packageId?: string;
  initialPackage?: LessonPackage;
  onClose: () => void;
  onSuccess: () => void;
}

const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
};

const toNumberOrZero = (value: unknown): number => {
  if (value === '' || value === null || value === undefined) {
    return 0;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const PackageModal: FC<PackageModalProps> = ({
  courseId,
  packageId,
  initialPackage,
  onClose,
  onSuccess,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const isEditMode = Boolean(packageId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PackageFormData>({
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      discount: 0,
      duration: 30,
      maxStudents: 100,
    },
  });

  const { ref: nameRegisterRef, ...nameField } = register('name', {
    required: 'Package name is required',
    validate: (value) =>
      value.trim().length > 0 || 'Package name cannot be empty',
  });

  useEffect(() => {
    if (!isEditMode || !initialPackage) {
      return;
    }

    setValue('name', initialPackage.name);
    setValue('description', initialPackage.description ?? '');
    setValue('price', initialPackage.price);
    setValue('discount', initialPackage.discount ?? 0);
    setValue('duration', initialPackage.duration ?? 30);
    setValue('maxStudents', initialPackage.maxStudents ?? 100);
    setFeatures(initialPackage.features ?? []);
  }, [isEditMode, initialPackage, setValue]);

  useOverlayAccessibility({
    isOpen: true,
    containerRef: modalRef,
    initialFocusRef: nameInputRef,
    onClose,
    trapFocus: true,
    lockBodyScroll: true,
  });

  const watchedPrice = watch('price');
  const watchedDiscount = watch('discount');

  const finalPrice = calculatePackageFinalPrice(
    toNumberOrZero(watchedPrice),
    toNumberOrZero(watchedDiscount)
  );

  const onSubmit = async (data: PackageFormData) => {
    if (isSubmitting) {
      return;
    }

    if (isEditMode && !packageId) {
      toast.error('Package ID is missing.');
      return;
    }

    setIsSubmitting(true);

    try {
      const packageData = buildPackageSavePayload(data, features);

      if (isEditMode && packageId) {
        await courseService.updatePackage(packageId, packageData);
        toast.success('Package updated successfully!');
      } else {
        await courseService.createPackage(courseId, packageData);
        toast.success('Package created successfully!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      clientLogger.error('Failed to save package:', error);
      toast.error(extractErrorMessage(error, 'Failed to save package'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="presentation"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-modal-title"
        aria-describedby="package-modal-description"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 id="package-modal-title" className="text-xl font-bold text-gray-900">
            {isEditMode ? 'Edit Package' : 'Create New Package'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md p-1 text-gray-400 transition hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Close package modal"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6" noValidate>
          <p id="package-modal-description" className="sr-only">
            {isEditMode
              ? 'Update the course package details, pricing, access settings, and included features.'
              : 'Create a course package with pricing, access settings, and included features.'}
          </p>

          <div>
            <label
              htmlFor="package-name"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Package Name *
            </label>
            <input
              id="package-name"
              ref={(node) => {
                nameRegisterRef(node);
                nameInputRef.current = node;
              }}
              type="text"
              {...nameField}
              className="input"
              placeholder="e.g., Basic, Premium, Ultimate"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'package-name-error' : undefined}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p id="package-name-error" className="mt-1 text-sm text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="package-description"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="package-description"
              {...register('description')}
              rows={3}
              className="input"
              placeholder="Describe what is included in this package"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="package-price"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Price ($) *
              </label>
              <input
                id="package-price"
                type="number"
                step="0.01"
                min="0"
                {...register('price', {
                  required: 'Price is required',
                  setValueAs: toNumberOrUndefined,
                  min: {
                    value: 0,
                    message: 'Price cannot be negative',
                  },
                  validate: (value) =>
                    value !== undefined || 'Price is required',
                })}
                className="input"
                placeholder="99.99"
                aria-invalid={Boolean(errors.price)}
                aria-describedby={errors.price ? 'package-price-error' : undefined}
                disabled={isSubmitting}
              />
              {errors.price && (
                <p id="package-price-error" className="mt-1 text-sm text-red-600">
                  {errors.price.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="package-discount"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Discount ($)
              </label>
              <input
                id="package-discount"
                type="number"
                step="0.01"
                min="0"
                {...register('discount', {
                  setValueAs: toNumberOrZero,
                  min: {
                    value: 0,
                    message: 'Discount cannot be negative',
                  },
                  validate: (value) => {
                    const discountValue = toNumberOrZero(value);
                    const priceValue = toNumberOrZero(watchedPrice);

                    return (
                      discountValue <= priceValue || 'Discount cannot exceed price'
                    );
                  },
                })}
                className="input"
                placeholder="10.00"
                aria-invalid={Boolean(errors.discount)}
                aria-describedby={
                  errors.discount ? 'package-discount-error' : undefined
                }
                disabled={isSubmitting}
              />
              {errors.discount && (
                <p id="package-discount-error" className="mt-1 text-sm text-red-600">
                  {errors.discount.message}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Final Price:</span>
              <span className="text-2xl font-bold text-primary-600">
                ${finalPrice.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="package-duration"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Access Duration (days)
              </label>
              <input
                id="package-duration"
                type="number"
                min="0"
                {...register('duration', {
                  setValueAs: toNumberOrZero,
                  min: {
                    value: 0,
                    message: 'Duration cannot be negative',
                  },
                })}
                className="input"
                placeholder="30"
                aria-invalid={Boolean(errors.duration)}
                aria-describedby={
                  errors.duration
                    ? 'package-duration-error'
                    : 'package-duration-help'
                }
                disabled={isSubmitting}
              />
              <p id="package-duration-help" className="mt-1 text-xs text-gray-500">
                Leave blank or enter 0 for lifetime access.
              </p>
              {errors.duration && (
                <p id="package-duration-error" className="mt-1 text-sm text-red-600">
                  {errors.duration.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="package-max-students"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Max Students *
              </label>
              <input
                id="package-max-students"
                type="number"
                min="1"
                {...register('maxStudents', {
                  required: 'Max students is required',
                  setValueAs: toNumberOrUndefined,
                  min: {
                    value: 1,
                    message: 'Max students must be at least 1',
                  },
                  validate: (value) =>
                    value !== undefined || 'Max students is required',
                })}
                className="input"
                placeholder="100"
                aria-invalid={Boolean(errors.maxStudents)}
                aria-describedby={
                  errors.maxStudents
                    ? 'package-max-students-error'
                    : 'package-max-students-help'
                }
                disabled={isSubmitting}
              />
              <p id="package-max-students-help" className="mt-1 text-xs text-gray-500">
                This limit is mainly used for live or hybrid sessions.
              </p>
              {errors.maxStudents && (
                <p
                  id="package-max-students-error"
                  className="mt-1 text-sm text-red-600"
                >
                  {errors.maxStudents.message}
                </p>
              )}
            </div>
          </div>

          <PackageFeaturesField features={features} onChange={setFeatures} />

          <div className="flex items-center justify-end space-x-4 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
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
                'Update Package'
              ) : (
                'Create Package'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PackageModal;

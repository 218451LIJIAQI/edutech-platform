/**
 * Toast notification utilities
 * Enhanced toast management with queue and promise support
 */

import toast, { Toast } from 'react-hot-toast';

// Toast duration constants
const DURATION = {
  SHORT: 2000,
  NORMAL: 3000,
  LONG: 4000,
  PERSISTENT: Infinity,
} as const;

/**
 * Success toast with consistent styling
 */
export const success = (message: string, options?: Partial<Toast>) => {
  return toast.success(message, {
    duration: DURATION.NORMAL,
    ...options,
  });
};

/**
 * Error toast with longer duration
 */
export const error = (message: string, options?: Partial<Toast>) => {
  return toast.error(message, {
    duration: DURATION.LONG,
    ...options,
  });
};

/**
 * Info toast (neutral styling)
 */
export const info = (message: string, options?: Partial<Toast>) => {
  return toast(message, {
    duration: DURATION.NORMAL,
    icon: 'ℹ️',
    ...options,
  });
};

/**
 * Warning toast
 */
export const warning = (message: string, options?: Partial<Toast>) => {
  return toast(message, {
    duration: DURATION.LONG,
    icon: '⚠️',
    style: {
      background: '#fef3c7',
      color: '#92400e',
      border: '1px solid #f59e0b',
    },
    ...options,
  });
};

/**
 * Loading toast that can be updated
 * @returns Toast ID to update later
 * 
 * @example
 * const toastId = showLoading('Uploading...');
 * // Later:
 * updateLoading(toastId, { success: 'Upload complete!' });
 */
export const loading = (message: string, options?: Partial<Toast>) => {
  return toast.loading(message, {
    ...options,
  });
};

/**
 * Update a loading toast
 */
export const updateLoading = (
  toastId: string,
  update: { success?: string; error?: string; loading?: string }
) => {
  if (update.success) {
    toast.success(update.success, { id: toastId });
  } else if (update.error) {
    toast.error(update.error, { id: toastId });
  } else if (update.loading) {
    toast.loading(update.loading, { id: toastId });
  }
};

/**
 * Dismiss a specific toast or all toasts
 */
export const dismiss = (toastId?: string) => {
  if (toastId) {
    toast.dismiss(toastId);
  } else {
    toast.dismiss();
  }
};

/**
 * Promise toast - shows loading, success, and error states
 * 
 * @example
 * await promiseToast(
 *   uploadFile(file),
 *   {
 *     loading: 'Uploading file...',
 *     success: 'File uploaded successfully!',
 *     error: 'Failed to upload file',
 *   }
 * );
 */
export const promiseToast = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: Error) => string);
  },
  options?: Partial<Toast>
): Promise<T> => {
  return toast.promise(promise, messages, options);
};

/**
 * Confirmation toast with action button
 * 
 * @example
 * confirm('Delete this item?', {
 *   onConfirm: () => deleteItem(id),
 *   confirmText: 'Delete',
 * });
 */
export const confirm = (
  message: string,
  options: {
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }
) => {
  return toast(
    (t) => (
      `<div class="flex flex-col gap-3">
        <p class="text-sm text-gray-700">${message}</p>
        <div class="flex gap-2 justify-end">
          <button 
            class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            onclick="window.__toastCancel__('${t.id}')"
          >
            ${options.cancelText || 'Cancel'}
          </button>
          <button 
            class="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            onclick="window.__toastConfirm__('${t.id}')"
          >
            ${options.confirmText || 'Confirm'}
          </button>
        </div>
      </div>`
    ),
    {
      duration: DURATION.PERSISTENT,
    }
  );
};

/**
 * Custom toast with JSX content
 */
export const custom = toast;

// Export everything as default object
export default {
  success,
  error,
  info,
  warning,
  loading,
  updateLoading,
  dismiss,
  promise: promiseToast,
  confirm,
  custom,
  DURATION,
};

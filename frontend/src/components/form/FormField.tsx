import { ReactNode } from 'react';
import clsx from 'clsx';

interface FormFieldProps {
  /** Field label */
  label?: string;
  /** HTML for attribute to link label with input */
  htmlFor?: string;
  /** Error message to display */
  error?: string;
  /** Helper text below the input */
  helperText?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional className for the wrapper */
  className?: string;
  /** Children (input element) */
  children: ReactNode;
}

/**
 * FormField Component
 * Wrapper component that provides consistent styling for form fields
 * Includes label, error message, helper text, and required indicator
 * 
 * @example
 * <FormField 
 *   label="Email Address" 
 *   htmlFor="email" 
 *   error={errors.email}
 *   required
 * >
 *   <Input id="email" type="email" {...register('email')} />
 * </FormField>
 */
const FormField = ({
  label,
  htmlFor,
  error,
  helperText,
  required = false,
  disabled = false,
  className,
  children,
}: FormFieldProps) => {
  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className={clsx(
            'block text-sm font-semibold',
            disabled ? 'text-gray-400' : 'text-gray-700',
            error && 'text-danger-600'
          )}
        >
          {label}
          {required && (
            <span className="text-danger-500 ml-1" aria-hidden="true">*</span>
          )}
        </label>
      )}
      
      {children}
      
      {/* Error message */}
      {error && (
        <p className="text-sm text-danger-600 flex items-center gap-1.5 animate-fadeIn" role="alert">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {/* Helper text (only show if no error) */}
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default FormField;

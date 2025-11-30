import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { Check } from 'lucide-react';
import clsx from 'clsx';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Label text */
  label?: ReactNode;
  /** Description text below label */
  description?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Error state */
  error?: boolean;
  /** Indeterminate state */
  indeterminate?: boolean;
}

/**
 * Checkbox Component
 * Custom styled checkbox with label support
 * 
 * @example
 * // Basic checkbox
 * <Checkbox label="Accept terms and conditions" />
 * 
 * // With description
 * <Checkbox 
 *   label="Email notifications"
 *   description="Receive email updates about your account"
 * />
 */
const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      size = 'md',
      error = false,
      indeterminate = false,
      className,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: { box: 'w-4 h-4', icon: 'w-3 h-3', text: 'text-sm', gap: 'gap-2' },
      md: { box: 'w-5 h-5', icon: 'w-3.5 h-3.5', text: 'text-base', gap: 'gap-3' },
      lg: { box: 'w-6 h-6', icon: 'w-4 h-4', text: 'text-lg', gap: 'gap-3' },
    };

    const sizes = sizeClasses[size];

    return (
      <label
        className={clsx(
          'relative flex items-start cursor-pointer select-none',
          sizes.gap,
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          disabled={disabled}
          checked={checked}
          className="sr-only peer"
          {...props}
        />
        
        {/* Custom checkbox box */}
        <span
          className={clsx(
            'flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all duration-200',
            sizes.box,
            // Unchecked state
            !checked && !indeterminate && [
              'border-gray-300 bg-white',
              'peer-hover:border-primary-400 peer-hover:bg-primary-50',
              'peer-focus:ring-4 peer-focus:ring-primary-500/20',
            ],
            // Checked state
            (checked || indeterminate) && [
              'border-primary-600 bg-primary-600',
              'peer-hover:border-primary-700 peer-hover:bg-primary-700',
            ],
            // Error state
            error && !checked && 'border-danger-400 peer-hover:border-danger-500',
            error && checked && 'border-danger-600 bg-danger-600',
          )}
        >
          {checked && (
            <Check className={clsx(sizes.icon, 'text-white')} strokeWidth={3} />
          )}
          {indeterminate && !checked && (
            <span className={clsx('bg-white rounded-sm', size === 'sm' ? 'w-2 h-0.5' : 'w-2.5 h-0.5')} />
          )}
        </span>

        {/* Label and description */}
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className={clsx(
                sizes.text,
                'font-medium text-gray-900 leading-tight',
                disabled && 'text-gray-500'
              )}>
                {label}
              </span>
            )}
            {description && (
              <span className="text-sm text-gray-500 mt-0.5">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
